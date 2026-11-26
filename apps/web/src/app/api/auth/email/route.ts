import { NextResponse } from "next/server";
import { sendSignInLink, siteOrigin } from "@/server/auth";
import { normEmail, takeQuota, validEmail } from "@/server/data";
import { currentViewer } from "@/server/session";

/** Emails a sign-in link. Always answers the same way, so it can't be used to probe for accounts. */
export async function POST(req: Request) {
  const viewer = await currentViewer();
  if (!viewer) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? normEmail(body.email) : "";
  if (!validEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  // per-browser limit on top of the per-address one (a browser may not have a users row yet)
  if (viewer.role && !(await takeQuota(viewer.id, "signInLink", 10, 60))) {
    return NextResponse.json({ error: "Too many requests. Try again in a while." }, { status: 429 });
  }
  const r = await sendSignInLink(email, siteOrigin(req));
  if (r === "failed") return NextResponse.json({ error: "Couldn't send the email. Try again in a minute." }, { status: 502 });
  return NextResponse.json({ sent: true });
}
