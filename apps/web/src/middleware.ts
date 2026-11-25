import { NextResponse, type NextRequest } from "next/server";
import { issueToken, SESSION_COOKIE, SESSION_MAX_AGE, USER_ID_HEADER, verifyToken } from "@/lib/session-token";

/**
 * No login yet: every browser gets an anonymous, signed identity cookie on its
 * first visit. This is the only place the signature is checked; the verified id
 * is passed to server code in a request header that is always overwritten here,
 * so a client can't supply its own.
 */
export async function middleware(req: NextRequest) {
  let id = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  let fresh: string | null = null;
  if (!id) {
    const t = await issueToken();
    id = t.id;
    fresh = t.token;
  }

  const headers = new Headers(req.headers);
  headers.set(USER_ID_HEADER, id);
  const res = NextResponse.next({ request: { headers } });
  if (fresh) {
    res.cookies.set(SESSION_COOKIE, fresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
