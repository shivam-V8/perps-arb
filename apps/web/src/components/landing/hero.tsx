"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Check, FileText, Sparkles } from "lucide-react";
import { BlurWords } from "@/components/motion";
import { ArrowButton } from "@/components/site/pill-nav";

const SHORTLIST = [
  { t: "Product Designer", c: "Orbit Pay · Remote", s: 94, tint: "bg-panel-mint text-brand" },
  { t: "UX Researcher", c: "Lumen Health · Berlin", s: 88, tint: "bg-panel-sky text-[#1d4ed8]" },
  { t: "Design Systems Lead", c: "Kitebird · Hybrid", s: 83, tint: "bg-panel-lemon text-[#a16207]" },
  { t: "Visual Designer", c: "Fieldwork · Remote", s: 79, tint: "bg-panel-peach text-[#c2410c]" },
];

export function Hero() {
  return (
    <section className="px-3 pt-3">
      <div className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(180deg,var(--panel-mint)_0%,#f4fbf7_55%,var(--background)_100%)]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-28 pb-16 md:pt-32 lg:grid-cols-[1.25fr_1fr] lg:pb-24">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[0.7rem] font-bold tracking-[0.14em] text-ink uppercase ring-1 ring-black/[0.06]"
            >
              <span className="size-1.5 rounded-full bg-brand" /> The career chain-matching engine
            </motion.p>
            <BlurWords
              as="h1"
              immediate
              lines={["Every job,", "linked to you."]}
              accent={[1]}
              className="mt-6 text-[clamp(3.2rem,7.2vw,6.4rem)] text-ink"
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="mt-6 max-w-md text-lg leading-relaxed text-foreground/70"
            >
              Upload a résumé or LinkedIn URL. ChainMatch traces the chain from your experience to every open role, and shows you each link.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <ArrowButton href="/onboarding">Get my matches</ArrowButton>
              <ArrowButton href="#how" tone="light">
                See how it works
              </ArrowButton>
            </motion.div>
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.8 }}
              className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-foreground/70"
            >
              {["Free to start", "No account needed", "Any field"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="size-4 text-brand" strokeWidth={2.75} /> {t}
                </li>
              ))}
            </motion.ul>
            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.95 }}
              href="https://www.producthunt.com/products/chainmatch-ai?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-chainmatch-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Product Hunt's hosted badge SVG */}
              <img
                alt="ChainMatch AI - Find open jobs matched to your skills and experience | Product Hunt"
                width={250}
                height={54}
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1332982&theme=light&t=1795778708428"
              />
            </motion.a>
          </div>
          <HeroPhone />
        </div>
      </div>
    </section>
  );
}

function HeroPhone() {
  const reduce = useReducedMotion();
  const pop = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, scale: 0.85, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, transition: { delay, type: "spring" as const, stiffness: 220, damping: 18 } };
  return (
    <div className="relative mx-auto h-[540px] w-full max-w-[420px]">
      {/* phone */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 40, rotate: 4 }}
        animate={{ opacity: 1, y: 0, rotate: 2 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-8 top-0 bottom-0 rounded-[44px] bg-ink p-2.5 shadow-[0_40px_80px_-30px_rgb(11_13_18/0.55)]"
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[36px] bg-white">
          <div className="mx-auto mt-2.5 h-6 w-24 rounded-full bg-ink" />
          <div className="m-3 rounded-3xl bg-brand p-5 text-white">
            <p className="text-[0.65rem] font-bold tracking-[0.16em] uppercase opacity-80">Top match this week</p>
            <p className="poster mt-1 text-7xl">94%</p>
            <p className="text-sm opacity-90">Product Designer · Orbit Pay</p>
          </div>
          <div className="flex items-center justify-between px-5 pt-1 text-[0.65rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
            <span>Your matches</span>
            <span>4 of 18</span>
          </div>
          <ul className="space-y-2 p-3">
            {SHORTLIST.map((j, i) => (
              <motion.li
                key={j.t}
                initial={reduce ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.5 }}
                className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 ring-1 ring-black/[0.04]"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-white text-xs font-bold ring-1 ring-black/[0.06]">{j.c[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{j.t}</span>
                  <span className="block truncate text-xs text-muted-foreground">{j.c}</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${j.tint}`}>{j.s}%</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* floating toasts */}
      <motion.div {...pop(1.1)} className="absolute top-[13.5rem] -left-2 sm:-left-10">
        <div className="flex animate-float items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-lift ring-1 ring-black/[0.05] [--r:-3deg]">
          <span className="grid size-8 place-items-center rounded-xl bg-panel-sky">
            <FileText className="size-4 text-[#1d4ed8]" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Cover note drafted</span>
            <span className="block text-xs text-muted-foreground">From your real experience</span>
          </span>
        </div>
      </motion.div>
      <motion.div {...pop(1.35)} className="absolute right-0 bottom-24 sm:-right-6">
        <div className="flex animate-float items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-lift ring-1 ring-black/[0.05] [--r:2deg] [animation-delay:-3s]">
          <span className="grid size-8 place-items-center rounded-xl bg-panel-mint">
            <BadgeCheck className="size-4 text-brand" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Live on Greenhouse</span>
            <span className="block text-xs text-muted-foreground">Checked a minute ago</span>
          </span>
        </div>
      </motion.div>
      <motion.div {...pop(1.6)} className="absolute bottom-2 left-4">
        <div className="flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white shadow-lift">
          <Sparkles className="size-3.5 text-brand-soft" /> 3 links: skills · seniority · location
        </div>
      </motion.div>
    </div>
  );
}
