import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/** Footer shared by the landing page and the public pages. */
export function SiteFooter() {
  return (
    <footer className="border-t border-black/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <Logo />
        <nav className="flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/signin" className="hover:text-foreground">
            Sign in
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/refunds" className="hover:text-foreground">
            Refunds
          </Link>
        </nav>
        <p>© {new Date().getFullYear()} ChainMatch</p>
      </div>
    </footer>
  );
}

/** Simple page frame for pricing, sign-in and policy pages. */
export function PublicPage({ children, width = "max-w-3xl" }: { children: React.ReactNode; width?: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/pricing" className="rounded-full px-3 py-1.5 text-foreground/70 hover:text-foreground">
            Pricing
          </Link>
          <Link href="/onboarding" className="rounded-full px-3 py-1.5 font-medium">
            Open app
          </Link>
        </nav>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 pt-8 pb-20 ${width}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Long-form text styling for the policy pages. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 text-[0.95rem] leading-relaxed text-foreground/80 [&_h1]:font-display [&_h1]:text-4xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-foreground [&_h2]:pt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc">
      {children}
    </div>
  );
}
