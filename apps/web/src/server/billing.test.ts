import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type Stripe from "stripe";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb, schema as s } from "@/db";
import { purposeToken, tokenFor, verifyPurposeToken, verifyToken } from "@/lib/session-token";
import type { JobPosting } from "@/lib/types";
import { handleStripeEvent } from "./billing-events";
import * as data from "./data";
import { pickDigestJobs } from "./digest";

/** Paywall, unlocks, Stripe webhooks, sign-in links and digest selection, against a real Postgres. */

const U = "bbbbbbbb-0000-4000-8000-000000000001"; // free user
const P = "bbbbbbbb-0000-4000-8000-000000000002"; // will become Pro
const O = "bbbbbbbb-0000-4000-8000-000000000003"; // someone else

const job = (n: number, score: number): Omit<JobPosting, "id"> => ({
  title: `Job ${n}`,
  company: `Company ${n}`,
  companyDomain: null,
  location: "Berlin",
  remote: "remote",
  url: `https://example.com/jobs/${n}`,
  source: "example.com",
  posted: "",
  salary: null,
  summary: `About job ${n}`,
  score,
  reasons: [`reason ${n}`],
});

const ev = (type: string, object: unknown, id = `evt_${Math.random()}`) => ({ id, type, data: { object } }) as unknown as Stripe.Event;

const sub = (over: Partial<{ id: string; customer: string; status: string; end: number; cancel: boolean }> = {}) =>
  ({
    id: over.id ?? "sub_1",
    customer: over.customer ?? "cus_P",
    status: over.status ?? "active",
    cancel_at_period_end: over.cancel ?? false,
    items: { data: [{ current_period_end: over.end ?? Math.floor(Date.now() / 1000) + 30 * 86400, price: { id: "price_monthly" } }] },
  }) as unknown as Stripe.Subscription;

const noNetwork = { getSubscription: async () => sub() };

const cand = { full_name: "Pat", email: "", headline: "Engineer", summary: "", fields: [], skills: [], experience: [], education: [], location: "", remote_pref: "any", seniority: "mid", salary_min: null, salary_currency: "USD", visible_to_recruiters: false } as const;

beforeAll(async () => {
  await migrate(getDb(), { migrationsFolder: "./drizzle" });
});

beforeEach(async () => {
  const db = getDb();
  await db.execute(sql`truncate users, candidates, job_results, company_leads, usage_events, subscriptions, pack_purchases, stripe_events, login_tokens, digest_sent, resume_reviews cascade`);
  for (const id of [U, P, O]) {
    await data.setRole(id, "candidate");
    await data.upsertCandidate(id, { ...cand, fields: [], skills: [], experience: [], education: [] });
  }
});

