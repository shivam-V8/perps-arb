import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb, schema as s } from "@/db";
import type { CandidateProfile } from "@/lib/types";
import * as data from "./data";

/**
 * The privacy model, tested against a real Postgres (TEST_DATABASE_URL,
 * default: the docker-compose db's `chainmatch_test` database).
 */

const R = "aaaaaaaa-0000-4000-8000-000000000001"; // recruiter
const R2 = "aaaaaaaa-0000-4000-8000-000000000009"; // another recruiter
const N = "aaaaaaaa-0000-4000-8000-000000000002"; // visible nurse
const H = "aaaaaaaa-0000-4000-8000-000000000003"; // hidden nurse
const X = "aaaaaaaa-0000-4000-8000-000000000004"; // unrelated visible accountant

const base: Omit<CandidateProfile, "resume_path" | "updated_at"> = {
  full_name: "",
  email: "",
  headline: "",
  summary: "",
  fields: [],
  skills: [],
  experience: [],
  education: [],
  location: "",
  remote_pref: "any",
  seniority: "mid",
  salary_min: null,
  salary_currency: "USD",
  visible_to_recruiters: false,
};

let roleId = "";

beforeAll(async () => {
  const db = getDb();
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.execute(sql`truncate users, candidates, resumes, roles, matches, messages, job_results, company_leads, candidate_swipes, company_boards, usage_events cascade`);

  await data.setRole(R, "recruiter");
  await data.setRole(R2, "recruiter");
  for (const id of [N, H, X]) await data.setRole(id, "candidate");
  await data.upsertCandidate(N, {
    ...base,
    full_name: "Nina Nurse",
    email: "nina@example.com",
    headline: "ICU Registered Nurse",
    summary: "Critical care nurse, CCRN.",
    fields: ["healthcare"],
    skills: ["Critical care", "CCRN"],
    experience: [{ title: "ICU Nurse", company: "Lakeside", start: "2019", end: "Present", highlights: ["secret highlight"] }],
    visible_to_recruiters: true,
  });
  await data.upsertCandidate(H, { ...base, full_name: "Hidden Hal", headline: "ICU Nurse", skills: ["CCRN"], fields: ["healthcare"] });
  await data.upsertCandidate(X, { ...base, full_name: "Xavier", headline: "Accountant", skills: ["IFRS"], fields: ["finance"], visible_to_recruiters: true });
  await data.saveResume(N, { filename: "cv.pdf", contentType: "application/pdf", data: Buffer.from("%PDF-1.4 test") });

  roleId = await data.createRole(R, {
    title: "ICU Nurse",
    company: "Clinic",
    description: "Nights",
    fields: ["healthcare"],
    must_have: ["CCRN", "critical care"],
    nice_to_have: [],
    location: "",
    remote: "onsite",
    seniority: "mid",
    salary_min: null,
    salary_max: null,
  });
});

describe("recruiter search", () => {
  it("returns only opted-in candidates, ranked, without identity", async () => {
    const rows = await data.searchCandidates(R, roleId);
    const ids = rows.map((r) => r.candidate_id);
    expect(ids[0]).toBe(N);
    expect(ids).not.toContain(H);
    const row = rows[0] as Record<string, unknown>;
    expect(row).not.toHaveProperty("full_name");
    expect(row).not.toHaveProperty("email");
    expect(JSON.stringify(row)).not.toContain("secret highlight");
  });

  it("refuses another recruiter's role", async () => {
    await expect(data.searchCandidates(R2, roleId)).rejects.toBeInstanceOf(data.Forbidden);
  });

  it("treats junk ids as not found", async () => {
    expect(await data.getOwnRole(R, "not-a-uuid")).toBeNull();
  });
});

describe("invites", () => {
  it("cannot invite a hidden candidate", async () => {
    await expect(data.swipeCandidate(R, roleId, H, "like")).rejects.toBeInstanceOf(data.Forbidden);
  });

  it("cannot invite for someone else's role", async () => {
    await expect(data.swipeCandidate(R2, roleId, N, "like")).rejects.toBeInstanceOf(data.Forbidden);
  });

  it("right swipe creates an invite and drops them from the deck", async () => {
    await data.swipeCandidate(R, roleId, N, "like");
    const invites = await data.listInvites(N);
    expect(invites).toHaveLength(1);
    expect((await data.searchCandidates(R, roleId)).map((r) => r.candidate_id)).not.toContain(N);
  });

  it("hides identity, résumé and chat until accepted", async () => {
    const [{ match }] = await data.listInvites(N);
    expect(await data.getConversation(R, match.id)).toBeNull();
    await expect(data.getResumeFor(R, N)).rejects.toBeInstanceOf(data.Forbidden);
    await expect(data.sendMessage(R, match.id, "hi")).rejects.toBeInstanceOf(data.Forbidden);
    expect(await data.listConversations(R, "recruiter")).toHaveLength(0);
  });

  it("only the invited candidate can accept", async () => {
    const [{ match }] = await data.listInvites(N);
    await expect(data.respondInvite(X, match.id, true)).rejects.toBeInstanceOf(data.Forbidden);
    await expect(data.respondInvite(R, match.id, true)).rejects.toBeInstanceOf(data.Forbidden);
    await data.respondInvite(N, match.id, true);
    // can't answer twice
    await expect(data.respondInvite(N, match.id, false)).rejects.toBeInstanceOf(data.Forbidden);
  });
});

