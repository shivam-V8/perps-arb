"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { BadgeCheck, Briefcase, Gauge, MapPin, UserRound, Wrench } from "lucide-react";
import { useRef, useState } from "react";
import { BlurWords } from "@/components/motion";
import { cn } from "@/lib/utils";

const LINKS = [
  { icon: Wrench, title: "Skills", body: "What you've actually used, matched to what the posting asks for. Must-haves weigh more than nice-to-haves." },
  { icon: Gauge, title: "Seniority", body: "Your years and scope against the level they're hiring for, so you don't drown in roles that are too junior or out of reach." },
  { icon: MapPin, title: "Location", body: "Where you are, where you'd move, and whether the role is remote, hybrid or on-site." },
  { icon: BadgeCheck, title: "Still open", body: "Checked against the company's own job board (Greenhouse, Lever, Ashby, Workable, SmartRecruiters). Closed postings drop out." },
];

/** Dark centrepiece: a chain from you to a job whose links light up as the section scrolls by. */
export function ChainSection() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });
  const [lit, setLit] = useState(reduce ? LINKS.length : 0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    // links stay lit once reached (no flicker when scrolling back up)
    if (!reduce) setLit((prev) => Math.max(prev, Math.min(LINKS.length, Math.floor(v * (LINKS.length + 1)))));
  });

  return (
    <section id="chain" className="scroll-mt-24 px-3 py-6">
      <div ref={ref} className="relative overflow-hidden rounded-[36px] bg-ink px-5 py-20 text-white md:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(40%_50%_at_80%_20%,rgb(16_185_129/0.25),transparent_70%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-white/60 uppercase">Why it’s called ChainMatch</p>
            <BlurWords lines={["The chain,", "explained."]} accent={[1]} accentClassName="text-brand-soft" className="mt-4 text-[clamp(3rem,7vw,5.6rem)]" />
            <p className="mt-6 max-w-md text-lg text-white/65">
              A match isn’t a keyword hit. It’s a chain of links between you and the job, and every card shows you each one, so you know why
              it’s worth applying.
            </p>
            <ol className="mt-10 space-y-3">
              {LINKS.map((l, i) => (
                <li
                  key={l.title}
                  className={cn(
                    "flex gap-4 rounded-2xl p-4 transition-all duration-500",
                    i < lit ? "bg-white/[0.07] ring-1 ring-white/10" : "opacity-40",
                  )}
                >
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl transition-colors duration-500", i < lit ? "bg-brand text-white" : "bg-white/10")}>
                    <l.icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">
                      <span className="mr-2 text-white/40 tabular">0{i + 1}</span>
                      {l.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-white/60">{l.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* the chain */}
          <div className="relative flex items-center justify-center lg:sticky lg:top-24 lg:h-[560px]">
            <div className="flex flex-col items-center">
              <Node icon={UserRound} label="You" on />
              {LINKS.map((l, i) => (
                <div key={l.title} className="flex flex-col items-center">
                  <ChainLink on={i < lit} />
                  <Node icon={l.icon} label={l.title} on={i < lit} small />
                </div>
              ))}
              <ChainLink on={lit >= LINKS.length} />
              <motion.div
                animate={{ scale: lit >= LINKS.length ? 1 : 0.96, opacity: lit >= LINKS.length ? 1 : 0.5 }}
                className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-ink shadow-lift"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-panel-mint">
                  <Briefcase className="size-5 text-brand" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Senior Product Designer</span>
                  <span className="block text-xs text-muted-foreground">Orbit Pay · Remote</span>
                </span>
                <span className="poster ml-2 text-3xl text-brand">{lit >= LINKS.length ? "94%" : "··"}</span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Node({ icon: Icon, label, on, small = false }: { icon: React.ElementType; label: string; on: boolean; small?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-500",
        on ? "bg-brand text-white shadow-[0_0_30px_-6px_rgb(16_185_129/0.8)]" : "bg-white/10 text-white/50",
        small && "text-xs",
      )}
    >
      <Icon className={small ? "size-3.5" : "size-4"} />
      {label}
    </div>
  );
}

/** Two interlocking rings, emerald when the link holds. */
function ChainLink({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 20 40" className="my-1 h-9 w-5" aria-hidden fill="none">
      <rect x="3" y="2" width="14" height="20" rx="7" strokeWidth="2.5" className={cn("transition-colors duration-500", on ? "stroke-brand-soft" : "stroke-white/20")} />
      <rect x="3" y="18" width="14" height="20" rx="7" strokeWidth="2.5" className={cn("transition-colors duration-500", on ? "stroke-brand-soft" : "stroke-white/20")} />
    </svg>
  );
}
