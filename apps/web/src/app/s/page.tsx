import type { Metadata } from "next";
import Link from "next/link";
import { cardQuery, label, parseSpreadParams } from "@/lib/og";

// Share-target page: the URL that gets posted on X. Its og:image meta is what
// unfurls into the card; the page itself funnels visitors to /rates.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const p = parseSpreadParams(await searchParams);
  if (!p) return { title: "Funding spread" };
  const title = `${p.asset} funding spread: ${p.apy.toFixed(1)}% APY`;
  const description = `Short ${label(p.venueA)} / long ${label(p.venueB)} — live market-neutral funding spread on ChainMatch.`;
  const img = `/api/og?${cardQuery(p)}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [img] },
    twitter: { card: "summary_large_image", title, description, images: [img] },
  };
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const p = parseSpreadParams(await searchParams);

  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col items-start justify-center gap-6 px-4">
      <Link href="/" className="text-[14px] font-semibold tracking-tight">
        chain<span className="text-[color:var(--accent)]">match</span>
      </Link>
      {p ? (
        <>
          <h1 className="text-[28px] font-semibold tracking-tight">
            {p.asset} funding spread:{" "}
            <span className="num text-[color:var(--accent)]">{p.apy.toFixed(1)}% APY</span>
          </h1>
          <p className="text-[14px] leading-relaxed text-[color:var(--ink-meta)]">
            Short the perp on <span className="text-[color:var(--ink)]">{label(p.venueA)}</span>{" "}
            (receive high funding), long the same size on{" "}
            <span className="text-[color:var(--ink)]">{label(p.venueB)}</span>. Delta-neutral —
            you collect the spread, not the price move. Rates move every funding interval;
            this was live when posted.
          </p>
        </>
      ) : (
        <h1 className="text-[28px] font-semibold">Live cross-venue funding spreads</h1>
      )}
      <Link
        href="/rates"
        className="rounded-[var(--r-control)] bg-[color:var(--accent)] px-4 py-2 text-[13px] font-semibold text-[color:var(--accent-ink)] hover:bg-[color:var(--accent-strong)]"
      >
        See the live table →
      </Link>
    </main>
  );
}
