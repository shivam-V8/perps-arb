"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Building2, Crown, ExternalLink, Loader2, Lock, RefreshCw, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { decideJob } from "@/app/actions";
import { PaywallDialog } from "@/components/billing/paywall";
import { JobCard } from "@/components/cards/job-card";
import { SwipeDeck } from "@/components/swipe/swipe-deck";
import { Button } from "@/components/ui/button";
import { companyDomainFor } from "@/lib/company-logo";
import type { CompanyLead, Decision, Entitlement, JobPosting } from "@/lib/types";
import { CompanyLogo } from "@/components/profile/company-logo";

const STEPS = [
  "Reading your profile…",
  "Searching the web for openings…",
  "Reading companies' live job boards…",
  "Dropping closed or duplicate postings…",
  "Ranking what fits you…",
];

export function JobsBoard({
  headline,
  initialJobs,
  companies,
  autoSearch,
  entitlement,
  billingOpen,
  paid,
}: {
  headline: string;
  initialJobs: JobPosting[];
  companies: CompanyLead[];
  autoSearch: boolean;
  entitlement: Entitlement;
  billingOpen: boolean;
  /** set when returning from a successful checkout */
  paid?: string;
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [credits, setCredits] = useState(entitlement.credits);
  const [paywall, setPaywall] = useState<{ open: boolean; reason?: string }>({ open: false });
  const pro = entitlement.plan === "pro";
  const lockedCount = jobs.filter((j) => j.locked).length;

  useEffect(() => setCredits(entitlement.credits), [entitlement.credits]);

  // back from Stripe: the webhook usually lands within seconds, so refresh until it has
  useEffect(() => {
    if (!paid) return;
    toast.success(paid === "pack" ? "Payment received. Your 5 unlocks are on their way." : "Welcome to Pro! Unlocking your matches…");
    let n = 0;
    const t = setInterval(() => {
      router.refresh();
      if (++n >= 6) {
        clearInterval(t);
        router.replace("/jobs");
      }
    }, 2500);
    return () => clearInterval(t);
  }, [paid, router]);

  const unlock = useCallback(
    async (job: JobPosting) => {
      if (credits <= 0) {
        setPaywall({ open: true, reason: `Unlock this ${job.score}% match and every other one with Pro, or buy 5 unlocks.` });
        return;
      }
      const res = await fetch("/api/jobs/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      }).catch(() => null);
      const json = res ? await res.json().catch(() => ({})) : {};
      if (res?.status === 402) return setPaywall({ open: true, reason: "You're out of unlocks." });
      if (!res?.ok || !json.job) return toast.error(json.error ?? "Couldn't unlock that job.");
      setJobs((list) => list.map((j) => (j.id === job.id ? (json.job as JobPosting) : j)));
      setCredits(json.credits ?? 0);
      toast.success("Unlocked", { description: `${json.job.title} · ${json.job.company}` });
    },
    [credits],
  );

  const canDecide = useCallback(
    (job: JobPosting, d: Decision) => {
      if (job.locked && d === "like") {
        unlock(job);
        return false;
      }
      return true;
    },
    [unlock],
  );
  const [searching, setSearching] = useState(false);
  const [step, setStep] = useState(0);
  const started = useRef(false);

  useEffect(() => setJobs(initialJobs), [initialJobs]);

  const runSearch = useCallback(async () => {
    setSearching(true);
    setStep(0);
    const tick = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 6000);
    const res = await fetch("/api/jobs/search", { method: "POST" }).catch(() => null);
    clearInterval(tick);
    const json = res ? await res.json().catch(() => ({})) : {};
    setSearching(false);
    if (res?.status === 402 && json.paywall) {
      setPaywall({ open: true, reason: json.error });
      return;
    }
    if (!res?.ok) {
      toast.error(json.error ?? "Search failed. Try again.");
      return;
    }
    toast.success(`Found ${json.found} open postings`, {
      description: json.verified ? `${json.verified} confirmed live on company job boards${json.closedDropped ? `, ${json.closedDropped} closed ones removed` : ""}.` : undefined,
    });
    router.replace("/jobs");
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (autoSearch && !started.current) {
      started.current = true;
      runSearch();
    }
  }, [autoSearch, runSearch]);

  const onDecide = useCallback((job: JobPosting, d: Decision) => {
    setJobs((list) => list.filter((j) => j.id !== job.id));
    decideJob(job.id, d).catch(() => toast.error("Couldn't save that swipe."));
    if (d === "like") toast("Saved", { description: `${job.title} · ${job.company}`, action: { label: "View", onClick: () => window.open(job.url, "_blank", "noopener") } });
  }, []);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 pt-6 md:pt-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="mx-auto w-full max-w-[420px] min-w-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="poster text-5xl">Jobs for <span className="text-brand">you.</span></h1>
            <p className="truncate text-sm text-muted-foreground">Live postings for “{headline}”</p>
            {pro ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                <Crown className="size-3.5" /> Pro: every match unlocked
              </p>
            ) : lockedCount > 0 ? (
              <button type="button" onClick={() => setPaywall({ open: true })} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-foreground/70 hover:text-foreground">
                <Lock className="size-3" /> {jobs.length - lockedCount} of {jobs.length} matches open
                {credits > 0 ? ` · ${credits} unlock${credits === 1 ? "" : "s"} left` : " · unlock all"}
              </button>
            ) : null}
          </div>
          <Button variant="outline" size="sm" className="shrink-0 rounded-full border-black/10 bg-white" disabled={searching} onClick={runSearch}>
            {searching ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Search again
          </Button>
        </div>

        {searching && jobs.length === 0 ? (
          <SearchingCard step={step} />
        ) : (
          <SwipeDeck
            items={jobs}
            render={(job) => <JobCard job={job} onUnlock={unlock} credits={credits} />}
            onDecide={onDecide}
            canDecide={canDecide}
            likeLabel="Save"
            passLabel="Pass"
            empty={
              <div className="grid h-full place-items-center rounded-[28px] border border-dashed border-black/15 bg-white/60 p-8 text-center">
                <div>
                  <Search className="mx-auto size-6 text-brand" />
                  <h3 className="mt-3 font-display text-xl font-semibold">You&apos;ve seen them all</h3>
                  <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">Run a fresh search, or apply to the jobs you saved.</p>
                  <div className="mt-5 flex justify-center gap-2">
                    <Button onClick={runSearch} disabled={searching} className="rounded-full">
                      Search again
                    </Button>
                    <Button asChild variant="outline" className="rounded-full border-black/10 bg-white">
                      <Link href="/saved">Saved jobs</Link>
                    </Button>
                  </div>
                </div>
              </div>
            }
          />
        )}
        {searching && jobs.length > 0 && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> {STEPS[step]}
          </p>
        )}
      </div>

      <PaywallDialog open={paywall.open} onOpenChange={(open) => setPaywall((p) => ({ ...p, open }))} reason={paywall.reason} email={entitlement.email} billingOpen={billingOpen} />

      <aside className="lg:pt-16">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Building2 className="size-4 text-brand" /> Companies that hire people like you
        </h2>
        {companies.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">These appear after your first search.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {companies.map((c) => (
              <li key={c.name}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-soft transition-shadow hover:shadow-lift"
                >
                  <div className="flex items-start gap-3">
                    <CompanyLogo name={c.name} domain={companyDomainFor({ companyDomain: c.domain, url: c.url, company: c.name })} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center justify-between text-sm font-semibold">
                        {c.name}
                        <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-foreground" />
                      </p>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{c.why}</p>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

function SearchingCard({ step }: { step: number }) {
  return (
    <div className="grid h-[clamp(430px,calc(100dvh-300px),620px)] place-items-center rounded-[28px] border border-black/[0.06] bg-white p-8 shadow-lift">
      <div className="w-full max-w-xs">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-wash">
          <Sparkles className="size-6 animate-pulse text-brand" />
        </div>
        <h3 className="mt-5 text-center font-display text-xl font-semibold">Searching the web for you</h3>
        <ul className="mt-6 space-y-2.5">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2.5 text-sm">
              <AnimatePresence mode="wait">
                {i < step ? (
                  <motion.span key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid size-4 place-items-center rounded-full bg-brand text-[0.6rem] text-white">
                    ✓
                  </motion.span>
                ) : i === step ? (
                  <Loader2 key="busy" className="size-4 animate-spin text-brand" />
                ) : (
                  <span key="todo" className="size-4 rounded-full border border-black/15" />
                )}
              </AnimatePresence>
              <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{s}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-xs text-muted-foreground">Usually 1–2 minutes.</p>
      </div>
    </div>
  );
}
