import { Briefcase, EyeOff, MapPin, Sparkles } from "lucide-react";
import { TONE_WASH, toneFor } from "@/components/profile/avatar-mark";
import { MatchRing } from "@/components/profile/match-ring";
import { fieldLabel, remoteLabel } from "@/lib/fields";
import type { CandidateCardData } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Anonymous candidate as a recruiter sees them before an invite is accepted. */
export function CandidateCard({ c, className }: { c: CandidateCardData; className?: string }) {
  const tone = toneFor(c.candidate_id);
  return (
    <article className={cn("flex h-full flex-col overflow-hidden rounded-[28px] border border-black/[0.06] bg-card shadow-lift", className)}>
      <header className={cn("bg-gradient-to-b to-white px-6 pt-6 pb-4", TONE_WASH[tone])}>
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-foreground/70 shadow-soft">
            <EyeOff className="size-3.5" /> Name shared if they accept
          </span>
          <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-white/80 px-2 pt-2 pb-1 shadow-soft backdrop-blur">
            <MatchRing score={c.score} size={48} />
            <span className="text-[0.6rem] font-medium tracking-wider text-muted-foreground uppercase">fit</span>
          </div>
        </div>
        <h3 className="mt-4 line-clamp-2 font-display text-[1.6rem] leading-[1.1] font-semibold tracking-tight">{c.headline}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <span className="capitalize">{c.seniority}</span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3" />
            {c.location || "Location not listed"}
          </span>
          <span>{remoteLabel(c.remote_pref)}</span>
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-hidden px-6 pb-5">
        <p className="line-clamp-3 text-sm leading-relaxed text-foreground/75">{c.summary}</p>
        <ul className="flex flex-wrap gap-1.5">
          {c.fields.map((f) => (
            <li key={f} className="rounded-full bg-brand-wash px-2.5 py-0.5 text-xs font-medium text-brand">
              {fieldLabel(f)}
            </li>
          ))}
          {c.skills.slice(0, 5).map((s) => (
            <li key={s} className="rounded-full bg-black/[0.04] px-2.5 py-0.5 text-xs text-foreground/70">
              {s}
            </li>
          ))}
        </ul>
        {c.experience.length > 0 && (
          <ul className="space-y-1 text-xs text-foreground/70">
            {c.experience.slice(0, 2).map((e, i) => (
              <li key={i} className="flex items-center gap-1.5 truncate">
                <Briefcase className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {e.title} · {e.company} <span className="text-muted-foreground">({e.start}–{e.end})</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <section className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-surface-2 p-3.5 ring-1 ring-black/[0.04] [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
          <h4 className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
            <Sparkles className="size-3.5 text-brand" />
            Why they fit this role
          </h4>
          <ul className="space-y-1.5">
            {c.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-[0.82rem] leading-snug text-foreground/80">
                <span className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-brand" />
                <span className="line-clamp-2">{r}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
