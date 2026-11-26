import Link from "next/link";
import { PillNav, Wordmark } from "@/components/site/pill-nav";

/** Footer shared by the landing page and the public pages. */
export function SiteFooter() {
  return (
    <footer className="px-5 pt-16 pb-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-10 border-b border-black/[0.08] pb-10 md:flex-row">
          <div>
            <Wordmark dark={false} className="text-xl" />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">The career chain-matching engine. Every job, linked to you.</p>
          </div>
          <nav className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm sm:grid-cols-3">
            {[
              ["/#how", "How it works"],
              ["/#chain", "The chain"],
              ["/pricing", "Pricing"],
              ["/onboarding", "Get matched"],
              ["/signin", "Sign in"],
              ["/#faq", "FAQ"],
              ["/terms", "Terms"],
              ["/privacy", "Privacy"],
              ["/refunds", "Refunds"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="text-foreground/70 hover:text-foreground">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-col justify-between gap-2 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} ChainMatch · chainmatch.ai</p>
          <a href="mailto:hello@chainmatch.ai" className="hover:text-foreground">
            hello@chainmatch.ai
          </a>
        </div>
      </div>
    </footer>
  );
}

/** Simple page frame for pricing, sign-in and policy pages. */
export function PublicPage({ children, width = "max-w-3xl" }: { children: React.ReactNode; width?: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PillNav />
      <main className={`mx-auto w-full flex-1 px-4 pt-28 pb-20 ${width}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Long-form text styling for the policy pages. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 text-[0.95rem] leading-relaxed text-foreground/80 [&_h1]:poster [&_h1]:text-5xl sm:[&_h1]:text-6xl [&_h1]:text-foreground [&_h2]:pt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc">
      {children}
    </div>
  );
}
