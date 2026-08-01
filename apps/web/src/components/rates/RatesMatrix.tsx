"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { fetchRates } from "@/lib/api";
import { estPer8h, estPerYear, fmtUsd } from "@/lib/format";
import {
  VENUE_IDS,
  VENUE_LABELS,
  type AssetRates,
  type RatesResponse,
  type VenueId,
} from "@/lib/types";
import { RateCell } from "./RateCell";
import { VenueHealthStrip } from "./VenueHealthStrip";

type SortKey = "asset" | "spread" | VenueId;

function rowSpread(row: AssetRates, liveVenues: Set<VenueId>): {
  spread: number | null;
  hi: VenueId | null;
  lo: VenueId | null;
} {
  let hi: VenueId | null = null;
  let lo: VenueId | null = null;
  for (const v of VENUE_IDS) {
    if (!liveVenues.has(v)) continue;
    const r = row.rates[v];
    if (!r) continue;
    if (hi === null || r.annualized_pct > row.rates[hi]!.annualized_pct) hi = v;
    if (lo === null || r.annualized_pct < row.rates[lo]!.annualized_pct) lo = v;
  }
  if (hi === null || lo === null || hi === lo) return { spread: null, hi: null, lo: null };
  return {
    spread: row.rates[hi]!.annualized_pct - row.rates[lo]!.annualized_pct,
    hi,
    lo,
  };
}

