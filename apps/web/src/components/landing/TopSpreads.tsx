"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchSpreads } from "@/lib/api";
import { fmtPct, fmtUsd } from "@/lib/format";
import { VENUE_LABELS, type SpreadsResponse } from "@/lib/types";

export function TopSpreads({ initialData }: { initialData?: SpreadsResponse }) {
  const { data } = useQuery({
    queryKey: ["spreads", 5],
    queryFn: () => fetchSpreads(5),
    refetchInterval: 60_000,
    initialData,
  });

  if (!data?.spreads?.length) {
    return (
      <div className="rounded-[var(--r-card)] border border-[color:var(--line)] bg-[color:var(--surface)] p-6 text-center text-[12px] text-[color:var(--ink-muted)]">
        Loading live spreads…
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--r-card)] border border-[color:var(--line)] bg-[color:var(--surface)]">
      <table className="w-full border-collapse whitespace-nowrap">
        <thead>
          <tr className="bg-[color:var(--surface-2)]">
            <th className="th-label px-3 py-2 text-left">Asset</th>
            <th className="th-label px-3 py-2 text-left">Legs</th>
            <th className="th-label px-3 py-2 text-right">Short leg</th>
            <th className="th-label px-3 py-2 text-right">Long leg</th>
            <th className="th-label px-3 py-2 text-right">Net spread</th>
            <th className="th-label px-3 py-2 text-right">Min leg OI</th>
          </tr>
        </thead>
        <tbody>
          {data.spreads.map((s) => (
            <tr
              key={s.asset}
              className="border-t border-[color:var(--line)] hover:bg-[color:var(--row-hover)]"
            >
              <td className="px-3 py-2 text-[12px] font-semibold">{s.asset}</td>
              <td className="px-3 py-2 text-[11px]">
                <span
                  className="rounded-[var(--r-pill)] px-1.5 py-0.5 font-medium"
                  style={{ background: "#ffc8c8", color: "#b8001c" }}
                >
                  short {VENUE_LABELS[s.short_venue]}
                </span>{" "}
                <span
                  className="rounded-[var(--r-pill)] px-1.5 py-0.5 font-medium"
                  style={{ background: "#86ffcc", color: "#007239" }}
                >
                  long {VENUE_LABELS[s.long_venue]}
                </span>
              </td>
              <td
                className="num px-3 py-2 text-right text-[12px]"
                style={{ color: s.short_apy >= 0 ? "var(--pos)" : "var(--neg)" }}
              >
                {fmtPct(s.short_apy)}
              </td>
              <td
                className="num px-3 py-2 text-right text-[12px]"
                style={{ color: s.long_apy >= 0 ? "var(--pos)" : "var(--neg)" }}
              >
                {fmtPct(s.long_apy)}
              </td>
              <td className="num px-3 py-2 text-right text-[13px] font-medium" style={{ color: "var(--accent)" }}>
                {s.spread_apy.toFixed(1)}%
              </td>
              <td className="num px-3 py-2 text-right text-[12px] text-[color:var(--ink-muted)]">
                {s.min_leg_oi_usd != null ? fmtUsd(s.min_leg_oi_usd) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-[color:var(--line)] px-3 py-2 text-right">
        <Link href="/rates" className="text-[11px] text-[color:var(--accent)] hover:underline">
          Full matrix — all assets, all venues →
        </Link>
      </div>
    </div>
  );
}
