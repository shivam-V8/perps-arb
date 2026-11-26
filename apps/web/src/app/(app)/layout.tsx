import Link from "next/link";
import { redirect } from "next/navigation";
import { DesktopNav, MobileNav } from "@/components/app/app-nav";
import { SetupNotice } from "@/components/app/setup-notice";
import { Logo } from "@/components/brand/logo";
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
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo href={viewer.role === "candidate" ? "/jobs" : "/roles"} />
          <DesktopNav role={viewer.role} badges={badges} />
          <div className="flex items-center gap-2.5">
            {ent.plan === "pro" ? (
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">Pro</span>
            ) : (
              <span className="hidden rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-muted-foreground sm:inline">
                {viewer.role === "candidate" ? "Job seeker" : "Recruiter"}
              </span>
            )}
            {!ent.email && (
              <Link href="/signin" className="text-sm text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
            )}
            <Link href="/profile" aria-label="Your profile">
              <AvatarMark name={viewer.fullName || (viewer.role === "candidate" ? "You" : "Recruiter")} tone="slate" size="sm" />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-24 md:pb-10">{children}</main>
      <MobileNav role={viewer.role} badges={badges} />
    </div>
  );
}
