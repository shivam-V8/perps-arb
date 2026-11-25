"use client";

import { Briefcase, Loader2, Search } from "lucide-react";
import { useTransition } from "react";
import { chooseRole } from "@/app/actions";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RolePicker({ preselect }: { preselect?: Role }) {
  const [pending, start] = useTransition();
  const options = [
    { role: "candidate" as const, icon: Search, title: "I'm looking for a job", body: "Upload a résumé. Swipe on live postings ranked for you." },
    { role: "recruiter" as const, icon: Briefcase, title: "I'm hiring", body: "Describe a role. Swipe on candidates who fit, and invite them." },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.role}
          type="button"
          disabled={pending}
          onClick={() => start(() => chooseRole(o.role))}
          className={cn(
            "flex flex-col items-start rounded-3xl border bg-white p-6 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-60",
            preselect === o.role ? "border-brand/50 ring-2 ring-brand/20" : "border-black/[0.06]",
          )}
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-brand-wash">
            {pending ? <Loader2 className="size-5 animate-spin text-brand" /> : <o.icon className="size-5 text-brand" />}
          </span>
          <span className="mt-5 font-display text-xl font-semibold">{o.title}</span>
          <span className="mt-1 text-sm text-muted-foreground">{o.body}</span>
        </button>
      ))}
    </div>
  );
}
