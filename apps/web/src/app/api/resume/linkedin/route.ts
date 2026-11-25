import { NextResponse } from "next/server";
import { aiEnabled } from "@/lib/ai/claude";
import { okUrl } from "@/lib/ai/job-search";
import { normalizeProviderProfile, researchLinkedIn } from "@/lib/ai/linkedin";
import { explainFirecrawlError, fetchLinkedInProfile, FirecrawlError, firecrawlConfigured } from "@/lib/linkedin/firecrawl";
import { nameFromSlug, normalizeLinkedInProfile } from "@/lib/linkedin-url";
import { TtlCache } from "@/lib/ttl-cache";
import { QUOTAS, quotaRetryAfterMins, refundQuota, takeQuota } from "@/server/data";
import { currentViewer } from "@/server/session";

export const maxDuration = 180;

type Found = { draft: Record<string, unknown>; sources: { url: string; title: string }[]; missing: string[]; via: "provider" | "search" };

/** Identical lookups that found nothing aren't re-run for 6 hours (saves quota and API spend). */
const notFound = new TtlCache<{ guessedName: string }>(6 * 60 * 60 * 1000);
/** Provider results are reused for an hour so a retry/back-and-forth isn't charged twice. */
const providerHits = new TtlCache<Found>(60 * 60 * 1000);

/**
 * LinkedIn profile URL → candidate draft (the user confirms it's their own profile).
 *  1. Firecrawl scrape of the profile URL (profile as text), when FIRECRAWL_API_KEY is set;
 *  2. otherwise / no match: public web research (search engines' copy of the profile, team pages, …);
 *  3. still nothing: the UI offers copy-paste and the LinkedIn data export.
 * The user reviews every field before anything is saved.
 */
export async function POST(req: Request) {
  const viewer = await currentViewer();
  if (viewer?.role !== "candidate") return NextResponse.json({ error: "Choose “I'm looking for a job” first." }, { status: 403 });
  if (!aiEnabled()) return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { url?: string; confirmOwn?: boolean; name?: string; hint?: string } | null;
  const profile = normalizeLinkedInProfile(body?.url ?? "");
  if (!profile) return NextResponse.json({ error: "Paste a LinkedIn profile link like linkedin.com/in/your-name." }, { status: 400 });
  if (body?.confirmOwn !== true) return NextResponse.json({ error: "Confirm this is your own profile." }, { status: 400 });
  const clean = (s: unknown) => (typeof s === "string" ? s.replace(/[\r\n<>]+/g, " ").trim().slice(0, 100) : "");
  const givenName = clean(body?.name);
  const hint = clean(body?.hint);
  const name = givenName || nameFromSlug(profile.slug);

  const hit = providerHits.get(profile.slug.toLowerCase());
  if (hit) return found(hit, profile.url, givenName);

  const cacheKey = [profile.slug.toLowerCase(), givenName.toLowerCase(), hint.toLowerCase()].join("|");
  if (notFound.get(cacheKey)) {
    return NextResponse.json({ matched: false, sources: [], linkedin_url: profile.url, askHints: !givenName || !hint, guessedName: name, cached: true });
  }

  const { limit, windowMins } = QUOTAS.linkedin;
  if (!(await takeQuota(viewer.id, "linkedin", limit, windowMins))) {
    const retryAfterMins = await quotaRetryAfterMins(viewer.id, "linkedin", windowMins);
    return NextResponse.json(
      { error: "rate_limited", retryAfterMins, limit },
      { status: 429, headers: { "retry-after": String(retryAfterMins * 60) } },
    );
  }

  // 1. LinkedIn profile data via Firecrawl
  if (firecrawlConfigured()) {
    try {
      const rec = await fetchLinkedInProfile(profile.url);
      if (rec) {
        console.log(`[linkedin] firecrawl returned profile "${rec.title}" (${rec.markdown.length} chars, credits: ${rec.creditsCost ?? "?"})`);
        const draft = await normalizeProviderProfile(rec.markdown, profile.url);
        if (draft && (draft.headline || draft.experience.length)) {
          const { sources, missing: _m, matched: _x, ...candidate } = draft;
          const result: Found = { draft: candidate, sources, missing: [], via: "provider" };
          providerHits.set(profile.slug.toLowerCase(), result);
          return found(result, profile.url, givenName);
        }
      } else {
        console.log("[linkedin] firecrawl: no profile content returned");
      }
    } catch (e) {
      // operator-side problem (credits, terms, key): log it and fall back to search
      if (e instanceof FirecrawlError) console.warn(`[linkedin] firecrawl unavailable: ${explainFirecrawlError(e)}`);
      else console.warn("[linkedin] firecrawl failed", e);
    }
  }

  // 2. Public web research
  const draft = await researchLinkedIn({ url: profile.url, slug: profile.slug, name, nameGiven: Boolean(givenName), hint });
  if (!draft) {
    await refundQuota(viewer.id, "linkedin"); // our failure, not the user's
    return NextResponse.json({ error: "Couldn't research that profile right now. Try again, or paste your profile below." }, { status: 502 });
  }

  const sources = draft.sources.filter((s) => okUrl(s.url)).slice(0, 10);
  // anything with an identified headline or role is worth showing, even if sparse
  const usable = draft.matched && (draft.headline || draft.experience.length > 0);
  if (!usable) {
    notFound.set(cacheKey, { guessedName: name });
    return NextResponse.json({ matched: false, sources, linkedin_url: profile.url, askHints: !givenName || !hint, guessedName: name });
  }
  const { sources: _s, missing, matched: _m, ...candidate } = draft;
  return found({ draft: candidate, sources, missing: missing.slice(0, 10), via: "search" }, profile.url, givenName);
}

function found(r: Found, url: string, givenName: string) {
  const draft = { ...r.draft };
  if (!draft.full_name && givenName) draft.full_name = givenName;
  return NextResponse.json({ matched: true, via: r.via, draft, sources: r.sources, missing: r.missing, linkedin_url: url });
}
