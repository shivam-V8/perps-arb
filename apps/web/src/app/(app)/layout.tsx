import Link from "next/link";
import { redirect } from "next/navigation";
import { DesktopNav, MobileNav } from "@/components/app/app-nav";
import { SetupNotice } from "@/components/app/setup-notice";
import { Wordmark } from "@/components/site/pill-nav";
import { AvatarMark } from "@/components/profile/avatar-mark";
import { dbConfigured } from "@/db";
import { getEntitlement } from "@/server/data";
import { currentViewer } from "@/server/session";

// per-user pages: never prerender or cache
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!dbConfigured()) return <SetupNotice />;
  const viewer = await currentViewer();
  if (!viewer?.role) redirect("/onboarding");

  const badges: Record<string, number> = {};
  const ent = await getEntitlement(viewer.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 px-3 pt-3">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full bg-ink/95 pr-2 pl-5 text-white shadow-[0_12px_40px_-14px_rgb(0_0_0/0.45)] ring-1 ring-white/10 backdrop-blur">
          <Link href={viewer.role === "candidate" ? "/jobs" : "/roles"} aria-label="ChainMatch">
            <Wordmark />
          </Link>
          <DesktopNav role={viewer.role} badges={badges} />
          <div className="flex items-center gap-2.5">
            {ent.plan === "pro" ? (
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">Pro</span>
            ) : (
              <span className="hidden rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-white/60 sm:inline">
                {viewer.role === "candidate" ? "Job seeker" : "Recruiter"}
              </span>
            )}
            {!ent.email && (
              <Link href="/signin" className="text-sm text-white/60 hover:text-white">
                Sign in
              </Link>
            )}
            <Link href="/profile" aria-label="Your profile">
              <AvatarMark name={viewer.fullName || (viewer.role === "candidate" ? "You" : "Recruiter")} tone="mint" size="sm" />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-24 md:pb-10">{children}</main>
      <MobileNav role={viewer.role} badges={badges} />
    </div>
  );
}
