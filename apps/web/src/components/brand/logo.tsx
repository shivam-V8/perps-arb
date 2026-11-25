import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-6", className)}>
      <rect x="0.75" y="0.75" width="22.5" height="22.5" rx="6" className="fill-brand/10 stroke-brand/40" strokeWidth="1.5" />
      <circle cx="9" cy="12" r="4" className="stroke-brand" strokeWidth="1.8" />
      <circle cx="15" cy="12" r="4" className="stroke-foreground" strokeWidth="1.8" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span>
        Chain<span className="text-brand">Match</span>
      </span>
    </Link>
  );
}
