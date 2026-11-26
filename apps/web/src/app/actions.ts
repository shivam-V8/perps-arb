"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CandidateDraftSchema, RoleDraftSchema } from "@/lib/ai/schemas";
import { normalizeLinkedInProfile } from "@/lib/linkedin-url";
import { SESSION_COOKIE } from "@/lib/session-token";
import type { Decision, Role } from "@/lib/types";
import * as data from "@/server/data";
import { currentViewer, requireViewer } from "@/server/session";

export async function chooseRole(role: Role) {
  const v = await currentViewer();
  if (!v) throw new Error("No session");
  await data.setRole(v.id, role);
  redirect(role === "candidate" ? "/onboarding" : "/roles/new");
}

const CandidateInput = CandidateDraftSchema.extend({
  email: z.string(),
  visible_to_recruiters: z.boolean(),
  linkedin_url: z.string().nullable().optional(),
});

export async function saveCandidate(input: z.infer<typeof CandidateInput>) {
  const v = await requireViewer("candidate");
  const c = CandidateInput.parse(input);
  const clip = (s: string, n: number) => s.trim().slice(0, n);
  await data.upsertCandidate(v.id, {
    full_name: clip(c.full_name, 120),
    email: clip(c.email, 200),
    headline: clip(c.headline, 120),
    summary: clip(c.summary, 800),
    fields: [...new Set(c.fields)].slice(0, 3),
    skills: c.skills.map((x) => clip(x, 60)).filter(Boolean).slice(0, 25),
    experience: c.experience.slice(0, 8).map((e) => ({
      title: clip(e.title, 120),
      company: clip(e.company, 120),
      start: clip(e.start, 20),
      end: clip(e.end, 20),
      highlights: e.highlights.map((h) => clip(h, 200)).slice(0, 4),
    })),
    education: c.education.map((x) => clip(x, 160)).slice(0, 6),
    location: clip(c.location, 120),
    remote_pref: c.remote_pref,
    seniority: c.seniority,
    salary_min: c.salary_min && c.salary_min > 0 ? Math.round(c.salary_min) : null,
    salary_currency: clip(c.salary_currency || "USD", 3).toUpperCase(),
    visible_to_recruiters: c.visible_to_recruiters,
    ...(c.linkedin_url !== undefined ? { linkedin_url: c.linkedin_url ? (normalizeLinkedInProfile(c.linkedin_url)?.url ?? null) : null } : {}),
  });
  revalidatePath("/jobs");
  revalidatePath("/profile");
}

export async function setVisibility(visible: boolean) {
  const v = await requireViewer("candidate");
  await data.setVisibility(v.id, visible);
  revalidatePath("/profile");
}

export async function decideJob(jobId: string, decision: Decision | null) {
  const v = await requireViewer("candidate");
  const ok = await data.decideJob(v.id, jobId, decision);
  revalidatePath("/saved");
  return { ok };
}

export async function setDigest(on: boolean) {
  const v = await requireViewer("candidate");
  await data.setDigestEnabled(v.id, on);
  revalidatePath("/profile");
}

export async function saveRole(input: z.infer<typeof RoleDraftSchema>) {
  const v = await requireViewer("recruiter");
  const r = RoleDraftSchema.parse(input);
  const id = await data.createRole(v.id, {
    title: r.title.slice(0, 140),
    company: r.company.slice(0, 120),
    description: r.description.slice(0, 1200),
    fields: [...new Set(r.fields)].slice(0, 3),
    must_have: r.must_have.slice(0, 10),
    nice_to_have: r.nice_to_have.slice(0, 8),
    location: r.location.slice(0, 120),
    remote: r.remote,
    seniority: r.seniority,
    salary_min: r.salary_min,
    salary_max: r.salary_max,
  });
  redirect(`/roles/${id}`);
}

export async function decideCandidate(roleId: string, candidateId: string, decision: Decision) {
  const v = await requireViewer("recruiter");
  await data.swipeCandidate(v.id, roleId, candidateId, decision);
  revalidatePath("/roles");
}

export async function respondInvite(matchId: string, accept: boolean) {
  const v = await requireViewer("candidate");
  await data.respondInvite(v.id, matchId, accept);
  revalidatePath("/invites");
  revalidatePath("/matches");
  if (accept) redirect(`/matches/${matchId}`);
}

/** No accounts yet: "starting over" drops this browser's identity; the old data stays tied to the old id. */
export async function startOver() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
