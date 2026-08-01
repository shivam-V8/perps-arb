"use client";

// Internal daily-post cockpit (noindex): pulls top spreads, renders post text +
// OG card preview + copy buttons for manual daily X posting. Automation later.

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchSpreads } from "@/lib/api";
import { cardQuery, label } from "@/lib/og";
import type { Spread } from "@/lib/types";

function postText(s: Spread, siteUrl: string): string {
  return (
    `${s.asset} funding spread right now: ` +
    `${s.short_apy >= 0 ? "+" : ""}${s.short_apy.toFixed(1)}% APY on ${label(s.short_venue)} vs ` +
    `${s.long_apy >= 0 ? "+" : ""}${s.long_apy.toFixed(1)}% on ${label(s.long_venue)} ` +
    `= ${s.spread_apy.toFixed(1)}% net, delta-neutral.\n\n` +
    `Live table → ${siteUrl}/s?${cardQuery({
      asset: s.asset,
      venueA: s.short_venue,
      venueB: s.long_venue,
      apy: s.spread_apy,
    })}`
  );
}

function CopyButton({ text, children }: { text: string; children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-[var(--r-control)] border border-[color:var(--line-strong)] bg-[color:var(--fill)] px-2.5 py-1 text-[11px] text-[color:var(--ink)] hover:bg-[color:var(--surface-3)]"
    >
      {copied ? "copied ✓" : children}
    </button>
  );
}

export default function ShareCockpit() {
  const { data } = useQuery({
    queryKey: ["spreads", 5],
    queryFn: () => fetchSpreads(5),
    refetchInterval: 60_000,
  });
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <main className="mx-auto max-w-[760px] px-4 py-8">
      <h1 className="mb-1 text-[20px] font-semibold tracking-tight">Daily post cockpit</h1>
      <p className="mb-6 text-[12px] text-[color:var(--ink-meta)]">
        Internal. Copy text, save card, post. The /s link unfurls the card on X.
      </p>
      <div className="flex flex-col gap-6">
        {(data?.spreads ?? []).map((s) => {
          const q = cardQuery({
            asset: s.asset,
            venueA: s.short_venue,
            venueB: s.long_venue,
            apy: s.spread_apy,
          });
          const text = postText(s, siteUrl);
          return (
            <div
              key={s.asset}
              className="rounded-[var(--r-card)] border border-[color:var(--line)] bg-[color:var(--surface)] p-4"
            >
              <pre className="mb-3 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[color:var(--ink)]">
                {text}
              </pre>
              <div className="mb-3 flex gap-2">
                <CopyButton text={text}>copy post</CopyButton>
                <CopyButton text={`${siteUrl}/s?${q}`}>copy /s link</CopyButton>
                <CopyButton text={`${siteUrl}/api/og?${q}`}>copy card URL</CopyButton>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/og?${q}`}
                alt={`${s.asset} spread card`}
                className="w-full max-w-[480px] rounded-[var(--r-card)] border border-[color:var(--line)]"
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
