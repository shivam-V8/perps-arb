import { NextResponse } from "next/server";
import { verifyPurposeToken } from "@/lib/session-token";
import { siteOrigin } from "@/server/auth";
import { setDigestEnabled } from "@/server/data";

async function unsubscribe(req: Request) {
  const id = await verifyPurposeToken("unsubscribe", new URL(req.url).searchParams.get("t"));
  if (id) await setDigestEnabled(id, false);
  return id;
}

/** Link in the email: turn the digest off, then show the profile (where it can be turned back on). */
export async function GET(req: Request) {
  const id = await unsubscribe(req);
  return NextResponse.redirect(`${siteOrigin(req)}/unsubscribed${id ? "" : "?error=1"}`);
}

/** One-click unsubscribe from the mail client (RFC 8058). */
export async function POST(req: Request) {
  const id = await unsubscribe(req);
  return NextResponse.json({ ok: Boolean(id) }, { status: id ? 200 : 400 });
}
