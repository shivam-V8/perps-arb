import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, tokenFor } from "@/lib/session-token";
import { siteOrigin } from "@/server/auth";
import { attachEmail, consumeLoginToken, getOwnCandidate, setRole, userIdByEmail } from "@/server/data";
import { currentViewer } from "@/server/session";

/**
 * Magic-link landing. If the email has an account, this browser becomes that
 * account; otherwise the email is attached to the current browser identity.
 */
export async function GET(req: Request) {
  const origin = siteOrigin(req);
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const email = await consumeLoginToken(token);
  if (!email) return NextResponse.redirect(`${origin}/signin?error=expired`);

  const viewer = await currentViewer();
  let uid = await userIdByEmail(email);
  if (!uid) {
    if (!viewer) return NextResponse.redirect(`${origin}/signin?error=expired`);
    await setRole(viewer.id, "candidate");
    await attachEmail(viewer.id, email, true);
    uid = viewer.id;
  } else {
    await attachEmail(uid, email, true); // marks it verified
  }

  const next = (await getOwnCandidate(uid)) ? "/jobs" : "/onboarding";
  const res = NextResponse.redirect(`${origin}${next}`);
  res.cookies.set(SESSION_COOKIE, await tokenFor(uid), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
