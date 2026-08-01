import type { RatesResponse, SpreadsResponse } from "./types";

// Client-side fetchers hit the same-origin proxy routes.
export async function fetchRates(): Promise<RatesResponse> {
  const res = await fetch("/api/rates");
  if (!res.ok) throw new Error(`rates fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchSpreads(limit = 5): Promise<SpreadsResponse> {
  const res = await fetch(`/api/spreads?limit=${limit}`);
  if (!res.ok) throw new Error(`spreads fetch failed: ${res.status}`);
  return res.json();
}

// Server-side (RSC) fetchers hit the ingest service directly for initialData.
const INGEST = process.env.INGEST_API_URL ?? "http://localhost:8100";

export async function fetchRatesServer(): Promise<RatesResponse | null> {
  try {
    const res = await fetch(`${INGEST}/v1/rates`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchSpreadsServer(limit = 5): Promise<SpreadsResponse | null> {
  try {
    const res = await fetch(`${INGEST}/v1/spreads/top?limit=${limit}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