describe("paywall", () => {
  it("a free user sees the top 3 of a search in full and the rest locked, with nothing to apply with", async () => {
    await data.replaceJobResults(U, [job(1, 90), job(2, 85), job(3, 80), job(4, 75), job(5, 70)], []);
    const jobs = await data.listJobs(U, "unreviewed");
    expect(jobs.map((j) => [j.title, Boolean(j.locked)])).toEqual([
      ["Job 1", false],
      ["Job 2", false],
      ["Job 3", false],
      ["Job 4", true],
      ["Job 5", true],
    ]);
    const locked = jobs.filter((j) => j.locked);
    for (const j of locked) {
      expect(j).toMatchObject({ company: "", url: "", summary: "", reasons: [], companyDomain: null });
      expect(j.score).toBeGreaterThan(0);
    }
    expect((await data.getOwnJob(U, locked[0].id))?.locked).toBe(true);
  });

  it("a new search keeps unlocked jobs and frees its own top 3", async () => {
    await data.replaceJobResults(U, [job(1, 90), job(2, 85), job(3, 80), job(4, 75)], []);
    await data.replaceJobResults(U, [job(10, 95), job(11, 60), job(12, 55), job(13, 50)], []);
    const jobs = await data.listJobs(U, "unreviewed");
    const open = jobs.filter((j) => !j.locked).map((j) => j.title).sort();
    expect(open).toEqual(["Job 1", "Job 10", "Job 11", "Job 12", "Job 2", "Job 3"].sort());
    expect(jobs.filter((j) => j.locked).map((j) => j.title)).toEqual(["Job 13"]); // old locked Job 4 replaced
  });

  it("saving a locked job is refused; passing is fine", async () => {
    await data.replaceJobResults(U, [job(1, 90), job(2, 85), job(3, 80), job(4, 75)], []);
    const locked = (await data.listJobs(U, "unreviewed")).find((j) => j.locked)!;
    expect(await data.decideJob(U, locked.id, "like")).toBe(false);
    expect(await data.decideJob(U, locked.id, "pass")).toBe(true);
  });

  it("unlocking spends a pack credit once, and only on your own job", async () => {
    await data.replaceJobResults(U, [job(1, 90), job(2, 85), job(3, 80), job(4, 75), job(5, 70)], []);
    await data.replaceJobResults(O, [job(1, 90), job(2, 85), job(3, 80), job(6, 75)], []);
    const [a, b] = (await data.listJobs(U, "unreviewed")).filter((j) => j.locked);
    const theirs = (await data.listJobs(O, "unreviewed")).find((j) => j.locked)!;

    expect(await data.unlockJob(U, a.id)).toBe("no_credits");
    expect(await data.grantPack(U, "pi_1", data.PACK_CREDITS)).toBe(true);
    expect(await data.unlockJob(U, theirs.id)).toBe("not_found");
    expect(await data.unlockJob(U, a.id)).toBe("unlocked");
    expect(await data.unlockJob(U, a.id)).toBe("already");
    expect((await data.getEntitlement(U)).credits).toBe(4);
    const opened = await data.getOwnJob(U, a.id);
    expect(opened?.locked).toBeFalsy();
    expect(opened?.company).toBe("Company 4");
    expect((await data.getOwnJob(U, b.id))?.locked).toBe(true);
  });

  it("Pro sees everything; a cancelled or lapsed subscription doesn't", async () => {
    await data.replaceJobResults(P, [job(1, 90), job(2, 85), job(3, 80), job(4, 75), job(5, 70)], []);
    await data.upsertSubscription({ userId: P, stripeCustomerId: "cus_P", stripeSubscriptionId: "sub_1", status: "active", priceId: "p", currentPeriodEnd: new Date(Date.now() + 86400e3), cancelAtPeriodEnd: false });
    expect((await data.listJobs(P, "unreviewed")).every((j) => !j.locked)).toBe(true);
    expect((await data.getEntitlement(P)).plan).toBe("pro");

    await data.updateSubscriptionById("sub_1", { status: "canceled" });
    expect(await data.isPro(P)).toBe(false);
    await data.updateSubscriptionById("sub_1", { status: "active", currentPeriodEnd: new Date(Date.now() - 1000) });
    expect(await data.isPro(P)).toBe(false);
  });
});

describe("before payments open", () => {
  it("nothing is locked while the paywall is off", async () => {
    await data.replaceJobResults(U, [job(1, 90), job(2, 85), job(3, 80), job(4, 75), job(5, 70)], []);
    process.env.BILLING_ENABLED = "0";
    try {
      expect((await data.listJobs(U, "unreviewed")).every((j) => !j.locked)).toBe(true);
    } finally {
      process.env.BILLING_ENABLED = "1";
    }
    expect((await data.listJobs(U, "unreviewed")).filter((j) => j.locked)).toHaveLength(2);
  });
});

describe("stripe webhooks", () => {
  it("subscription checkout makes the user Pro, links the customer and the email", async () => {
    await handleStripeEvent(
      ev("checkout.session.completed", {
        id: "cs_1",
        mode: "subscription",
        payment_status: "paid",
        client_reference_id: P,
        customer: "cus_P",
        subscription: "sub_1",
        customer_details: { email: "Pro@Example.com" },
      }),
      noNetwork,
    );
    expect(await data.isPro(P)).toBe(true);
    expect(await data.userByStripeCustomer("cus_P")).toBe(P);
    expect((await data.getEntitlement(P)).email).toBe("pro@example.com");
  });

  it("later subscription events are matched by customer; deletion ends Pro", async () => {
    await data.setStripeCustomer(P, "cus_P");
    await handleStripeEvent(ev("customer.subscription.updated", sub({ cancel: true })), noNetwork);
    expect((await data.getEntitlement(P))).toMatchObject({ plan: "pro", cancelAtPeriodEnd: true });
    await handleStripeEvent(ev("customer.subscription.deleted", sub({ status: "canceled" })), noNetwork);
    expect(await data.isPro(P)).toBe(false);
  });

  it("a paid pack adds 5 credits once; an unpaid session adds nothing; a refund takes them back", async () => {
    const pack = (over: object) => ({ id: "cs_2", mode: "payment", payment_status: "paid", client_reference_id: U, customer: "cus_U", payment_intent: "pi_9", metadata: { product: "pack" }, ...over });
    await handleStripeEvent(ev("checkout.session.completed", pack({ payment_status: "unpaid" })), noNetwork);
    expect((await data.getEntitlement(U)).credits).toBe(0);
    await handleStripeEvent(ev("checkout.session.async_payment_succeeded", pack({})), noNetwork);
    await handleStripeEvent(ev("checkout.session.completed", pack({})), noNetwork); // same payment again
    expect((await data.getEntitlement(U)).credits).toBe(5);

    await getDb().update(s.users).set({ unlockCredits: 2 }).where(eq(s.users.id, U)); // spent 3
    await handleStripeEvent(ev("charge.refunded", { id: "ch_1", payment_intent: "pi_9" }), noNetwork);
    expect((await data.getEntitlement(U)).credits).toBe(0); // never below zero
  });

  it("events are claimed once", async () => {
    expect(await data.claimStripeEvent("evt_x", "t")).toBe(true);
    expect(await data.claimStripeEvent("evt_x", "t")).toBe(false);
    await data.releaseStripeEvent("evt_x");
    expect(await data.claimStripeEvent("evt_x", "t")).toBe(true);
  });

  it("an email already on another account is never moved", async () => {
    expect(await data.attachEmail(O, "taken@example.com", true)).toBe(true);
    expect(await data.attachEmail(U, "TAKEN@example.com", false)).toBe(false);
    expect(await data.userIdByEmail("taken@example.com")).toBe(O);
  });
});

