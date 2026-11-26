import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/app/setup-notice";
import Link from "next/link";
import { Wordmark } from "@/components/site/pill-nav";
import { ResumeIntake } from "@/components/candidate/resume-intake";
import { dbConfigured } from "@/db";
import { getOwnCandidate, setRole } from "@/server/data";
import { currentViewer } from "@/server/session";

// per-user page: never prerender or cache
export const dynamic = "force-dynamic";
export const metadata = { title: "Get started" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ redo?: string }> }) {
  if (!dbConfigured()) return <SetupNotice />;
  const viewer = await currentViewer();
  const { redo } = await searchParams;

  if (viewer?.role === "recruiter") redirect("/roles/new");
  // Job seekers only for now: a new visitor becomes a candidate straight away.
  if (viewer && !viewer.role) await setRole(viewer.id, "candidate");
  if (viewer?.role === "candidate" && !redo && (await getOwnCandidate(viewer.id))) redirect("/jobs");

  return (
    <div className="bg-hero-paper min-h-dvh">
      <header className="mx-auto flex h-16 max-w-3xl items-center px-4 pt-4">
        <Link href="/" aria-label="ChainMatch home" className="rounded-full bg-ink px-4 py-2">
          <Wordmark />
        </Link>
      </header>
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-24">
        <h1 className="poster text-5xl sm:text-7xl">Add your <span className="text-brand">profile.</span></h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          The first link in your chain. Paste your LinkedIn URL or upload a résumé; we turn it into a profile you can edit, then
          trace it to open jobs on the web and on companies&apos; own job boards. No account needed.
        </p>
        <div className="mt-8">
          <ResumeIntake />
        </div>
      </div>
    </div>
  );
}
