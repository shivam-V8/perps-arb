import Link from "next/link";
import { TopSpreads } from "@/components/landing/TopSpreads";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import { fetchSpreadsServer } from "@/lib/api";

export const dynamic = "force-dynamic";

const PILLARS = [
  {
    tag: "SCAN",
    title: "Every venue, one matrix",
    body: "Funding on Hyperliquid, Binance, Bybit, Lighter, Paradex and Aster — normalized from each venue's native interval to honest annualized rates, refreshed every 60 seconds.",
  },
  {
    tag: "MATCH",
    title: "Ranked market-neutral spreads",
    body: "Short the venue paying you the most, long the venue paying the least. We rank every cross-venue pair by net spread with liquidity floors and stale-feed exclusion built in.",
  },
  {
    tag: "EXECUTE",
    title: "One-click, coming soon",
    body: "Open the matched delta-neutral position straight on Hyperliquid — both legs sized, fees shown in dollars, funding tracked live. That's what the waitlist is for.",
  },
];

const PIPELINE = ["FUNDING_FEED", "NORMALIZE", "ANNUALIZE", "SPREAD_RANK", "ALERT"];

export default async function Landing() {
  const spreads = await fetchSpreadsServer(5);
  const top = spreads?.spreads?.[0];

  return (
    <main>
      {/* nav */}
      <nav className="mx-auto flex max-w-[1100px] items-center justify-between px-4 py-4">
        <span className="text-[14px] font-semibold tracking-tight">
          chain<span className="text-[color:var(--accent)]">match</span>
        </span>
        <div className="flex items-center gap-4">
          <Link href="/rates" className="text-[12px] text-[color:var(--ink-meta)] hover:text-[color:var(--ink)]">
            Live rates
          </Link>
          <Link
            href="/rates"
            className="rounded-[var(--r-control)] bg-[color:var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--accent-ink)] hover:bg-[color:var(--accent-strong)]"
          >
            Open the table
          </Link>
        </div>
      </nav>

      {/* hero */}
      <section className="mx-auto max-w-[1100px] px-4 pb-10 pt-14">
        <h1
          className="max-w-[720px] font-semibold leading-[1.05] tracking-tight"
          style={{ fontSize: "clamp(2.25rem, 1rem + 4vw, 4.5rem)" }}
        >
          The best market-neutral yield in crypto,{" "}
          <span className="text-[color:var(--accent)]">right now</span>.
        </h1>
        <p className="mt-5 max-w-[560px] text-[15px] leading-relaxed text-[color:var(--ink-meta)]">
          ChainMatch scans funding rates across the major perp venues and matches you to
          the highest-paying delta-neutral spread —{" "}
          {top ? (
            <>
              like{" "}
              <span className="num font-medium text-[color:var(--ink)]">
                {top.asset} at {top.spread_apy.toFixed(1)}% APY
              </span>{" "}
              this minute.
            </>
          ) : (
            "updated every 60 seconds."
          )}{" "}
          One-click execution on Hyperliquid is coming.
        </p>
        <div className="mt-7" id="waitlist">
          <WaitlistForm />
        </div>
      </section>

      {/* live proof-of-data immediately below hero */}
      <section className="mx-auto max-w-[1100px] px-4 pb-14">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="th-label">Top cross-venue funding spreads — live</h2>
        </div>
        <TopSpreads initialData={spreads ?? undefined} />
      </section>

      {/* pillars */}
      <section className="mx-auto grid max-w-[1100px] gap-3 px-4 pb-14 md:grid-cols-3">
        {PILLARS.map((p) => (
          <div
            key={p.tag}
            className="rounded-[var(--r-card)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5"
          >
            <div className="num mb-2 text-[11px] text-[color:var(--accent)]">{p.tag}</div>
            <h3 className="mb-2 text-[14px] font-semibold">{p.title}</h3>
            <p className="text-[12px] leading-relaxed text-[color:var(--ink-meta)]">{p.body}</p>
          </div>
        ))}
      </section>

      {/* methodology teaser + pipeline diagram */}
      <section className="mx-auto max-w-[1100px] px-4 pb-14">
        <div className="rounded-[var(--r-panel)] border border-[color:var(--line)] bg-[color:var(--surface)] p-6">
          <h2 className="th-label mb-4">How the matcher works</h2>
          <div className="num flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--ink)]">
            {PIPELINE.map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-[var(--r-pill)] border border-[color:var(--line-strong)] bg-[color:var(--surface-2)] px-2 py-1">
                  {step}
                </span>
                {i < PIPELINE.length - 1 && (
                  <span className="text-[color:var(--ink-muted)]">→</span>
                )}
              </span>
            ))}
          </div>
          <p className="mt-4 max-w-[720px] text-[12px] leading-relaxed text-[color:var(--ink-meta)]">
            Every venue quotes funding on its own interval — Hyperliquid hourly, most CEXs
            every 8 hours, some assets every 4. We read each venue&apos;s interval from its
            own metadata and annualize honestly: rate × (24 / interval) × 365. Feeds that
            go stale for more than 3 minutes are marked degraded and excluded from spread
            ranking — never shown as live. Binance rates come via Hyperliquid&apos;s
            predicted-funding feed. Full methodology page coming with the matcher.
          </p>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-[color:var(--line)]">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[11px] text-[color:var(--ink-muted)]">
          <span>
            chain<span className="text-[color:var(--accent)]">match</span> · data +
            execution tooling, not financial advice
          </span>
          <span className="num">
            hyperliquid · binance · bybit · lighter · paradex · aster
          </span>
        </div>
      </footer>
    </main>
  );
}
