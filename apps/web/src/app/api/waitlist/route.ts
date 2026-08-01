import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PER_HOUR_PER_IP = 5;

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  let body: { email?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Honeypot: bots fill it, humans can't see it. Fake success wastes their time.
  if (body.website) return NextResponse.json({ ok: true });

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const db = supabase();
  if (!db) {
    // Not configured (local dev without Supabase) — accept and log.
    console.warn("waitlist: SUPABASE_URL not configured, dropping signup", email);
    return NextResponse.json({ ok: true });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256")
    .update(ip + (process.env.WAITLIST_SALT ?? ""))
    .digest("hex");

  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db
    .from("waitlist_signups")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gt("created_at", oneHourAgo);
  if ((count ?? 0) >= MAX_PER_HOUR_PER_IP) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  // Idempotent: duplicate email returns the same success (no enumeration).
  const { error } = await db
    .from("waitlist_signups")
    .upsert(
      { email, source: "landing", ip_hash: ipHash },
      { onConflict: "email", ignoreDuplicates: true },
    );
  if (error) {
    console.error("waitlist insert failed", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
