"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Check, Copy, Link2, Mail, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSeen } from "@/components/motion";
import { cn } from "@/lib/utils";

/** White app-window card that sits on a pastel panel. */
function Window({ title, tag, children, className }: { title: string; tag?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full max-w-[420px] rounded-3xl bg-white p-5 shadow-lift ring-1 ring-black/[0.05]", className)}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        {tag && <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-black/[0.05]">{tag}</span>}
      </div>
      {children}
    </div>
  );
}

/** Steps through 0..n once the element is seen (instantly done with reduced motion). */
function useScene(steps: number, every = 650) {
  const reduce = useReducedMotion();
  const [ref, seen] = useSeen<HTMLDivElement>();
  const [step, setStep] = useState(reduce ? steps : 0);
  useEffect(() => {
    if (!seen || reduce) return;
    let s = 0;
    const t = setInterval(() => {
      s += 1;
      setStep(s);
      if (s >= steps) clearInterval(t);
    }, every);
    return () => clearInterval(t);
  }, [seen, reduce, steps, every]);
  return [ref, step] as const;
}

/* 01 · import */
const URL_TEXT = "linkedin.com/in/maya-fernandes";
const FIELDS = [
  ["Headline", "Senior Product Designer"],
  ["Experience", "6 roles · 9 years"],
  ["Skills", "Figma, Research, Design systems"],
  ["Location", "Lisbon · open to remote"],
];
export function ImportMock() {
  const [ref, step] = useScene(FIELDS.length + 2, 600);
  const typed = step >= 1 ? URL_TEXT : "";
  return (
    <div ref={ref} className="w-full">
      <Window title="Add your profile" tag="LinkedIn URL">
        <div className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2.5 text-sm ring-1 ring-black/[0.06]">
          <Link2 className="size-4 text-muted-foreground" />
          <span className="truncate">
            {typed}
            {step < 2 && <span className="ml-px inline-block h-4 w-px animate-pulse bg-ink align-middle" />}
          </span>
        </div>
        <ul className="mt-4 space-y-2">
          {FIELDS.map(([k, v], i) => (
            <li key={k} className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] px-3 py-2 text-sm">
              <span className="text-muted-foreground">{k}</span>
              {step >= i + 2 ? (
                <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="truncate font-medium">
                  {v}
                </motion.span>
              ) : (
                <span className="h-3 w-28 animate-pulse rounded bg-black/[0.06]" />
              )}
            </li>
          ))}
        </ul>
      </Window>
    </div>
  );
}

