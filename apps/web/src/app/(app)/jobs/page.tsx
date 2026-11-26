import { redirect } from "next/navigation";
import { JobsBoard } from "@/components/candidate/jobs-board";
import { billingEnabled } from "@/lib/billing/stripe";
import { countJobs, getEntitlement, getOwnCandidate, listCompanies, listJobs } from "@/server/data";
import { currentViewer } from "@/server/session";

export const metadata = { title: "Jobs" };

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ search?: string; paid?: string }> }) {
  const viewer = await currentViewer();
  if (viewer?.role !== "candidate") redirect("/roles");
  const candidate = await getOwnCandidate(viewer.id);
  if (!candidate) redirect("/onboarding");

  const [jobs, companies, total, entitlement] = await Promise.all([
    listJobs(viewer.id, "unreviewed"),
    listCompanies(viewer.id),
    countJobs(viewer.id),
    getEntitlement(viewer.id),
  ]);
  const { search, paid } = await searchParams;

  return (
    <JobsBoard
      headline={candidate.headline}
      initialJobs={jobs}
      companies={companies}
      autoSearch={search === "1" || total === 0}
      entitlement={entitlement}
      billingOpen={billingEnabled()}
      paid={paid}
    />
  );
}
