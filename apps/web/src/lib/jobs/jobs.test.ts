import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeLinkedInProfile } from "@/lib/linkedin-url";
import type { CandidateProfile } from "@/lib/types";
import { detectBoard, htmlToText, parseAshby, parseGreenhouse, parseLever, parseSmartRecruiters, parseWorkable, type FeedPosting } from "./ats";
import { discoverBoards, mergeJobs, postingKey, reconcile } from "./pipeline";
import { prefilter, scorePosting } from "./relevance";

/** Fixtures are trimmed copies of real public feed responses (Nov 2026). */
const fx = (name: string) => JSON.parse(readFileSync(path.join(__dirname, "__fixtures__", `${name}.json`), "utf8"));

describe("detectBoard", () => {
  it.each([
    ["https://boards.greenhouse.io/stripe/jobs/123456", { ats: "greenhouse", token: "stripe" }],
    ["https://job-boards.greenhouse.io/acme", { ats: "greenhouse", token: "acme" }],
    ["https://boards.greenhouse.io/embed/job_board?for=acme", { ats: "greenhouse", token: "acme" }],
    ["https://jobs.lever.co/palantir/0a1b2c3d-1111-2222-3333-444455556666", { ats: "lever", token: "palantir" }],
    ["https://jobs.ashbyhq.com/openai", { ats: "ashby", token: "openai" }],
    ["https://apply.workable.com/huggingface/j/81B46579FE/", { ats: "workable", token: "huggingface" }],
    ["https://jobs.smartrecruiters.com/BoschGroup/744000163666820", { ats: "smartrecruiters", token: "BoschGroup" }],
  ])("%s", (url, expected) => {
    expect(detectBoard(url)).toEqual(expected);
  });

  it.each(["https://www.linkedin.com/jobs/view/1", "https://stripe.com/jobs", "javascript:alert(1)", "not a url", "https://jobs.lever.co/bad%20token!"])(
    "rejects %s",
    (url) => expect(detectBoard(url)).toBeNull(),
  );
});

