import type { Metadata } from "next";
import Link from "next/link";
import { RatesMatrix } from "@/components/rates/RatesMatrix";
import { fetchRatesServer } from "@/lib/api";

export const metadata: Metadata = {
  title: "Live funding rates",
  description:
    "Live annualized funding rates across Hyperliquid, Binance, Bybit, Lighter, Paradex and Aster — with cross-venue spreads highlighted.",
};

export const dynamic = "force-dynamic";

export default async function RatesPage() {
  const initialData = await fetchRatesServer();

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <Link href="/" className="text-[13px] font-semibold tracking-tight">
            chain<span className="text-[color:var(--accent)]">match</span>
          </Link>
          <h1 className="mt-1 text-[20px] font-semibold tracking-tight">
            Live funding rates
          </h1>
        </div>
        <Link
          href="/#waitlist"
          className="rounded-[var(--r-control)] bg-[color:var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--accent-ink)] hover:bg-[color:var(--accent-strong)]"
        >
          Get matched →
        </Link>
      </div>
      <RatesMatrix initialData={initialData ?? undefined} />
    </main>
  );
}
