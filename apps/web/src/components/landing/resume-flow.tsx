"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileText, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AvatarMark, toneFor } from "@/components/profile/avatar-mark";
import { MatchRing } from "@/components/profile/match-ring";

/**
 * Hero illustration: a résumé is read, skills are pulled out, matching jobs
 * appear. Cycles through very different professions to show it works for any field.
 * All people and companies are fictional.
 */
const PERSONAS = [
  {
    name: "Maria Santos",
    role: "ICU Registered Nurse",
    lines: ["RN, BSN — 6 yrs critical care", "Charge nurse, 24-bed ICU", "CCRN · ACLS · Epic"],
    skills: ["Critical care", "CCRN", "Ventilator mgmt", "Epic EHR"],
    jobs: [
      { t: "ICU Nurse (Nights)", c: "Lakeside Medical Center", s: 94 },
      { t: "Critical Care RN", c: "Northgate Health", s: 89 },
      { t: "Charge Nurse, ICU", c: "St. Aldric Hospital", s: 83 },
    ],
  },
  {
    name: "Daniel Okoro",
    role: "Data Analyst",
    lines: ["4 yrs analytics, retail & fintech", "Built churn dashboard for 2M users", "SQL · Python · Looker"],
    skills: ["SQL", "Python", "Looker", "A/B testing"],
    jobs: [
      { t: "Senior Data Analyst", c: "Brightcart", s: 92 },
      { t: "Product Analyst", c: "Finlo", s: 88 },
      { t: "Analytics Engineer", c: "Parcelwise", s: 79 },
    ],
  },
  {
    name: "Hannah Kim",
    role: "B2B Sales Lead",
    lines: ["7 yrs SaaS sales, $1.2M quota", "Built SDR team from 0 → 6", "Salesforce · MEDDICC"],
    skills: ["Enterprise sales", "Team lead", "Salesforce", "Negotiation"],
    jobs: [
      { t: "Head of Sales", c: "Ledgerly", s: 91 },
      { t: "Enterprise AE", c: "Corvid Systems", s: 87 },
      { t: "Sales Manager", c: "Plantly", s: 80 },
    ],
  },
];

export function ResumeFlow() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % PERSONAS.length), 5200);
    return () => clearInterval(t);
  }, []);
  const p = PERSONAS[i];

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <AnimatePresence mode="wait">
        <motion.div key={p.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          {/* résumé */}
          <motion.div
            initial={{ y: 12, rotate: -3 }}
            animate={{ y: 0, rotate: -3 }}
            className="relative w-[62%] rounded-2xl border border-black/[0.06] bg-white p-4 shadow-soft"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="size-3.5" /> résumé.pdf
            </div>
            <p className="mt-3 font-display text-lg leading-tight font-semibold">{p.name}</p>
            <p className="text-xs text-foreground/60">{p.role}</p>
            <ul className="mt-3 space-y-1.5">
              {p.lines.map((l, k) => (
                <motion.li
                  key={l}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + k * 0.12 }}
                  className="text-xs text-foreground/70"
                >
                  {l}
                </motion.li>
              ))}
            </ul>
            {/* scan line */}
            <motion.span
              className="pointer-events-none absolute inset-x-3 h-8 rounded-lg bg-brand/10"
              initial={{ top: 12 }}
              animate={{ top: [12, 120, 12] }}
              transition={{ duration: 1.6, ease: "easeInOut" }}
            />
          </motion.div>

          {/* extracted skills */}
          <div className="relative z-10 -mt-3 ml-[34%] flex w-[66%] flex-wrap gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[0.7rem] font-medium text-background">
              <Sparkles className="size-3" /> read by AI
            </span>
            {p.skills.map((s, k) => (
              <motion.span
                key={s}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + k * 0.1 }}
                className="rounded-full bg-brand-wash px-2.5 py-1 text-[0.7rem] font-medium text-brand ring-1 ring-brand-line"
              >
                {s}
              </motion.span>
            ))}
          </div>

          {/* matches */}
          <ul className="mt-4 ml-auto w-[86%] space-y-2">
            {p.jobs.map((j, k) => (
              <motion.li
                key={j.t}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 + k * 0.15 }}
                className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-3 shadow-soft"
              >
                <AvatarMark name={j.c} tone={toneFor(j.c)} size="sm" square />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{j.t}</p>
                  <p className="truncate text-xs text-muted-foreground">{j.c}</p>
                </div>
                <MatchRing score={j.s} size={40} />
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
      <div className="mt-4 flex justify-center gap-1.5">
        {PERSONAS.map((x, k) => (
          <button
            key={x.name}
            type="button"
            aria-label={`Show ${x.role}`}
            onClick={() => setI(k)}
            className={k === i ? "h-1.5 w-5 rounded-full bg-brand transition-all" : "h-1.5 w-1.5 rounded-full bg-black/15 transition-all"}
          />
        ))}
      </div>
    </div>
  );
}
