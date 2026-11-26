import { NextResponse } from "next/server";
import { aiEnabled } from "@/lib/ai/claude";
import { profileKey, reviewResume } from "@/lib/ai/resume-review";
import { getOwnCandidate, getResumeReview, hasFullAccess, listJobs, refundQuota, saveResumeReview, takeQuota } from "@/server/data";
import { currentViewer } from "@/server/session";

/** Free plan sees this many fixes; Pro sees all. */
const FREE_FIXES = 1;

/** Résumé fixes for the viewer: cached until their profile changes. */
export async function POST() {
  const viewer = await currentViewer();
  if (viewer?.role !== "candidate") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const cand = await getOwnCandidate(viewer.id);
  if (!cand) return NextResponse.json({ error: "Add your résumé first." }, { status: 400 });

  const key = profileKey(cand);
  const cached = await getResumeReview(viewer.id);
  let fixes = cached?.profileKey === key ? cached.fixes : null;
  if (!fixes) {
    if (!aiEnabled()) return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });
    if (!(await takeQuota(viewer.id, "resumeReview", 6, 24 * 60))) {
      return NextResponse.json({ error: "You've refreshed your review a lot today. Try again tomorrow." }, { status: 429 });
    }
    const titles = (await listJobs(viewer.id, "unreviewed")).map((j) => j.title);
    fixes = await reviewResume(cand, titles);
    if (!fixes) {
      await refundQuota(viewer.id, "resumeReview");
      return NextResponse.json({ error: "Couldn't review your résumé right now." }, { status: 502 });
    }
    await saveResumeReview(viewer.id, key, fixes);
  }

  const pro = await hasFullAccess(viewer.id);
  return NextResponse.json({ fixes: pro ? fixes : fixes.slice(0, FREE_FIXES), locked: pro ? 0 : Math.max(0, fixes.length - FREE_FIXES) });
}
