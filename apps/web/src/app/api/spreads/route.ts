import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const INGEST = process.env.INGEST_API_URL ?? "http://localhost:8100";

export async function GET(req: NextRequest) {
  const limit = Math.min(
    100,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 5),
  );
  try {
    const res = await fetch(`${INGEST}/v1/spreads/top?limit=${limit}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "upstream error" }, { status: 502 });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "ingest unreachable" }, { status: 502 });
  }
}
