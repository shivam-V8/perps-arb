"use client";

import { Copy, ExternalLink, Layers, Loader2, PenLine, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { decideJob } from "@/app/actions";
import { hostOf, LiveBadge } from "@/components/cards/job-card";
import { AvatarMark, toneFor } from "@/components/profile/avatar-mark";
import { MatchRing } from "@/components/profile/match-ring";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { JobPosting } from "@/lib/types";

export function SavedJobs({ jobs: initial }: { jobs: JobPosting[] }) {
  const [jobs, setJobs] = useState(initial);
  const [noteFor, setNoteFor] = useState<JobPosting | null>(null);
  const [note, setNote] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [, start] = useTransition();

  async function draft(job: JobPosting) {
    setNoteFor(job);
    setNote("");
    setDrafting(true);
    const res = await fetch("/api/jobs/cover-note", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: job.id }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setDrafting(false);
    if (res?.ok) setNote(json.note);
    else toast.error(json.error ?? "Couldn't draft a note.");
  }

  if (jobs.length === 0) {
    return (
      <div className="mt-16 text-center">
        <p className="text-muted-foreground">Nothing saved yet. Swipe right on a job to keep it here.</p>
        <Button asChild className="mt-5 rounded-full">
          <Link href="/jobs">
            <Layers /> Browse jobs
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <ul className="mt-8 space-y-3">
        {jobs.map((j) => (
          <li key={j.id} className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-soft">
            <div className="flex items-start gap-4">
              <AvatarMark name={j.company} tone={toneFor(j.company)} size="md" square />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg leading-tight font-semibold">{j.title}</p>
                {j.verified && (
                  <div className="mt-1">
                    <LiveBadge ats={j.ats} />
                  </div>
                )}
                <p className="text-sm text-foreground/70">
                  {j.company} · {j.location || "Location n/a"}
                  {j.salary ? ` · ${j.salary}` : ""}
                </p>
                <p className="mt-2 text-sm text-foreground/75">{j.reasons[0]}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {j.source || hostOf(j.url)}
                </p>
              </div>
              <MatchRing score={j.score} size={44} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" className="rounded-full">
                <a href={j.url} target="_blank" rel="noopener noreferrer">
                  Apply <ExternalLink />
                </a>
              </Button>
              <Button size="sm" variant="outline" className="rounded-full border-black/10" onClick={() => draft(j)}>
                <PenLine /> Draft cover note
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto rounded-full text-muted-foreground"
                onClick={() => {
                  setJobs((l) => l.filter((x) => x.id !== j.id));
                  start(() => decideJob(j.id, "pass"));
                }}
              >
                <Trash2 /> Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={!!noteFor} onOpenChange={(o) => !o && setNoteFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cover note</DialogTitle>
            <DialogDescription>
              {noteFor?.title} · {noteFor?.company}. Drafted from your profile only; edit before you send it.
            </DialogDescription>
          </DialogHeader>
          {drafting ? (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Drafting…
            </div>
          ) : (
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={10} className="resize-none" />
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              disabled={!note}
              onClick={() => {
                navigator.clipboard.writeText(note).then(() => toast.success("Copied"));
              }}
            >
              <Copy /> Copy
            </Button>
            {noteFor && (
              <Button asChild className="rounded-full">
                <a href={noteFor.url} target="_blank" rel="noopener noreferrer">
                  Open posting <ExternalLink />
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
