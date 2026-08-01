"use client";

import { fmtAge } from "@/lib/format";
import { VENUE_LABELS, type VenueHealth } from "@/lib/types";

const DOT: Record<string, string> = {
  live: "var(--pos)",
  degraded: "var(--warn)",
  down: "var(--neg)",
};

export function VenueHealthStrip({
  venues,
  updatedAt,
}: {
  venues: VenueHealth[];
  updatedAt: number;
}) {
  const age = Date.now() / 1000 - updatedAt;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[color:var(--ink-meta)]">
      {venues.map((v) => (
        <span key={v.venue} className="inline-flex items-center gap-1.5">
          <span
            className={v.status === "live" ? "breathe" : ""}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: DOT[v.status] ?? "var(--neutral)",
              display: "inline-block",
            }}
          />
          {VENUE_LABELS[v.venue]}
          {v.status !== "live" && (
            <span className="text-[color:var(--warn)]">
              {v.status === "degraded" && v.age_s != null
                ? `stale ${fmtAge(v.age_s)}`
                : v.status}
            </span>
          )}
        </span>
      ))}
      <span className="num ml-auto">updated {fmtAge(age)}</span>
    </div>
  );
}
