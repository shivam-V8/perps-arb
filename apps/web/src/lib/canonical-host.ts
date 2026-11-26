/**
 * One public address for the site: https://chainmatch.ai. Requests on www, the
 * workers.dev preview host, or plain HTTP are sent there with a permanent redirect
 * (same path and query). Paths that machines call directly are never redirected.
 */
const NEVER_REDIRECT = ["/api/billing/webhook", "/api/cron/"];

/**
 * Returns the URL to redirect to, or null to serve the request as is.
 * `canonical` is the site URL (NEXT_PUBLIC_SITE_URL); without it (local dev) nothing redirects.
 */
export function canonicalRedirect(requestUrl: string, canonical: string | undefined, forwardedProto?: string | null): string | null {
  if (!canonical) return null;
  let want: URL;
  let got: URL;
  try {
    want = new URL(canonical);
    got = new URL(requestUrl);
  } catch {
    return null;
  }
  if (NEVER_REDIRECT.some((p) => got.pathname.startsWith(p))) return null;
  // local development: never redirect localhost-style hosts
  if (["localhost", "127.0.0.1", "[::1]"].includes(got.hostname) || got.hostname.endsWith(".localhost")) return null;

  const proto = (forwardedProto?.split(",")[0].trim() || got.protocol.replace(":", "")).toLowerCase();
  const rightHost = got.host === want.host;
  const rightProto = proto === want.protocol.replace(":", "");
  if (rightHost && rightProto) return null;
  return `${want.protocol}//${want.host}${got.pathname}${got.search}`;
}