export function RatesMatrix({ initialData }: { initialData?: RatesResponse }) {
  const { data, isError } = useQuery({
    queryKey: ["rates"],
    queryFn: fetchRates,
    refetchInterval: 60_000,
    initialData,
  });

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("spread");
  const [sortDesc, setSortDesc] = useState(true);
  const [size, setSize] = useState(10_000);
  const [minVenues, setMinVenues] = useState(2);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const liveVenues = useMemo(
    () =>
      new Set<VenueId>(
        (data?.venues ?? []).filter((v) => v.status === "live").map((v) => v.venue),
      ),
    [data],
  );

  const staleVenues = useMemo(
    () =>
      new Set<VenueId>(
        (data?.venues ?? []).filter((v) => v.status !== "live").map((v) => v.venue),
      ),
    [data],
  );

  const p95 = useMemo(() => {
    const all = (data?.assets ?? [])
      .flatMap((a) => Object.values(a.rates).map((r) => Math.abs(r.annualized_pct)))
      .sort((a, b) => a - b);
    if (!all.length) return 0;
    return all[Math.min(all.length - 1, Math.floor(all.length * 0.95))];
  }, [data]);

  const rows = useMemo(() => {
    let list = data?.assets ?? [];
    if (minVenues > 1) {
      list = list.filter((a) => Object.keys(a.rates).length >= minVenues);
    }
    if (search) {
      const q = search.toUpperCase();
      list = list.filter((a) => a.asset.includes(q));
    }
    const withSpread = list.map((row) => ({ row, ...rowSpread(row, liveVenues) }));
    withSpread.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "asset") cmp = a.row.asset.localeCompare(b.row.asset);
      else if (sortKey === "spread") cmp = (a.spread ?? -Infinity) - (b.spread ?? -Infinity);
      else {
        cmp =
          (a.row.rates[sortKey]?.annualized_pct ?? -Infinity) -
          (b.row.rates[sortKey]?.annualized_pct ?? -Infinity);
      }
      return sortDesc ? -cmp : cmp;
    });
    return withSpread;
  }, [data, search, sortKey, sortDesc, liveVenues, minVenues]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  function arrow(key: SortKey) {
    if (sortKey !== key) return null;
    return <span className="text-[color:var(--accent)]">{sortDesc ? "↓" : "↑"}</span>;
  }

  if (isError && !data) {
    return (
      <div className="rounded-[var(--r-card)] border border-[color:var(--line)] bg-[color:var(--surface)] p-8 text-center text-[color:var(--ink-meta)]">
        Data feed unreachable. Retrying…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data && <VenueHealthStrip venues={data.venues} updatedAt={data.updated_at} />}

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search asset…"
          className="h-8 w-44 rounded-[var(--r-control)] border border-[color:var(--line)] bg-[color:var(--surface)] px-2.5 text-[12px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-muted)] focus:border-[color:var(--accent-line)] focus:outline-none"
        />
        <label className="flex items-center gap-2 text-[11px] text-[color:var(--ink-meta)]">
          Position size
          <span className="num flex h-8 items-center rounded-[var(--r-control)] border border-[color:var(--line)] bg-[color:var(--surface)] px-2.5 text-[12px] text-[color:var(--ink)]">
            $
            <input
              type="number"
              value={size}
              min={100}
              step={1000}
              onChange={(e) => setSize(Math.max(0, Number(e.target.value)))}
              className="num w-24 bg-transparent focus:outline-none"
            />
          </span>
        </label>
        <div className="flex overflow-hidden rounded-[var(--r-control)] border border-[color:var(--line)]">
          {[
            { label: "All", v: 1 },
            { label: "2+ venues", v: 2 },
            { label: "4+ venues", v: 4 },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setMinVenues(opt.v)}
              className="px-2.5 py-1.5 text-[11px]"
              style={
                minVenues === opt.v
                  ? { background: "var(--surface-3)", color: "var(--ink)" }
                  : { background: "var(--fill)", color: "var(--ink-meta)" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-[color:var(--ink-muted)]">
          {rows.length} assets · funding annualized · sorted by{" "}
          {sortKey === "spread" ? "cross-venue spread" : sortKey}
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={() => setScrolled((scrollRef.current?.scrollLeft ?? 0) > 2)}
        className="overflow-x-auto rounded-[var(--r-card)] border border-[color:var(--line)] bg-[color:var(--surface)]"
      >
        <table className="w-full border-collapse whitespace-nowrap">
          <thead>
            <tr className="sticky top-0 z-20 bg-[color:var(--surface-2)]">
              <th
                onClick={() => toggleSort("asset")}
                className={`th-label sticky left-0 z-30 cursor-pointer bg-[color:var(--surface-2)] px-3 py-2 text-left ${scrolled ? "pin-shadow" : ""}`}
              >
                Asset {arrow("asset")}
              </th>
              {VENUE_IDS.map((v) => (
                <th
                  key={v}
                  onClick={() => toggleSort(v)}
                  className="th-label cursor-pointer px-3 py-2 text-right"
                >
                  {VENUE_LABELS[v]} {arrow(v)}
                </th>
              ))}
              <th
                onClick={() => toggleSort("spread")}
                className="th-label cursor-pointer px-3 py-2 text-right"
              >
                Spread {arrow("spread")}
              </th>
              <th className="th-label px-3 py-2 text-right">Est/8h</th>
              <th className="th-label px-3 py-2 text-right">Est/yr</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, spread, hi, lo }) => (
              <tr
                key={row.asset}
                className="border-t border-[color:var(--line)] hover:bg-[color:var(--row-hover)]"
              >
                <td
                  className={`sticky left-0 z-10 bg-[color:var(--surface)] px-3 py-1.5 text-[12px] font-medium ${scrolled ? "pin-shadow" : ""}`}
                >
                  {row.asset}
                </td>
                {VENUE_IDS.map((v) => (
                  <RateCell
                    key={v}
                    entry={row.rates[v]}
                    stale={staleVenues.has(v)}
                    p95={p95}
                    spreadMark={spread !== null && spread >= 5 && (v === hi || v === lo)}
                  />
                ))}
                <td className="num px-3 py-1.5 text-right text-[12px]">
                  {spread === null ? (
                    <span className="text-[color:var(--ink-faint)]">—</span>
                  ) : (
                    <span
                      style={{
                        color: spread >= 5 ? "var(--accent)" : "var(--ink-muted)",
                      }}
                    >
                      {spread.toFixed(1)}%
                    </span>
                  )}
                </td>
                <td className="num px-3 py-1.5 text-right text-[12px] text-[color:var(--ink-muted)]">
                  {spread === null ? "—" : fmtUsd(estPer8h(size, spread))}
                </td>
                <td className="num px-3 py-1.5 text-right text-[12px] text-[color:var(--ink-muted)]">
                  {spread === null ? "—" : fmtUsd(estPerYear(size, spread))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-[color:var(--ink-muted)]">
        Rates are annualized from each venue&apos;s native funding interval. Binance rates
        are predicted next-interval values via Hyperliquid&apos;s feed. Stale venues are
        greyed out and excluded from spreads — never shown as live. Est columns assume
        your position size captures the full spread; fees and slippage not yet included.
      </p>
    </div>
  );
}
