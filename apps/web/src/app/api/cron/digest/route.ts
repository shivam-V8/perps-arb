import { NextResponse } from "next/server";
import { siteOrigin } from "@/server/auth";
import { digestDue } from "@/server/data";
import { sendDigest } from "@/server/digest";

export const maxDuration = 300;

/** Users handled per run (the cron fires hourly, so this spreads the weekly load). */
const PER_RUN = 3;

/** Weekly Pro digests. Called by the Worker's cron trigger with the shared CRON_SECRET. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const due = await digestDue(PER_RUN);
  const site = siteOrigin(req);
  const results: Record<string, string> = {};
  for (const u of due) {
    try {
      results[u.id] = await sendDigest(u, site);
    } catch (e) {
      console.error("[digest] failed", u.id, e);
      results[u.id] = "error";
    }
  }
  console.log("[digest]", JSON.stringify(results));
  return NextResponse.json({ processed: due.length, results });
}
