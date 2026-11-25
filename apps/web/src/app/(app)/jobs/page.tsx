import { redirect } from "next/navigation";
import { JobsBoard } from "@/components/candidate/jobs-board";
import { countJobs, getOwnCandidate, listCompanies, listJobs } from "@/server/data";
import { currentViewer } from "@/server/session";

export const metadata = { title: "Jobs" };

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const viewer = await currentViewer();
  if (viewer?.role !== "candidate") redirect("/roles");
  const candidate = await getOwnCandidate(viewer.id);
  if (!candidate) redirect("/onboarding");

  const [jobs, companies, total] = await Promise.all([listJobs(viewer.id, "unreviewed"), listCompanies(viewer.id), countJobs(viewer.id)]);
  const { search } = await searchParams;

  return <JobsBoard headline={candidate.headline} initialJobs={jobs} companies={companies} autoSearch={search === "1" || total === 0} />;
}
