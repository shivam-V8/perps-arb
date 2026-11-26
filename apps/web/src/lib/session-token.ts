/**
 * Anonymous browser identity: `<uuid>.<hmac>` in an http-only cookie.
 * Uses Web Crypto so it runs in both middleware (edge) and route handlers (node).
 */
export const SESSION_COOKIE = "cm_sid";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365;
/** Set by middleware after verifying the cookie; server code trusts only this. */
export const USER_ID_HEADER = "x-cm-user-id";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET (32+ chars) is required in production");
  return "dev-only-insecure-session-secret-change-me";
}

const enc = new TextEncoder();

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
  let bin = "";
  sig.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function issueToken(): Promise<{ id: string; token: string }> {
  const id = crypto.randomUUID();
  return { id, token: await tokenFor(id) };
}

/** Signed cookie value for an existing identity (used when signing in to an account). */
export async function tokenFor(id: string): Promise<string> {
  return `${id}.${await hmac(id)}`;
}

/**
 * A signed token for one purpose (e.g. "unsubscribe"). Different from the session
 * token, so a link in an email can never be used as a login cookie.
 */
export async function purposeToken(purpose: string, id: string): Promise<string> {
  return `${id}.${await hmac(`${purpose}:${id}`)}`;
}

export async function verifyPurposeToken(purpose: string, token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  const [id, sig] = token.split(".");
  if (!id || !sig || !UUID.test(id)) return null;
  const expected = await hmac(`${purpose}:${id}`);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? id : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Returns the user id if the token is genuine, else null. */
export async function verifyToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const [id, sig] = token.split(".");
  if (!id || !sig || !UUID.test(id)) return null;
  const expected = await hmac(id);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? id : null;
}
