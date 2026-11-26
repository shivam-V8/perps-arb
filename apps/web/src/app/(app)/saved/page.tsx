import { redirect } from "next/navigation";
import { SavedJobs } from "@/components/candidate/saved-jobs";
import { listJobs } from "@/server/data";
import { currentViewer } from "@/server/session";

export const metadata = { title: "Saved jobs" };

export default async function SavedPage() {
  const viewer = await currentViewer();
  if (viewer?.role !== "candidate") redirect("/roles");
  const jobs = await listJobs(viewer.id, "saved");
  return (
    <div className="mx-auto w-full max-w-3xl pt-6 md:pt-10">
      <h1 className="poster text-5xl sm:text-6xl">Saved jobs</h1>
      <p className="mt-1 text-sm text-muted-foreground">Apply on the company&apos;s site. Draft a cover note first if you like.</p>
      <SavedJobs jobs={jobs} />
    </div>
  );
}
