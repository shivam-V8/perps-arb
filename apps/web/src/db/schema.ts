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
