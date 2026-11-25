import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { explainFirecrawlError, fetchLinkedInProfile, FirecrawlError, firecrawlConfigured } from "./firecrawl";

/** fetch double: records the request and returns a canned response. */
function fake(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const URL_ = "https://www.linkedin.com/in/jane-doe";

describe("fetchLinkedInProfile", () => {
  beforeEach(() => {
    process.env.FIRECRAWL_API_KEY = "fc-test-key";
  });
  afterEach(() => {
    delete process.env.FIRECRAWL_API_KEY;
  });

  const PROFILE_MD =
    "# Jane Doe\n\n**ICU Nurse | Critical care**\n\n- **Location**: Austin, US\n\n## About\n\nCritical care nurse.\n\n## Experience\n\n### ICU Nurse at Lakeview\nMar 2021 - Present\n";

  it("scrapes only the canonical profile URL and returns the markdown", async () => {
    const { impl, calls } = fake(200, {
      success: true,
      data: { markdown: PROFILE_MD, metadata: { title: "Jane Doe", statusCode: 200, creditsUsed: 10 } },
    });
    const r = await fetchLinkedInProfile(URL_, { fetchImpl: impl });
    expect(r).toEqual({ markdown: PROFILE_MD, title: "Jane Doe", creditsCost: 10 });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.firecrawl.dev/v2/scrape");
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe("Bearer fc-test-key");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ url: URL_, formats: ["markdown"], onlyMainContent: true });
  });

  it.each([
    ["empty page", { markdown: "", metadata: { statusCode: 200 } }],
    ["error page", { markdown: PROFILE_MD, metadata: { statusCode: 404 } }],
    ["sign-in wall", { markdown: "Join LinkedIn to see Jane's full profile. Sign in to view. " + "x".repeat(200), metadata: { statusCode: 200 } }],
  ])("returns null for %s", async (_label, data) => {
    const { impl } = fake(200, { success: true, data });
    expect(await fetchLinkedInProfile(URL_, { fetchImpl: impl })).toBeNull();
  });

  it.each([
    [401, { success: false, error: "Unauthorized" }, /invalid/],
    [402, { success: false, code: "insufficient_credits", error: "Insufficient credits" }, /out of credits/],
    [403, { success: false, code: "THIRD_PARTY_DATA_TERMS_REQUIRED", error: "Accept terms" }, /accept the third-party data terms/],
    [403, { success: false, error: "Not enabled" }, /refused/],
    [429, { success: false, error: "Rate limit" }, /rate limit/],
  ])("HTTP %i → FirecrawlError with a clear reason", async (status, body, reason) => {
    const { impl } = fake(status, body);
    const err = await fetchLinkedInProfile(URL_, { fetchImpl: impl }).catch((e) => e);
    expect(err).toBeInstanceOf(FirecrawlError);
    expect(explainFirecrawlError(err)).toMatch(reason);
  });

  it("treats success:false with HTTP 200 as an error", async () => {
    const { impl } = fake(200, { success: false, error: "request_unresolved" });
    await expect(fetchLinkedInProfile(URL_, { fetchImpl: impl })).rejects.toBeInstanceOf(FirecrawlError);
  });

  it("maps timeouts", async () => {
    const impl = (async () => {
      throw Object.assign(new Error("timed out"), { name: "TimeoutError" });
    }) as unknown as typeof fetch;
    const err = await fetchLinkedInProfile(URL_, { fetchImpl: impl }).catch((e) => e);
    expect(err.code).toBe("timeout");
    expect(explainFirecrawlError(err)).toMatch(/timed out/);
  });

  it("is off without a key", async () => {
    delete process.env.FIRECRAWL_API_KEY;
    expect(firecrawlConfigured()).toBe(false);
    await expect(fetchLinkedInProfile(URL_)).rejects.toMatchObject({ code: "not_configured" });
  });
});
