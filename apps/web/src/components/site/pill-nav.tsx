"use client";

import { ArrowUpRight, Menu } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** ChainMatch wordmark for dark backgrounds: two interlocking links, the second one emerald. */
export function Wordmark({ className, dark = true }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 font-display text-[1.05rem] font-bold tracking-tight", className)}>
      <svg viewBox="0 0 28 16" className="h-4 w-7" aria-hidden fill="none">
        <rect x="1.2" y="1.2" width="15" height="13.6" rx="6.8" stroke={dark ? "#fff" : "#0b0d12"} strokeWidth="2.4" />
        <rect x="11.8" y="1.2" width="15" height="13.6" rx="6.8" stroke="#10b981" strokeWidth="2.4" />
      </svg>
      <span className={dark ? "text-white" : "text-foreground"}>
        ChainMatch<span className="text-brand-soft">.</span>
      </span>
    </span>
  );
}

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#chain", label: "The chain" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

/** Primary CTA: pill with an arrow in a circle. */
export function ArrowButton({
  href,
  children,
  tone = "brand",
  className,
}: {
  href: string;
  children: React.ReactNode;
  tone?: "brand" | "ink" | "light";
  className?: string;
}) {
  const tones = {
    brand: "bg-brand text-white hover:bg-[#047857]",
    ink: "bg-ink text-white hover:bg-black",
    light: "bg-white text-ink ring-1 ring-black/10 hover:bg-white/90",
  };
  const dot = { brand: "bg-white text-brand", ink: "bg-white text-ink", light: "bg-ink text-white" };
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-3 rounded-full py-1.5 pr-1.5 pl-5 text-sm font-semibold tracking-wide uppercase transition-colors",
        tones[tone],
        className,
      )}
    >
      {children}
      <span className={cn("grid size-8 place-items-center rounded-full transition-transform group-hover:rotate-45", dot[tone])}>
        <ArrowUpRight className="size-4" strokeWidth={2.5} />
      </span>
    </Link>
  );
}

/** Floating dark pill navigation for the public site. */
export function PillNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3">
      <nav
        aria-label="Main"
        className={cn(
          "pointer-events-auto flex items-center gap-1 rounded-full bg-ink/95 py-1.5 pr-1.5 pl-5 text-white shadow-[0_12px_40px_-12px_rgb(0_0_0/0.45)] ring-1 ring-white/10 backdrop-blur transition-all duration-300",
          scrolled ? "scale-[0.97]" : "",
        )}
      >
        <Link href="/" aria-label="ChainMatch home" className="mr-3">
          <Wordmark />
        </Link>
        <div className="hidden items-center md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-3 py-1.5 text-sm text-white/70 transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
          <Link href="/signin" className="rounded-full px-3 py-1.5 text-sm text-white/70 transition-colors hover:text-white">
            Sign in
          </Link>
        </div>
        <Link
          href="/onboarding"
          className="ml-1 hidden items-center gap-2 rounded-full bg-brand py-1.5 pr-1.5 pl-4 text-sm font-semibold text-white transition-colors hover:bg-[#047857] sm:inline-flex"
        >
          Get matched
          <span className="grid size-7 place-items-center rounded-full bg-white text-brand">
            <ArrowUpRight className="size-3.5" strokeWidth={2.5} />
          </span>
        </Link>
        <Sheet>
          <SheetTrigger className="ml-1 grid size-9 place-items-center rounded-full text-white/80 hover:bg-white/10 md:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="top" className="rounded-b-3xl border-0 bg-ink p-6 text-white">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mt-4 flex flex-col gap-1">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} className="poster rounded-xl px-2 py-2 text-3xl text-white/90 hover:text-brand-soft">
                  {l.label}
                </a>
              ))}
              <Link href="/signin" className="poster rounded-xl px-2 py-2 text-3xl text-white/90">
                Sign in
              </Link>
              <ArrowButton href="/onboarding" className="mt-4 self-start">
                Get matched
              </ArrowButton>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