describe("sign-in links", () => {
  it("work once, and not after they expire", async () => {
    const t = await data.createLoginToken("Me@Example.com");
    expect(await data.consumeLoginToken(t)).toBe("me@example.com");
    expect(await data.consumeLoginToken(t)).toBeNull();

    const t2 = await data.createLoginToken("me@example.com");
    await getDb().update(s.loginTokens).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await data.consumeLoginToken(t2)).toBeNull();
    expect(await data.consumeLoginToken("nonsense")).toBeNull();
    expect(await data.recentLoginTokens("me@example.com")).toBe(2);
  });

  it("an unsubscribe token can't be used as a login cookie, and vice versa", async () => {
    const unsub = await purposeToken("unsubscribe", U);
    expect(await verifyPurposeToken("unsubscribe", unsub)).toBe(U);
    expect(await verifyToken(unsub)).toBeNull();
    expect(await verifyPurposeToken("unsubscribe", await tokenFor(U))).toBeNull();
  });
});

describe("weekly digest", () => {
  it("goes to Pro users with an email, a profile and the digest on, once a week", async () => {
    await data.attachEmail(P, "p@example.com", true);
    await data.attachEmail(U, "u@example.com", true);
    await data.upsertSubscription({ userId: P, stripeCustomerId: "cus_P", stripeSubscriptionId: "sub_1", status: "active", priceId: "p", currentPeriodEnd: null, cancelAtPeriodEnd: false });

    expect((await data.digestDue(10)).map((r) => r.id)).toEqual([P]);
    await data.markDigestSent(P, ["https://example.com/jobs/1"]);
    expect(await data.digestDue(10)).toEqual([]);
    await getDb().update(s.users).set({ lastDigestAt: new Date(Date.now() - 8 * 86400e3) }).where(eq(s.users.id, P));
    expect((await data.digestDue(10)).map((r) => r.id)).toEqual([P]);
    await data.setDigestEnabled(P, false);
    expect(await data.digestDue(10)).toEqual([]);
  });

  it("never repeats a job and never includes a locked one", async () => {
    const unsent = await data.unsentUrls(P, ["https://example.com/jobs/1", "https://example.com/jobs/2"]);
    expect([...unsent].sort()).toEqual(["https://example.com/jobs/1", "https://example.com/jobs/2"]);
    await data.markDigestSent(P, ["https://example.com/jobs/1"]);
    const left = await data.unsentUrls(P, ["https://example.com/jobs/1", "https://example.com/jobs/2"]);
    expect([...left]).toEqual(["https://example.com/jobs/2"]);

    const jobs = [
      { ...job(1, 99), id: "a" },
      { ...job(2, 80), id: "b" },
      { ...job(3, 95), id: "c", locked: true, url: "" },
    ] as JobPosting[];
    expect(pickDigestJobs(jobs, new Set(["https://example.com/jobs/2", "https://example.com/jobs/1"])).map((j) => j.id)).toEqual(["a", "b"]);
    expect(pickDigestJobs(jobs, left).map((j) => j.id)).toEqual(["b"]);
  });
});
