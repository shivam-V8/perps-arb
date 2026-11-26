"use client";

import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Fades and rises into place the first time it scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "li" | "section";
}) {
  const reduce = useReducedMotion();
  const M = motion[as];
  if (reduce) return <M className={className}>{children}</M>;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

/**
 * A headline whose words go from blurred to sharp one after another as it
 * scrolls into view. `lines` render as separate lines; `accent` lines are emerald.
 */
export function BlurWords({
  lines,
  accent = [],
  accentClassName = "text-brand",
  className,
  as: Tag = "h2",
  immediate = false,
}: {
  lines: string[];
  accent?: number[];
  /** colour for the accent lines */
  accentClassName?: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
  /** animate on mount (hero) instead of on scroll */
  immediate?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const show = reduce || immediate || inView;
  let i = 0;
  return (
    <Tag ref={ref} className={cn("poster", className)}>
      {lines.map((line, li) => (
        <span key={li} className={cn("block", accent.includes(li) && accentClassName)}>
          {line.split(" ").map((word, wi) => {
            const n = i++;
            return (
              <motion.span
                key={wi}
                className="inline-block whitespace-pre"
                initial={reduce ? false : { opacity: 0, filter: "blur(14px)", y: 8 }}
                animate={show ? { opacity: 1, filter: "blur(0px)", y: 0 } : undefined}
                transition={{ duration: 0.75, delay: n * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                {word}
                {wi < line.split(" ").length - 1 ? " " : ""}
              </motion.span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}

/** Endless horizontal strip; content is duplicated so the loop is seamless. Pauses on hover. */
export function Marquee({
  children,
  className,
  seconds = 40,
  reverse = false,
  gap = 40,
}: {
  children: React.ReactNode;
  className?: string;
  seconds?: number;
  reverse?: boolean;
  /** px between items (also between the two copies, so the loop doesn't jump) */
  gap?: number;
}) {
  const half = { gap, paddingRight: gap };
  return (
    <div className={cn("group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]", className)}>
      <div
        className="flex w-max animate-marquee group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${seconds}s`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        <div className="flex shrink-0 items-center" style={half}>
          {children}
        </div>
        <div className="flex shrink-0 items-center" style={half} aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Counts up to `to` the first time it's seen. */
export function CountUp({ to, suffix = "", className, duration = 1.4 }: { to: number; suffix?: string; className?: string; duration?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, to, { duration, ease: "easeOut", onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, reduce, to, duration]);
  return (
    <span ref={ref} className={cn("tabular", className)}>
      {n}
      {suffix}
    </span>
  );
}

/** True once the element has scrolled into view (for mock-ups that play a little scene). */
export function useSeen<T extends Element>(margin = "0px 0px -20% 0px") {
  const ref = useRef<T>(null);
  const seen = useInView(ref, { once: true, margin: margin as `${number}px ${number}px ${number}px ${number}px` });
  return [ref, seen] as const;
}
