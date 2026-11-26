import { BadgeCheck, ExternalLink, Globe, Lock, MapPin, Sparkles } from "lucide-react";
import { TONE_WASH, toneFor } from "@/components/profile/avatar-mark";
import { CompanyLogo } from "@/components/profile/company-logo";
import { companyDomainFor } from "@/lib/company-logo";
import { MatchRing } from "@/components/profile/match-ring";
import { remoteLabel } from "@/lib/fields";
import type { JobPosting } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A live posting found for the candidate (or its locked preview). */
export function JobCard({
  job,
  className,
  onUnlock,
  credits = 0,
}: {
  job: JobPosting;
  className?: string;
  onUnlock?: (job: JobPosting) => void;
  credits?: number;
}) {
  if (job.locked) return <LockedJobCard job={job} className={className} onUnlock={onUnlock} credits={credits} />;
  const tone = toneFor(job.company);
  return (
    <article className={cn("flex h-full flex-col overflow-hidden rounded-[28px] border border-black/[0.06] bg-card shadow-lift", className)}>
      <header className={cn("bg-gradient-to-b to-white px-6 pt-6 pb-4", TONE_WASH[tone])}>
        <div className="flex items-start justify-between gap-3">
          <CompanyLogo name={job.company} domain={companyDomainFor(job)} size="lg" className="shadow-soft" />
          <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-white/80 px-2 pt-2 pb-1 shadow-soft backdrop-blur">
            <MatchRing score={job.score} size={48} />
            <span className="text-[0.6rem] font-medium tracking-wider text-muted-foreground uppercase">fit</span>
          </div>
        </div>
        <h3 className="mt-4 line-clamp-2 font-display text-[1.6rem] leading-[1.1] font-semibold tracking-tight">{job.title}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-foreground/80">
          {job.company}
          {job.verified && <LiveBadge ats={job.ats} />}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3" />
            {job.location || "Location not listed"}
          </span>
          {job.remote !== "unknown" && job.remote !== "any" && <span>{remoteLabel(job.remote)}</span>}
          {(job.source || hostOf(job.url)) && (
            <span className="flex min-w-0 items-center gap-1">
              <Globe className="size-3 shrink-0" />
              <span className="truncate">{job.source || hostOf(job.url)}</span>
            </span>
          )}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-hidden px-6 pb-5">
        <p className="line-clamp-3 text-sm leading-relaxed text-foreground/75">{job.summary}</p>

        <section className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-surface-2 p-3.5 ring-1 ring-black/[0.04] [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
          <h4 className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
            <Sparkles className="size-3.5 text-brand" />
            Why it fits you
          </h4>
          <ul className="space-y-1.5">
            {job.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-[0.82rem] leading-snug text-foreground/80">
                <span className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-brand" />
                <span className="line-clamp-2">{r}</span>
              </li>
            ))}
          </ul>
        </section>

        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-auto inline-flex shrink-0 items-center gap-1.5 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="size-3.5" /> View posting
        </a>
      </div>
    </article>
  );
}

/** Behind the paywall: title, place and fit are real; the rest is a placeholder. */
function LockedJobCard({
  job,
  className,
  onUnlock,
  credits,
}: {
  job: JobPosting;
  className?: string;
  onUnlock?: (job: JobPosting) => void;
  credits: number;
}) {
  return (
    <article className={cn("flex h-full flex-col overflow-hidden rounded-[28px] border border-black/[0.06] bg-card shadow-lift", className)}>
      <header className="bg-gradient-to-b from-[#eceff4] to-white px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid size-16 place-items-center rounded-2xl bg-white shadow-soft ring-1 ring-black/[0.08]">
            <Lock className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-white/80 px-2 pt-2 pb-1 shadow-soft backdrop-blur">
            <MatchRing score={job.score} size={48} />
            <span className="text-[0.6rem] font-medium tracking-wider text-muted-foreground uppercase">fit</span>
          </div>
        </div>
        <h3 className="mt-4 line-clamp-2 font-display text-[1.6rem] leading-[1.1] font-semibold tracking-tight">{job.title}</h3>
        <p className="mt-1.5 h-4 w-32 rounded bg-black/[0.07]" aria-label="Company hidden" />
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3" />
            {job.location || "Location not listed"}
          </span>
          {job.remote !== "unknown" && job.remote !== "any" && <span>{remoteLabel(job.remote)}</span>}
        </p>
      </header>
      <div className="relative flex min-h-0 flex-1 flex-col px-6 pb-6">
        <div className="space-y-2 blur-[3px] select-none" aria-hidden>
          <div className="h-3 w-full rounded bg-black/[0.07]" />
          <div className="h-3 w-11/12 rounded bg-black/[0.07]" />
          <div className="h-3 w-4/5 rounded bg-black/[0.07]" />
          <div className="mt-4 h-24 rounded-2xl bg-surface-2" />
        </div>
        <div className="mt-auto pt-5 text-center">
          <p className="text-sm font-medium">This {job.score}% match is locked</p>
          <p className="mt-0.5 text-xs text-muted-foreground">See the company, the link and why it fits you.</p>
          {onUnlock && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onUnlock(job)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              <Lock className="size-3.5" />
              {credits > 0 ? `Unlock · ${credits} left` : "Unlock this job"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const ATS_NAMES: Record<string, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  workable: "Workable",
  smartrecruiters: "SmartRecruiters",
};

/** Confirmed open in the company's own applicant-tracking system right now. */
export function LiveBadge({ ats }: { ats?: string | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-brand-wash px-2 py-0.5 text-[0.7rem] font-semibold text-brand ring-1 ring-brand-line"
      title="Confirmed open on the company's job board"
    >
      <BadgeCheck className="size-3" />
      Live{ats && ATS_NAMES[ats] ? ` on ${ATS_NAMES[ats]}` : ""}
    </span>
  );
}
