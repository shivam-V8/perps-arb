/**
 * LinkedIn profile via Firecrawl's scrape endpoint. Firecrawl routes linkedin.com/in
 * URLs to its profile-data providers and returns the profile as markdown (name,
 * headline, location, about, experience, education…). Verified live 2026-11-25:
 * 200 in ~4 s, 10 credits. (The `alexandria` people/match route had no record for
 * the same profile, so the plain URL route is used.)
 *
 *   POST https://api.firecrawl.dev/v2/scrape
 *   { url: "https://www.linkedin.com/in/<slug>", formats: ["markdown"] }
 *   → { success, data: { markdown, metadata: { title, statusCode, creditsUsed, … } } }
 */

const ENDPOINT = "https://api.firecrawl.dev/v2/scrape";

export class FirecrawlError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function firecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

export interface ProviderProfile {
  /** the profile as markdown */
  markdown: string;
  title: string;
  creditsCost: number | null;
}

/** Plain-English reason for operator-side failures (logged, never shown raw to users). */
export function explainFirecrawlError(e: FirecrawlError): string {
  if (e.status === 401) return "FIRECRAWL_API_KEY is invalid";
  if (e.status === 402) return "Firecrawl account is out of credits";
  if (e.status === 403 && /THIRD_PARTY_DATA_TERMS_REQUIRED/i.test(e.code + e.message))
    return "a Firecrawl org admin must accept the third-party data terms (see the accept_terms link in the Firecrawl dashboard)";
  if (e.status === 403) return "Firecrawl refused the request (LinkedIn/provider data not enabled for this team, or zero-data-retention is on)";
  if (e.status === 429) return "Firecrawl rate limit hit";
  if (e.status === 408 || e.code === "timeout") return "Firecrawl timed out";
  return `Firecrawl error ${e.status} ${e.code}`;
}

/**
 * Look up one LinkedIn profile. `canonicalUrl` must already be normalized
 * (https://www.linkedin.com/in/<slug>). Returns null when no profile came back; throws FirecrawlError otherwise.
 */
export async function fetchLinkedInProfile(
  canonicalUrl: string,
  { fetchImpl = fetch, timeoutMs = 45_000 }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<ProviderProfile | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new FirecrawlError(0, "not_configured", "FIRECRAWL_API_KEY is not set");

  let res: Response;
  try {
    res = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ url: canonicalUrl, formats: ["markdown"], onlyMainContent: true }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new FirecrawlError(0, timedOut ? "timeout" : "network", e instanceof Error ? e.message : String(e));
  }

  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !body || body.success === false) {
    const code = String(body?.code ?? body?.error ?? res.statusText ?? "error");
    throw new FirecrawlError(res.status, code, String(body?.error ?? body?.message ?? `HTTP ${res.status}`));
  }

  const data = (body.data ?? {}) as Record<string, unknown>;
  const meta = (data.metadata ?? {}) as Record<string, unknown>;
  const markdown = typeof data.markdown === "string" ? data.markdown : "";
  const status = typeof meta.statusCode === "number" ? meta.statusCode : 200;
  // no usable profile: empty page, an error page, or LinkedIn's sign-in wall
  if (status >= 400 || markdown.trim().length < 120 || /\b(authwall|sign in to view|join linkedin)\b/i.test(markdown.slice(0, 600))) return null;
  return {
    markdown: markdown.slice(0, 60_000),
    title: typeof meta.title === "string" ? meta.title : "",
    creditsCost: typeof meta.creditsUsed === "number" ? meta.creditsUsed : typeof body.creditsCost === "number" ? body.creditsCost : null,
  };
}
