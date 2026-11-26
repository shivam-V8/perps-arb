import "server-only";
import { cleanReport, searchJobs } from "@/lib/ai/job-search";
import { fetchBoards } from "@/lib/jobs/ats";
import { discoverBoards, mergeJobs, rankFeedPostings, reconcile, type BoardWithCompany } from "@/lib/jobs/pipeline";
import type { CandidateProfile } from "@/lib/types";
import { boardsForCompanies, rememberBoards, replaceJobResults } from "@/server/data";

export interface SearchSummary {
  found: number;
  verified: number;
  closedDropped: number;
  boards: number;
  companies: number;
}

/**
 * Fresh job search for a candidate, saved as their new results:
 * 1. web search → postings + companies
 * 2. company ATS feeds (Greenhouse, Lever, Ashby, Workable, SmartRecruiters) → confirm which are still open, drop closed ones
 * 3. rank extra live postings from those boards
 * Returns null if the web search didn't finish.
 */
export async function runJobSearch(uid: string, candidate: CandidateProfile): Promise<SearchSummary | null> {
  const raw = await searchJobs(candidate);
  if (!raw) return null;
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

  await replaceJobResults(uid, jobs, report.companies);
  return {
    found: jobs.length,
    verified: jobs.filter((j) => j.verified).length,
    closedDropped: dropped,
    boards: feeds.filter((f) => f.postings).length,
    companies: report.companies.length,
  };
}
