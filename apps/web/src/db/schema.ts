import { sql } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import type { Experience } from "@/lib/types";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

/** One row per anonymous browser identity (cookie). Real accounts can attach here later. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  role: text("role", { enum: ["candidate", "recruiter"] }).notNull(),
  fullName: text("full_name").notNull().default(""),
  /** set when the user pays or signs in with a magic link; lower-cased */
  email: text("email").unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  /** this user's Stripe Customer, reused for every purchase */
  stripeCustomerId: text("stripe_customer_id").unique(),
  /** job unlocks bought in packs, not yet spent */
  unlockCredits: integer("unlock_credits").notNull().default(0),
  digestEnabled: boolean("digest_enabled").notNull().default(true),
  lastDigestAt: timestamp("last_digest_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const candidates = pgTable(
  "candidates",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull().default(""),
    email: text("email").notNull().default(""),
    headline: text("headline").notNull().default(""),
    summary: text("summary").notNull().default(""),
    fields: text("fields").array().notNull().default(sql`'{}'::text[]`),
    skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
    experience: jsonb("experience").$type<Experience[]>().notNull().default([]),
    education: text("education").array().notNull().default(sql`'{}'::text[]`),
    location: text("location").notNull().default(""),
    remotePref: text("remote_pref").notNull().default("any"),
    seniority: text("seniority").notNull().default("mid"),
    salaryMin: integer("salary_min"),
    salaryCurrency: text("salary_currency").notNull().default("USD"),
    visibleToRecruiters: boolean("visible_to_recruiters").notNull().default(false),
    linkedinUrl: text("linkedin_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // full-text index lives in drizzle/0001_candidate_search.sql (needs an immutable helper function)
);

/** The uploaded résumé file, kept in Postgres so there's no separate file store to run. */
export const resumes = pgTable("resumes", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  data: bytea("data").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  recruiterId: uuid("recruiter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  company: text("company").notNull().default(""),
  description: text("description").notNull().default(""),
  fields: text("fields").array().notNull().default(sql`'{}'::text[]`),
  mustHave: text("must_have").array().notNull().default(sql`'{}'::text[]`),
  niceToHave: text("nice_to_have").array().notNull().default(sql`'{}'::text[]`),
  location: text("location").notNull().default(""),
  remote: text("remote").notNull().default("any"),
  seniority: text("seniority").notNull().default("mid"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.userId, { onDelete: "cascade" }),
    recruiterId: uuid("recruiter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["invited", "accepted", "declined"] }).notNull().default("invited"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("matches_role_candidate").on(t.roleId, t.candidateId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_match_idx").on(t.matchId, t.createdAt)],
);

export const jobResults = pgTable(
  "job_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.userId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    company: text("company").notNull(),
    companyDomain: text("company_domain"),
    location: text("location").notNull().default(""),
    remote: text("remote").notNull().default("unknown"),
    url: text("url").notNull(),
    source: text("source").notNull().default(""),
    posted: text("posted").notNull().default(""),
    salary: text("salary"),
    summary: text("summary").notNull().default(""),
    score: integer("score").notNull().default(0),
    reasons: text("reasons").array().notNull().default(sql`'{}'::text[]`),
    decision: text("decision", { enum: ["like", "pass"] }),
    /** true when the posting was read from (or confirmed in) the company's live ATS feed */
    verified: boolean("verified").notNull().default(false),
    ats: text("ats"),
    /** visible without Pro: free top picks of a search, or unlocked with a credit */
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    unlockVia: text("unlock_via", { enum: ["free", "credit"] }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("job_results_candidate_url").on(t.candidateId, t.url)],
);

export const companyLeads = pgTable(
  "company_leads",
  {
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.userId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    domain: text("domain"),
    why: text("why").notNull().default(""),
    url: text("url").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.candidateId, t.name] })],
);

export const candidateSwipes = pgTable(
  "candidate_swipes",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.userId, { onDelete: "cascade" }),
    decision: text("decision", { enum: ["like", "pass"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.candidateId] })],
);

/** Shared cache of companies' public ATS boards, discovered from job/careers URLs. */
export const companyBoards = pgTable(
  "company_boards",
  {
    ats: text("ats").notNull(),
    token: text("token").notNull(),
    company: text("company").notNull().default(""),
    lastOkAt: timestamp("last_ok_at", { withTimezone: true }),
    lastError: text("last_error"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.ats, t.token] }), index("company_boards_company_idx").on(t.company)],
);

/** One row per costly action (AI lookups, searches), for per-identity quotas. */
export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("usage_events_lookup_idx").on(t.userId, t.kind, t.at)],
);

/* ── billing, accounts, email ─────────────────────────────────────── */

/** Stripe subscription state per user (Pro), kept in sync by the webhook. */
export const subscriptions = pgTable("subscriptions", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  status: text("status").notNull(),
  priceId: text("price_id").notNull().default(""),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row per paid unlock pack, so a refund or dispute can take its credits back. */
export const packPurchases = pgTable("pack_purchases", {
  paymentIntentId: text("payment_intent_id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  credits: integer("credits").notNull(),
  reversedAt: timestamp("reversed_at", { withTimezone: true }),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

/** Stripe webhook events already applied (webhooks can be delivered more than once). */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

/** One-time sign-in links (only the SHA-256 of the token is stored). */
export const loginTokens = pgTable(
  "login_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_tokens_email_idx").on(t.email, t.createdAt)],
);

/** Postings already emailed to a user, so a digest never repeats a job. */
export const digestSent = pgTable(
  "digest_sent",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.url] })],
);

export type ResumeFix = { section: string; issue: string; fix: string; example: string };

/** Latest résumé review per candidate; `profileKey` changes when the profile does. */
export const resumeReviews = pgTable("resume_reviews", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  profileKey: text("profile_key").notNull(),
  fixes: jsonb("fixes").$type<ResumeFix[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