describe("after acceptance", () => {
  it("the recruiter sees name, email and résumé; others still don't", async () => {
    const [c] = await data.listConversations(R, "recruiter");
    expect(c.candidate?.full_name).toBe("Nina Nurse");
    const convo = await data.getConversation(R, c.match.id);
    expect(convo?.candidate.email).toBe("nina@example.com");
    expect((await data.getResumeFor(R, N))?.filename).toBe("cv.pdf");
    await expect(data.getResumeFor(R2, N)).rejects.toBeInstanceOf(data.Forbidden);
    await expect(data.getResumeFor(R, X)).rejects.toBeInstanceOf(data.Forbidden);
    expect(await data.getConversation(R2, c.match.id)).toBeNull();
    expect(await data.getConversation(X, c.match.id)).toBeNull();
  });

  it("both sides can chat; outsiders can't read or post", async () => {
    const [c] = await data.listConversations(N, "candidate");
    await data.sendMessage(N, c.match.id, "Hello!");
    await data.sendMessage(R, c.match.id, "Hi Nina");
    expect((await data.listMessages(R, c.match.id)).map((m) => m.body)).toEqual(["Hello!", "Hi Nina"]);
    await expect(data.listMessages(X, c.match.id)).rejects.toBeInstanceOf(data.Forbidden);
    await expect(data.sendMessage(R2, c.match.id, "spoof")).rejects.toBeInstanceOf(data.Forbidden);
  });
});

describe("candidate-only data", () => {
  it("job results and saved jobs are per candidate", async () => {
    await data.replaceJobResults(N, [
      { title: "ICU RN", company: "A", location: "", remote: "onsite", url: "https://a.example/1", source: "a", posted: "", salary: null, summary: "", score: 90, reasons: [] },
    ], [{ name: "A Health", why: "ICU", url: "https://a.example/careers" }]);
    const [job] = await data.listJobs(N, "unreviewed");
    expect(await data.getOwnJob(X, job.id)).toBeNull();
    await data.decideJob(X, job.id, "like"); // someone else's job: no effect
    expect(await data.listJobs(N, "saved")).toHaveLength(0);
    await data.decideJob(N, job.id, "like");
    expect(await data.listJobs(N, "saved")).toHaveLength(1);
    // a fresh search keeps saved jobs
    await data.replaceJobResults(N, [], []);
    expect(await data.listJobs(N, "saved")).toHaveLength(1);
  });

  it("a candidate can read their own résumé", async () => {
    expect((await data.getResumeFor(N, N))?.contentType).toBe("application/pdf");
  });
});

describe("quotas", () => {
  it("allows up to the limit per identity and kind, then refuses", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => data.takeQuota(X, "test-kind", 3, 60)));
    expect(results.filter(Boolean)).toHaveLength(3); // concurrent requests can't slip past the limit
    expect(await data.takeQuota(X, "other-kind", 3, 60)).toBe(true);
    expect(await data.takeQuota(N, "test-kind", 3, 60)).toBe(true);
  });
});

describe("quota refunds, retry time and dev mode", () => {
  it("refunds the latest use and reports minutes until the next one", async () => {
    for (let i = 0; i < 2; i++) expect(await data.takeQuota(H, "refund-kind", 2, 60)).toBe(true);
    expect(await data.takeQuota(H, "refund-kind", 2, 60)).toBe(false);
    const mins = await data.quotaRetryAfterMins(H, "refund-kind", 60);
    expect(mins).toBeGreaterThan(55);
    expect(mins).toBeLessThanOrEqual(60);
    await data.refundQuota(H, "refund-kind");
    expect(await data.takeQuota(H, "refund-kind", 2, 60)).toBe(true);
  });

  it("doesn't limit outside production unless ENFORCE_QUOTAS=1", async () => {
    const prev = process.env.ENFORCE_QUOTAS;
    delete process.env.ENFORCE_QUOTAS;
    try {
      expect(data.quotasEnforced()).toBe(false);
      for (let i = 0; i < 5; i++) expect(await data.takeQuota(H, "dev-kind", 1, 60)).toBe(true);
    } finally {
      process.env.ENFORCE_QUOTAS = prev;
    }
  });
});

describe("board cache", () => {
  it("remembers working boards by company, ignores failing ones", async () => {
    await data.rememberBoards([
      { ats: "greenhouse", token: "acme", company: "Acme Health", ok: true },
      { ats: "lever", token: "broken", company: "Broken Co", ok: false, error: "HTTP 404" },
    ]);
    expect(await data.boardsForCompanies(["acme health", "Broken Co"])).toEqual([{ ats: "greenhouse", token: "acme", company: "Acme Health" }]);
  });
});

describe("session tokens", () => {
  it("rejects forged or tampered ids", async () => {
    const { issueToken, verifyToken } = await import("@/lib/session-token");
    const { id, token } = await issueToken();
    expect(await verifyToken(token)).toBe(id);
    expect(await verifyToken(`${N}.${token.split(".")[1]}`)).toBeNull();
    expect(await verifyToken(`${id}.forged`)).toBeNull();
    expect(await verifyToken(undefined)).toBeNull();
  });
});

void s;
