"use client";

import { Bookmark, Briefcase, Layers, MessageCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV: Record<Role, { href: string; label: string; icon: React.ElementType }[]> = {
  candidate: [
    { href: "/jobs", label: "Jobs", icon: Layers },
    { href: "/saved", label: "Saved", icon: Bookmark },
    { href: "/profile", label: "Profile", icon: UserRound },
  ],
  recruiter: [
    { href: "/roles", label: "Roles", icon: Briefcase },
    { href: "/matches", label: "Messages", icon: MessageCircle },
    { href: "/profile", label: "Profile", icon: UserRound },
  ],
};

export function DesktopNav({ role, badges }: { role: Role; badges: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {NAV[role].map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
              active ? "bg-white/15 text-white" : "text-white/60 hover:text-white",
            )}
          >
            <Icon className="size-4" />
            {label}
            {badges[href] > 0 && (
              <span className="grid min-w-4 place-items-center rounded-full bg-brand px-1 font-mono text-[0.6rem] font-semibold text-white">
                {badges[href]}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ role, badges }: { role: Role; badges: Record<string, number> }) {
  const path = usePathname();
  if (/^\/matches\/[^/]+/.test(path)) return null; // chat is full-screen
  const items = NAV[role];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[0.7rem]", active ? "text-foreground" : "text-muted-foreground")}
            >
              <Icon className="size-5" />
              {label}
              {badges[href] > 0 && (
                <span className="absolute top-1.5 left-1/2 ml-2 grid size-4 place-items-center rounded-full bg-brand font-mono text-[0.6rem] font-semibold text-white">
                  {badges[href]}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
