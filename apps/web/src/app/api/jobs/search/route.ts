import { NextResponse } from "next/server";
import { aiEnabled } from "@/lib/ai/claude";
import { getOwnCandidate, hasFullAccess, QUOTAS, quotaRetryAfterMins, refundQuota, takeQuota } from "@/server/data";
import { runJobSearch } from "@/server/job-search";
import { currentViewer } from "@/server/session";

export const maxDuration = 300;

/** Fresh job search for the current candidate (see runJobSearch). Free plan: a few searches a week. */
export async function POST() {
  const viewer = await currentViewer();
  if (viewer?.role !== "candidate") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!aiEnabled()) return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });

  const candidate = await getOwnCandidate(viewer.id);
  if (!candidate) return NextResponse.json({ error: "Add your résumé first." }, { status: 400 });

  const pro = await hasFullAccess(viewer.id);
  if (!pro) {
    const { limit, windowMins } = QUOTAS.jobSearchFree;
    if (!(await takeQuota(viewer.id, "jobSearchFree", limit, windowMins))) {
      const mins = await quotaRetryAfterMins(viewer.id, "jobSearchFree", windowMins);
      const days = Math.max(1, Math.ceil(mins / (60 * 24)));
      return NextResponse.json(
        { error: `You've used this week's ${limit} free searches. Next one in ${days} day${days === 1 ? "" : "s"}, or go Pro for daily searches.`, paywall: true },
        { status: 402 },
      );
    }
  }
  const { limit, windowMins } = QUOTAS.jobSearch;
  if (!(await takeQuota(viewer.id, "jobSearch", limit, windowMins))) {
    if (!pro) await refundQuota(viewer.id, "jobSearchFree");
    return NextResponse.json({ error: "You've run a lot of searches this hour. Try again a bit later." }, { status: 429 });
  }

  const summary = await runJobSearch(viewer.id, candidate);
  if (!summary) {
    // our failure: don't charge it against their allowance
    await refundQuota(viewer.id, "jobSearch");
    if (!pro) await refundQuota(viewer.id, "jobSearchFree");
    return NextResponse.json({ error: "The search didn't finish. Try again in a minute." }, { status: 502 });
  }
  return NextResponse.json(summary);
}
