import "server-only";
import { draftCoverNote } from "@/lib/ai/cover-note";
import { type Fix, profileKey, reviewResume } from "@/lib/ai/resume-review";
import { esc, layout, sendEmail } from "@/lib/email";
import { purposeToken } from "@/lib/session-token";
import type { CandidateProfile, JobPosting } from "@/lib/types";
import * as data from "@/server/data";
import { runJobSearch } from "@/server/job-search";

/** Jobs per email, and how many of them get a drafted cover note. */
const JOBS_PER_DIGEST = 5;
const NOTES_PER_DIGEST = 3;

export interface DigestContent {
  jobs: { job: JobPosting; note: string | null }[];
  fixes: Fix[];
}

/** Picks the best new (never emailed) jobs; pure, for tests. */
export function pickDigestJobs(jobs: JobPosting[], unsent: Set<string>, n = JOBS_PER_DIGEST): JobPosting[] {
  return jobs
    .filter((j) => !j.locked && j.url && unsent.has(j.url))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

export function renderDigest(name: string, content: DigestContent, links: { site: string; unsubscribe: string }) {
  const first = name.split(" ")[0] || "there";
  const jobsHtml = content.jobs
    .map(
      ({ job, note }) => `<div style="border-top:1px solid #ececea;padding:16px 0">
<p style="margin:0;font-weight:600;font-size:16px">${esc(job.title)}</p>
<p style="margin:2px 0 8px;color:#6b7079;font-size:14px">${esc(job.company)} · ${esc(job.location || "Location not listed")} · ${job.score}% fit</p>
${job.reasons.length ? `<ul style="margin:0 0 10px;padding-left:18px;font-size:14px;line-height:1.5">${job.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
<p style="margin:0 0 10px"><a href="${esc(job.url)}" style="color:#059669;font-weight:600">View and apply →</a></p>
${note ? `<details open><summary style="font-size:13px;color:#6b7079;cursor:pointer">Your cover note</summary><p style="white-space:pre-wrap;font-size:14px;line-height:1.55;background:#f6f6f4;border-radius:10px;padding:12px;margin:8px 0 0">${esc(note)}</p></details>` : ""}
</div>`,
    )
    .join("");
  const fixesHtml = content.fixes.length
    ? `<h2 style="font-size:16px;margin:22px 0 8px">Fixes for your résumé</h2>${content.fixes
        .slice(0, 3)
        .map(
          (f) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.5"><b>${esc(f.section)}:</b> ${esc(f.fix)}${f.example ? `<br><span style="color:#6b7079">e.g. “${esc(f.example)}”</span>` : ""}</p>`,
        )
        .join("")}`
    : "";
  const html = layout(
    `${content.jobs.length} new jobs for you, ${first}`,
    `<p style="margin:0 0 6px;line-height:1.5">Fresh openings that match your profile, each with a cover note you can edit and send.</p>${jobsHtml}${fixesHtml}
<p style="margin:20px 0 0"><a href="${esc(links.site)}/jobs" style="display:inline-block;background:#16181d;color:#fff;text-decoration:none;padding:11px 18px;border-radius:999px;font-weight:600">See all your matches</a></p>`,
    `You get this weekly as a ChainMatch Pro member. <a href="${esc(links.unsubscribe)}" style="color:#8a8f98">Stop these emails</a>`,
  );
  const text = [
    `${content.jobs.length} new jobs for you, ${first}`,
    "",
    ...content.jobs.flatMap(({ job, note }) => [
      `${job.title} — ${job.company} (${job.location || "location n/a"}) · ${job.score}% fit`,
      ...job.reasons.map((r) => `  • ${r}`),
      `  Apply: ${job.url}`,
      ...(note ? ["", "  Cover note:", ...note.split("\n").map((l) => `  ${l}`)] : []),
      "",
    ]),
    ...(content.fixes.length ? ["Fixes for your résumé:", ...content.fixes.slice(0, 3).map((f) => `  • ${f.section}: ${f.fix}`), ""] : []),
    `All matches: ${links.site}/jobs`,
    `Stop these emails: ${links.unsubscribe}`,
  ].join("\n");
  return { html, text };
}

/** Builds and sends one user's weekly digest. Returns what happened, for the cron log. */
export async function sendDigest(user: { id: string; email: string }, site: string): Promise<"sent" | "no_new_jobs" | "no_profile" | "search_failed" | "email_failed"> {
  const cand: CandidateProfile | null = await data.getOwnCandidate(user.id);
  if (!cand) return "no_profile";

  const summary = await runJobSearch(user.id, cand);
  if (!summary) return "search_failed";

  const jobs = await data.listJobs(user.id, "unreviewed");
  const unsent = await data.unsentUrls(user.id, jobs.map((j) => j.url).filter(Boolean));
  const picked = pickDigestJobs(jobs, unsent);
  if (picked.length === 0) {
    await data.markDigestSent(user.id, []); // try again next week
    return "no_new_jobs";
  }

  const notes = await Promise.all(picked.map((j, i) => (i < NOTES_PER_DIGEST ? draftCoverNote(j, cand) : Promise.resolve(null))));

  const key = profileKey(cand);
  const cached = await data.getResumeReview(user.id);
  let fixes = cached?.profileKey === key ? cached.fixes : null;
  if (!fixes) {
    fixes = await reviewResume(cand, jobs.map((j) => j.title));
    if (fixes) await data.saveResumeReview(user.id, key, fixes);
  }

  const unsubscribe = `${site}/api/digest/unsubscribe?t=${encodeURIComponent(await purposeToken("unsubscribe", user.id))}`;
  const { html, text } = renderDigest(cand.full_name, { jobs: picked.map((job, i) => ({ job, note: notes[i] })), fixes: fixes ?? [] }, { site, unsubscribe });
  const ok = await sendEmail({
    to: user.email,
    subject: `${picked.length} new jobs for you this week`,
    html,
    text,
    headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  });
  if (!ok) return "email_failed";
  await data.markDigestSent(user.id, picked.map((j) => j.url));
  return "sent";
}
