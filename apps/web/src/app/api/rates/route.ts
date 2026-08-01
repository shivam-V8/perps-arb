import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const INGEST = process.env.INGEST_API_URL ?? "http://localhost:8100";

export async function GET() {
  try {
    // 30s micro-cache on the upstream fetch absorbs traffic spikes while the
    // client polls every 60s. UI freshness comes from payload timestamps, so a
    // caching bug degrades to visibly-stale, never silently-wrong.
    const res = await fetch(`${INGEST}/v1/rates`, { next: { revalidate: 30 } });
    if (!res.ok) {
      return NextResponse.json({ error: "upstream error" }, { status: 502 });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "ingest unreachable" }, { status: 502 });
  }
}
