import { NextResponse } from "next/server";
import { aiEnabled } from "@/lib/ai/claude";
import { cleanReport, searchJobs } from "@/lib/ai/job-search";
import { fetchBoards } from "@/lib/jobs/ats";
import { discoverBoards, mergeJobs, rankFeedPostings, reconcile, type BoardWithCompany } from "@/lib/jobs/pipeline";
import { boardsForCompanies, getOwnCandidate, QUOTAS, rememberBoards, replaceJobResults, takeQuota } from "@/server/data";
import { currentViewer } from "@/server/session";

export const maxDuration = 300;

/**
 * Fresh job search for the current candidate:
 * 1. Claude web search → postings + companies
 * 2. company ATS feeds (Greenhouse, Lever, Ashby, Workable, SmartRecruiters) → confirm which are still open, drop closed ones
 * 3. rank extra live postings from those boards
 */
export async function POST() {
  const viewer = await currentViewer();
  if (viewer?.role !== "candidate") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!aiEnabled()) return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });

  const candidate = await getOwnCandidate(viewer.id);
  if (!candidate) return NextResponse.json({ error: "Add your résumé first." }, { status: 400 });

  const { limit, windowMins } = QUOTAS.jobSearch;
  if (!(await takeQuota(viewer.id, "jobSearch", limit, windowMins))) {
    return NextResponse.json({ error: "You've run a lot of searches this hour. Try again a bit later." }, { status: 429 });
  }

  const raw = await searchJobs(candidate);
  if (!raw) return NextResponse.json({ error: "The search didn't finish. Try again in a minute." }, { status: 502 });
  const report = cleanReport(raw);

  const cached = (await boardsForCompanies([...report.companies.map((c) => c.name), ...report.jobs.map((j) => j.company)])) as BoardWithCompany[];
  const boards = discoverBoards(report, cached);
  const feeds = await fetchBoards(boards);
  await rememberBoards(
    feeds.map((f) => ({ ats: f.board.ats, token: f.board.token, company: f.board.company, ok: Boolean(f.postings), error: f.error })),
  );

  const { kept, dropped, pool } = reconcile(report.jobs, feeds);
  const fromFeeds = await rankFeedPostings(pool, candidate);
  const jobs = mergeJobs(kept, fromFeeds);

  await replaceJobResults(viewer.id, jobs, report.companies);
  return NextResponse.json({
    found: jobs.length,
    verified: jobs.filter((j) => j.verified).length,
    closedDropped: dropped,
    boards: feeds.filter((f) => f.postings).length,
    companies: report.companies.length,
  });
}