describe("feed parsers (real response shapes)", () => {
  const check = (posts: FeedPosting[]) => {
    expect(posts.length).toBeGreaterThan(0);
    for (const p of posts) {
      expect(p.title).toBeTruthy();
      expect(p.url).toMatch(/^https:\/\//);
      expect(["remote", "hybrid", "onsite", "unknown"]).toContain(p.remote);
    }
  };
  it("greenhouse", () => {
    const p = parseGreenhouse(fx("greenhouse"), "fallback");
    check(p);
    expect(p[0].company).not.toBe("fallback"); // uses company_name from the feed
    expect(p[0].description).not.toMatch(/<|&lt;/); // HTML stripped
  });
  it("lever", () => check(parseLever(fx("lever"), "Palantir")));
  it("ashby: explicit workplace type wins over isRemote", () => {
    const p = parseAshby(fx("ashby"), "OpenAI");
    check(p);
    expect(p[0].remote).toBe("hybrid");
    expect(p[0].salary).toMatch(/\$/);
  });
  it("workable", () => {
    const p = parseWorkable(fx("workable"), "x");
    check(p);
    expect(p[0].remote).toBe("remote");
  });
  it("smartrecruiters builds public posting URLs", () => {
    const p = parseSmartRecruiters(fx("smartrecruiters"), "x", "BoschGroup");
    check(p);
    expect(p[0].url).toMatch(/^https:\/\/jobs\.smartrecruiters\.com\/BoschGroup\/\d+$/);
  });
  it("tolerates junk input", () => {
    expect(parseGreenhouse(null, "x")).toEqual([]);
    expect(parseLever({ nope: 1 }, "x")).toEqual([]);
  });
  it("htmlToText decodes and strips", () => {
    expect(htmlToText("&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;<script>x()</script>")).toBe("Hello & welcome");
  });
});

describe("postingKey", () => {
  it.each([
    ["https://stripe.com/jobs/search?gh_jid=8172510", "8172510"],
    ["https://boards.greenhouse.io/stripe/jobs/8172510", "8172510"],
    ["https://jobs.lever.co/palantir/0A1B2C3D-1111-2222-3333-444455556666/apply", "0a1b2c3d-1111-2222-3333-444455556666"],
    ["https://apply.workable.com/j/81B46579FE", "81B46579FE"],
  ])("%s", (url, key) => expect(postingKey(url)).toBe(key));
});

const job = (url: string, over: Partial<{ company: string; score: number }> = {}) => ({
  title: "Nurse",
  company: over.company ?? "Acme",
  company_domain: "acme.com",
  location: "",
  remote: "onsite" as const,
  url,
  source: "",
  posted: "",
  salary: null,
  summary: "",
  score: over.score ?? 80,
  reasons: [],
});

describe("reconcile", () => {
  const board = { ats: "greenhouse" as const, token: "acme", company: "Acme" };
  const feedPost = (id: string): FeedPosting => ({
    title: "ICU Nurse",
    company: "Acme",
    location: "",
    remote: "onsite",
    url: `https://acme.com/careers?gh_jid=${id}`,
    posted: "",
    salary: null,
    description: "",
    ats: "greenhouse",
  });

  it("verifies open postings, drops closed ones, keeps unknown boards, pools the rest", () => {
    const web = [
      job("https://boards.greenhouse.io/acme/jobs/1110001"), // open
      job("https://boards.greenhouse.io/acme/jobs/9990009"), // closed
      job("https://careers.other.com/jobs/5"), // no ATS feed: kept unverified
    ];
    const { kept, dropped, pool } = reconcile(web, [{ board, postings: [feedPost("1110001"), feedPost("2220002")] }]);
    expect(dropped).toBe(1);
    expect(kept.map((k) => [k.url, k.verified])).toEqual([
      ["https://boards.greenhouse.io/acme/jobs/1110001", true],
      ["https://careers.other.com/jobs/5", false],
    ]);
    expect(pool.map((p) => p.url)).toEqual(["https://acme.com/careers?gh_jid=2220002"]);
    // the reported company domain is kept (for the logo), under the app's field name
    expect(kept[0]).toMatchObject({ companyDomain: "acme.com" });
    expect(kept[0]).not.toHaveProperty("company_domain");
  });

  it("keeps web results when the board fetch failed", () => {
    const { kept, dropped } = reconcile([job("https://boards.greenhouse.io/acme/jobs/9990009")], [{ board, postings: null }]);
    expect(dropped).toBe(0);
    expect(kept[0].verified).toBe(false);
  });

  it("discovers boards from jobs, companies and cache without duplicates", () => {
    const boards = discoverBoards(
      {
        jobs: [{ ...job("https://boards.greenhouse.io/acme/jobs/1"), remote: "onsite" }],
        companies: [{ name: "Beta", domain: "", why: "", url: "https://jobs.lever.co/beta" }, { name: "Acme", domain: "acme.com", why: "", url: "https://job-boards.greenhouse.io/ACME" }],
      },
      [{ ats: "ashby", token: "gamma", company: "Gamma" }],
    );
    expect(boards.map((b) => `${b.ats}:${b.token}`)).toEqual(["greenhouse:acme", "lever:beta", "ashby:gamma"]);
  });

  it("merges by url and ranks by score with a small boost for verified", () => {
    const a = [{ ...job("https://x/1", { score: 90 }), verified: false }];
    const b = [{ ...job("https://x/2", { score: 88 }), verified: true }, { ...job("https://x/1", { score: 70 }), verified: true }];
    expect(mergeJobs(a, b).map((j) => j.url)).toEqual(["https://x/2", "https://x/1"]);
  });
});

describe("relevance prefilter", () => {
  const nurse: CandidateProfile = {
    full_name: "",
    email: "",
    headline: "ICU Registered Nurse",
    summary: "",
    fields: ["healthcare"],
    skills: ["Critical care", "CCRN"],
    experience: [],
    education: [],
    location: "Austin, USA",
    remote_pref: "onsite",
    seniority: "senior",
    salary_min: null,
    salary_currency: "USD",
    visible_to_recruiters: false,
  };
  const post = (title: string, location = ""): FeedPosting => ({
    title,
    company: "",
    location,
    remote: "onsite",
    url: "https://x",
    posted: "",
    salary: null,
    description: "",
    ats: "greenhouse",
  });

  it("ranks matching titles first and drops unrelated ones", () => {
    const out = prefilter([post("Software Engineer"), post("Registered Nurse, ICU", "Austin, TX"), post("Critical Care Nurse")], nurse);
    expect(out.map((p) => p.title)).toEqual(["Registered Nurse, ICU", "Critical Care Nurse"]);
  });
  it("penalises far-off seniority", () => {
    expect(scorePosting(post("Nurse Intern"), nurse)).toBeLessThan(scorePosting(post("Senior ICU Nurse"), nurse));
  });
});

describe("normalizeLinkedInProfile", () => {
  it.each([
    ["linkedin.com/in/jane-doe", "https://www.linkedin.com/in/jane-doe"],
    ["https://www.linkedin.com/in/jane-doe/?trk=x", "https://www.linkedin.com/in/jane-doe"],
    ["https://in.linkedin.com/in/ravi-menon-123", "https://www.linkedin.com/in/ravi-menon-123"],
  ])("%s", (input, url) => expect(normalizeLinkedInProfile(input)?.url).toBe(url));

  it.each([
    "https://www.linkedin.com/company/acme",
    "https://www.linkedin.com/jobs/view/123",
    "https://evil.com/in/jane",
    "https://linkedin.com.evil.com/in/jane",
    "https://www.linkedin.com/in/",
    "javascript:alert(1)",
  ])("rejects %s", (input) => expect(normalizeLinkedInProfile(input)).toBeNull());
});

describe("nameFromSlug", () => {
  it.each([
    ["jane-doe", "Jane Doe"],
    ["shivam-kumar-4b2a19123", "Shivam Kumar"],
    ["maria-jose-garcia-lopez-12", "Maria Jose Garcia Lopez"],
    ["satyanadella", ""],
    ["jd2024", ""],
  ])("%s", async (slug, name) => {
    const { nameFromSlug } = await import("@/lib/linkedin-url");
    expect(nameFromSlug(slug)).toBe(name);
  });
});

describe("LinkedIn link forms all resolve to the same profile", () => {
  it.each([
    "https://linkedin.com/in/krshivamdev",
    "https://www.linkedin.com/in/krshivamdev/",
    "http://linkedin.com/in/krshivamdev",
    "linkedin.com/in/krshivamdev",
    "www.linkedin.com/in/krshivamdev?trk=public_profile",
    "https://in.linkedin.com/in/krshivamdev",
    "HTTPS://WWW.LINKEDIN.COM/in/krshivamdev",
    "  https://www.linkedin.com/in/krshivamdev  ",
  ])("%s", (input) => {
    expect(normalizeLinkedInProfile(input)).toEqual({ url: "https://www.linkedin.com/in/krshivamdev", slug: "krshivamdev" });
  });
});

describe("TtlCache", () => {
  it("expires entries and evicts the oldest when full", async () => {
    const { TtlCache } = await import("@/lib/ttl-cache");
    const c = new TtlCache<number>(1000, 2);
    c.set("a", 1, 0);
    expect(c.get("a", 999)).toBe(1);
    expect(c.get("a", 1000)).toBeUndefined();
    c.set("x", 1, 0);
    c.set("y", 2, 0);
    c.set("z", 3, 0); // evicts x
    expect([c.get("x", 1), c.get("y", 1), c.get("z", 1)]).toEqual([undefined, 2, 3]);
  });
});
