"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Building2, ExternalLink, Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { decideJob } from "@/app/actions";
import { JobCard } from "@/components/cards/job-card";
import { SwipeDeck } from "@/components/swipe/swipe-deck";
import { Button } from "@/components/ui/button";
import type { CompanyLead, Decision, JobPosting } from "@/lib/types";

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
}: {
  headline: string;
  initialJobs: JobPosting[];
  companies: CompanyLead[];
  autoSearch: boolean;
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
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
    <div className="grid gap-10 pt-6 md:pt-8 lg:grid-cols-[1fr_300px]">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Jobs for you</h1>
            <p className="truncate text-sm text-muted-foreground">Live postings for “{headline}”</p>
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
            render={(job) => <JobCard job={job} />}
            onDecide={onDecide}
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
                  <p className="flex items-center justify-between text-sm font-semibold">
                    {c.name}
                    <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-foreground" />
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{c.why}</p>
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
