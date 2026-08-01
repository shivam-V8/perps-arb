"use client";

import { memo, useEffect, useRef, useState } from "react";
import { fmtPct } from "@/lib/format";
import type { RateEntry } from "@/lib/types";

// Sign dead zone: |APR| below this renders neutral (prevents confetti).
const DEAD_ZONE_PCT = 2;

interface Props {
  entry: RateEntry | undefined;
  stale: boolean;
  /** p95 of |annualized| across the table, for the magnitude alpha ramp */
  p95: number;
  /** part of the row's top cross-venue spread pair */
  spreadMark: boolean;
}

function magnitudeAlpha(absApr: number, p95: number): number {
  if (p95 <= 0) return 0.03;
  return 0.03 + 0.17 * Math.sqrt(Math.min(absApr, p95) / p95);
}

export const RateCell = memo(function RateCell({ entry, stale, p95, spreadMark }: Props) {
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState<"pos" | "neg" | null>(null);

  const value = entry?.annualized_pct ?? null;

  useEffect(() => {
    if (value === null) return;
    if (prev.current !== null && prev.current !== value) {
      setFlash(value > prev.current ? "pos" : "neg");
      const t = setTimeout(() => setFlash(null), 650);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);

  if (value === null) {
    return <td className="num px-3 py-1.5 text-right text-[color:var(--ink-faint)]">—</td>;
  }

  const abs = Math.abs(value);
  const neutral = abs < DEAD_ZONE_PCT;
  const color = stale
    ? "var(--ink-faint)"
    : neutral
      ? "var(--neutral)"
      : value > 0
        ? "var(--pos)"
        : "var(--neg)";

  // Edge-bleed gradient: tint pools under the right-aligned numeral.
  const alpha = stale || neutral ? 0 : magnitudeAlpha(abs, p95);
  const tint = value > 0 ? `rgb(52 227 155 / ${alpha})` : `rgb(255 84 112 / ${alpha})`;
  const bg = alpha > 0 ? `linear-gradient(to left, ${tint} 0%, transparent 32%)` : undefined;

  return (
    <td
      className={`num px-3 py-1.5 text-right text-[12px] ${spreadMark ? "spread-mark" : ""} ${
        flash === "pos" ? "flash-pos" : flash === "neg" ? "flash-neg" : ""
      }`}
      style={{ color, backgroundImage: bg }}
      title={
        entry
          ? `raw ${entry.raw_rate} per ${entry.interval_hours}h${stale ? " · STALE" : ""}`
          : undefined
      }
    >
      {fmtPct(value)}
    </td>
  );
});
