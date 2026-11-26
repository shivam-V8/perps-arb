import { describe, expect, it } from "vitest";
import { canonicalRedirect } from "./canonical-host";

const SITE = "https://chainmatch.ai";

describe("canonicalRedirect", () => {
  it("sends www, workers.dev and plain HTTP to https://chainmatch.ai, keeping path and query", () => {
    expect(canonicalRedirect("https://www.chainmatch.ai/pricing?x=1", SITE)).toBe("https://chainmatch.ai/pricing?x=1");
    expect(canonicalRedirect("https://chainmatch.krshivam2505.workers.dev/jobs", SITE)).toBe("https://chainmatch.ai/jobs");
    expect(canonicalRedirect("http://chainmatch.ai/", SITE)).toBe("https://chainmatch.ai/");
    expect(canonicalRedirect("https://chainmatch.ai/", SITE, "http")).toBe("https://chainmatch.ai/");
    expect(canonicalRedirect("http://www.chainmatch.ai/auth/verify?token=abc", SITE)).toBe("https://chainmatch.ai/auth/verify?token=abc");
  });

  it("serves the canonical host as is", () => {
    expect(canonicalRedirect("https://chainmatch.ai/jobs?paid=pack", SITE)).toBeNull();
    expect(canonicalRedirect("https://chainmatch.ai/", SITE, "https")).toBeNull();
  });

  it("never redirects machine endpoints, local dev, or without a site URL", () => {
    expect(canonicalRedirect("https://www.chainmatch.ai/api/billing/webhook", SITE)).toBeNull();
    expect(canonicalRedirect("http://chainmatch.krshivam2505.workers.dev/api/cron/digest", SITE)).toBeNull();
    expect(canonicalRedirect("http://localhost:3123/jobs", SITE)).toBeNull();
    expect(canonicalRedirect("https://www.chainmatch.ai/", undefined)).toBeNull();
    expect(canonicalRedirect("not a url", SITE)).toBeNull();
  });
});
