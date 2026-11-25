import { FileUp, RotateCcw } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { startOver } from "@/app/actions";
import { CandidateForm, EMPTY_CANDIDATE } from "@/components/candidate/candidate-form";
import { Button } from "@/components/ui/button";
import { getOwnCandidate } from "@/server/data";
import { currentViewer } from "@/server/session";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const viewer = await currentViewer();
  if (!viewer?.role) redirect("/onboarding");
  const candidate = viewer.role === "candidate" ? await getOwnCandidate(viewer.id) : null;

  return (
    <div className="mx-auto w-full max-w-3xl pt-6 md:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {viewer.role === "candidate" ? "Job seeker" : "Recruiter"} · saved in this browser (no account yet)
          </p>
        </div>
        <div className="flex gap-2">
          {viewer.role === "candidate" && (
            <Button asChild variant="outline" size="sm" className="rounded-full border-black/10 bg-white">
              <Link href="/onboarding?redo=1">
                <FileUp /> Upload a new résumé
              </Link>
            </Button>
          )}
          {candidate?.resume_path && (
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <a href={`/api/resume/${viewer.id}`} target="_blank" rel="noopener noreferrer">
                View my résumé
              </a>
            </Button>
          )}
          <form action={startOver}>
            <Button variant="ghost" size="sm" className="rounded-full text-rose">
              <RotateCcw /> Start over
            </Button>
          </form>
        </div>
      </div>

      {viewer.role === "candidate" && (
        <div className="mt-8 rounded-3xl border border-black/[0.06] bg-white/60 p-5 sm:p-7">
          <CandidateForm initial={{ ...EMPTY_CANDIDATE, ...(candidate ?? {}) }} submitLabel="Save changes" />
        </div>
      )}
      {viewer.role === "recruiter" && (
        <p className="mt-8 text-muted-foreground">
          Manage your open positions from{" "}
          <Link href="/roles" className="font-medium text-foreground underline">
            Roles
          </Link>
          . “Start over” gives this browser a fresh identity (to try the job-seeker side, for example).
        </p>
      )}
    </div>
  );
}