/* 02 · match */
const JOBS = [
  { t: "Senior Product Designer", c: "Orbit Pay", s: 94, chips: ["Design systems", "Fintech"] },
  { t: "Lead UX Designer", c: "Lumen Health", s: 87, chips: ["Research", "Senior"] },
  { t: "Product Designer II", c: "Kitebird", s: 81, chips: ["Figma", "Remote"] },
  { t: "Brand Designer", c: "Fieldwork", s: 62, chips: ["Visual"] },
];
export function MatchMock() {
  const [ref, step] = useScene(2, 700);
  return (
    <div ref={ref} className="w-full">
      <Window title="Your matches" tag="Ranked for you">
        <ul className="space-y-2.5">
          {JOBS.map((j, i) => (
            <li key={j.t} className={cn("rounded-2xl px-3 py-2.5 ring-1 transition-colors", i < 3 && step >= 2 ? "bg-panel-mint/60 ring-brand/20" : "ring-black/[0.05]")}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-semibold">
                  {j.t} <span className="font-normal text-muted-foreground">· {j.c}</span>
                </span>
                <span className="tabular text-xs font-bold">{step >= 1 ? j.s : 0}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                <motion.div
                  className={cn("h-full rounded-full", j.s >= 80 ? "bg-brand" : "bg-black/30")}
                  initial={{ width: 0 }}
                  animate={{ width: step >= 1 ? `${j.s}%` : 0 }}
                  transition={{ duration: 1, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              {step >= 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 flex flex-wrap gap-1">
                  {j.chips.map((c) => (
                    <span key={c} className="rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-medium text-foreground/70 ring-1 ring-black/[0.06]">
                      {c}
                    </span>
                  ))}
                </motion.div>
              )}
            </li>
          ))}
        </ul>
      </Window>
    </div>
  );
}

/* 03 · verify */
const POSTINGS = [
  { t: "Platform Engineer", c: "Orbit Pay", ats: "Greenhouse", open: true },
  { t: "Backend Engineer", c: "Kitebird", ats: "Lever", open: false },
  { t: "Data Engineer", c: "Lumen Health", ats: "Ashby", open: true },
  { t: "SRE", c: "Fieldwork", ats: "Workable", open: true },
];
export function VerifyMock() {
  const [ref, step] = useScene(POSTINGS.length + 1, 550);
  return (
    <div ref={ref} className="w-full">
      <Window title="Checking company job boards" tag="5 ATS platforms">
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {POSTINGS.filter((p, i) => p.open || step <= POSTINGS.length || i !== 1).map((p) => {
              const i = POSTINGS.indexOf(p);
              const checked = step > i;
              return (
                <motion.li
                  key={p.t}
                  layout
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-black/[0.06] px-3 py-2.5 text-sm"
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full transition-colors",
                      !checked ? "bg-black/[0.06]" : p.open ? "bg-brand text-white" : "bg-rose/15 text-rose",
                    )}
                  >
                    {checked && (p.open ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />)}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate", checked && !p.open && "text-muted-foreground line-through")}>
                    {p.t} · {p.c}
                  </span>
                  <span className="text-xs text-muted-foreground">{checked ? (p.open ? `Live on ${p.ats}` : "Closed") : p.ats}</span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        {step > POSTINGS.length && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs font-medium text-white">
            <BadgeCheck className="size-4 text-brand-soft" /> 1 closed posting removed · 3 confirmed open
          </motion.p>
        )}
      </Window>
    </div>
  );
}

/* 04 · cover note */
const NOTE =
  "Hi Orbit Pay team, I've spent four years building design systems for payments products, most recently leading the component library at Fieldwork used by 40 engineers. Your posting asks for exactly that…";
export function CoverNoteMock() {
  const reduce = useReducedMotion();
  const [ref, seen] = useSeen<HTMLDivElement>();
  const [n, setN] = useState(reduce ? NOTE.length : 0);
  useEffect(() => {
    if (!seen || reduce) return;
    const t = setInterval(() => setN((x) => (x >= NOTE.length ? (clearInterval(t), x) : x + 3)), 28);
    return () => clearInterval(t);
  }, [seen, reduce]);
  const done = n >= NOTE.length;
  return (
    <div ref={ref} className="w-full">
      <Window title="Cover note · Senior Product Designer" tag="From your profile">
        <p className="min-h-[136px] rounded-2xl bg-surface-2 p-4 text-sm leading-relaxed ring-1 ring-black/[0.04]">
          {NOTE.slice(0, n)}
          {!done && <span className="ml-px inline-block h-4 w-px animate-pulse bg-ink align-middle" />}
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <motion.span
            animate={done && !reduce ? { scale: [1, 1.08, 1] } : undefined}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white"
          >
            <Copy className="size-3.5" /> Copy
          </motion.span>
        </div>
      </Window>
    </div>
  );
}

/* 05 · résumé fix */
export function FixMock() {
  const [ref, step] = useScene(2, 900);
  return (
    <div ref={ref} className="w-full">
      <Window title="Fixes for your résumé" tag="Experience">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Before</p>
        <p className={cn("mt-1 rounded-xl bg-rose/[0.06] p-3 text-sm transition-opacity", step >= 1 && "opacity-60 line-through decoration-rose/50")}>
          Responsible for the design system and helping teams.
        </p>
        <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-brand uppercase">
          <Sparkles className="size-3.5" /> After
        </p>
        <AnimatePresence>
          {step >= 1 && (
            <motion.p
              initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              className="mt-1 rounded-xl bg-panel-mint p-3 text-sm font-medium"
            >
              Led a 60-component design system adopted by 4 product teams, cutting UI build time by [X%].
            </motion.p>
          )}
        </AnimatePresence>
        {step >= 2 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-xs text-muted-foreground">
            Matches “design systems” and “cross-team” in 3 of your top jobs.
          </motion.p>
        )}
      </Window>
    </div>
  );
}

/* weekly digest */
export function DigestMock() {
  const [ref, step] = useScene(3, 500);
  const rows = [
    ["Senior Product Designer", "Orbit Pay", "94%"],
    ["Lead UX Designer", "Lumen Health", "88%"],
    ["Design Systems Lead", "Kitebird", "85%"],
  ];
  return (
    <div ref={ref} className="w-full">
      <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-black/[0.05]">
        <div className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-3.5">
          <span className="grid size-9 place-items-center rounded-full bg-ink text-white">
            <Mail className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">5 new jobs for you this week</p>
            <p className="text-xs text-muted-foreground">ChainMatch · Monday 8:00</p>
          </div>
        </div>
        <ul className="divide-y divide-black/[0.05] px-5">
          {rows.map(([t, c, s], i) => (
            <motion.li
              key={t}
              initial={{ opacity: 0, x: -10 }}
              animate={step > i ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{t}</span>
                <span className="block text-xs text-muted-foreground">{c} · cover note attached</span>
              </span>
              <span className="rounded-full bg-panel-mint px-2 py-0.5 text-xs font-bold text-brand">{s}</span>
            </motion.li>
          ))}
        </ul>
        <p className="border-t border-black/[0.06] bg-surface-2 px-5 py-3 text-xs text-muted-foreground">+ 3 fixes for your résumé</p>
      </div>
    </div>
  );
}
