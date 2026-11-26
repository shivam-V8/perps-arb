"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export const FAQS = [
  {
    q: "Is ChainMatch free?",
    a: "Yes, to start. Every search shows your top 3 matches in full, and you get 2 searches a week. Pro ($10.99 a month or $79 a year) unlocks every match, daily searches, a weekly email with new jobs and cover notes, and all your résumé fixes. Or buy 5 unlocks for $4.99, no subscription.",
  },
  {
    q: "What kind of jobs does it find?",
    a: "Any field: nursing, finance, teaching, sales, engineering and more. We search the web and read companies' own job boards (Greenhouse, Lever, Ashby, Workable, SmartRecruiters), and drop postings that have closed.",
  },
  {
    q: "How does the LinkedIn import work?",
    a: "Paste your public LinkedIn URL and we read the public profile to fill in your experience, skills and education. If that's not possible, you can paste your profile text or upload a résumé or LinkedIn PDF instead. You can edit everything before saving.",
  },
  {
    q: "Will recruiters see my profile?",
    a: "Only if you switch it on. Even then they see your skills and experience, never your name, email or résumé file, unless you accept their invite.",
  },
  {
    q: "Can I cancel Pro anytime?",
    a: "Yes, from your profile in two clicks. You keep Pro until the end of the period you paid for and aren't charged again.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <ul className="space-y-2.5">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <li key={f.q} className={cn("rounded-2xl bg-white ring-1 transition-shadow", isOpen ? "shadow-soft ring-black/[0.08]" : "ring-black/[0.05]")}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`${base}-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-semibold focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              {f.q}
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-full bg-brand text-white transition-transform duration-300", isOpen && "rotate-45")}>
                <Plus className="size-4" strokeWidth={2.5} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`${base}-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-[0.95rem] leading-relaxed text-foreground/70">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
