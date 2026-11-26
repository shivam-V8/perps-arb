import { and, asc, desc, eq, inArray, isNull, ne, notExists, or, sql } from "drizzle-orm";
import { cleanDomain } from "@/lib/company-logo";
import { getDb, schema as s } from "@/db";
import type { ResumeFix } from "@/db/schema";
import type {
  CandidateCardData,
  CandidateProfile,
  CompanyLead,
  Decision,
  Entitlement,
  Experience,
  FieldId,
  JobPosting,
  MatchRow,
  Message,
  RemotePref,
  Role,
  RoleOpening,
  Seniority,
} from "@/lib/types";

/**
 * All reads and writes go through here, and every function takes the acting
 * user's id. These checks are the privacy model:
 *  - candidates are invisible to recruiters unless they opt in;
 *  - recruiters see anonymous fields only, until the candidate accepts an invite;
 *  - only the invited candidate can accept; only participants of an accepted match can chat.
 */

export class Forbidden extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** ids from the client are untrusted; anything that isn't a uuid simply matches nothing */
const isId = (x: string) => UUID.test(x);

const db = () => getDb();

/* ── mappers (DB camelCase → app snake_case types) ─────────────────── */

type CandRow = typeof s.candidates.$inferSelect;
type RoleRow = typeof s.roles.$inferSelect;
type JobRow = typeof s.jobResults.$inferSelect;

function toCandidate(r: CandRow, hasResume: boolean): CandidateProfile {
  return {
    full_name: r.fullName,
    email: r.email,
    headline: r.headline,
    summary: r.summary,
    fields: r.fields as FieldId[],
    skills: r.skills,
    experience: r.experience,
    education: r.education,
    location: r.location,
    remote_pref: r.remotePref as RemotePref,
    seniority: r.seniority as Seniority,
    salary_min: r.salaryMin,
    salary_currency: r.salaryCurrency,
    visible_to_recruiters: r.visibleToRecruiters,
    resume_path: hasResume ? "stored" : null,
    linkedin_url: r.linkedinUrl,
    updated_at: r.updatedAt.toISOString(),
  };
}

function toRole(r: RoleRow): RoleOpening {
  return {
    id: r.id,
    recruiter_id: r.recruiterId,
    title: r.title,
    company: r.company,
    description: r.description,
    fields: r.fields as FieldId[],
    must_have: r.mustHave,
    nice_to_have: r.niceToHave,
    location: r.location,
    remote: r.remote as RemotePref,
    seniority: r.seniority as Seniority,
    salary_min: r.salaryMin,
    salary_max: r.salaryMax,
    created_at: r.createdAt.toISOString(),
  };
}

/** A job the viewer hasn't unlocked: enough to tempt (title, place, fit), nothing to apply with. */
function lockedJob(r: JobRow): JobPosting {
  return {
    id: r.id,
    title: r.title,
    company: "",
    companyDomain: null,
    location: r.location,
    remote: r.remote as JobPosting["remote"],
    url: "",
    source: "",
    posted: "",
    salary: null,
    summary: "",
    score: r.score,
    reasons: [],
    verified: false,
    ats: null,
    locked: true,
  };
}

function toJob(r: JobRow, visible = true): JobPosting {
  if (!visible) return lockedJob(r);
  return {
    id: r.id,
    title: r.title,
    company: r.company,
    companyDomain: r.companyDomain,
    location: r.location,
    remote: r.remote as JobPosting["remote"],
    url: r.url,
    source: r.source,
    posted: r.posted,
    salary: r.salary,
    summary: r.summary,
    score: r.score,
    reasons: r.reasons,
    verified: r.verified,
    ats: r.ats,
  };
}

function toMatch(r: typeof s.matches.$inferSelect): MatchRow {
  return {
    id: r.id,
    role_id: r.roleId,
    candidate_id: r.candidateId,
    recruiter_id: r.recruiterId,
    status: r.status,
    note: null,
    created_at: r.createdAt.toISOString(),
  };
}

function toMessage(r: typeof s.messages.$inferSelect): Message {
  return { id: r.id, match_id: r.matchId, sender_id: r.senderId, body: r.body, created_at: r.createdAt.toISOString() };
}

/* ── users ─────────────────────────────────────────────────────────── */

export async function setRole(uid: string, role: Role) {
  await db()
    .insert(s.users)
    .values({ id: uid, role })
    .onConflictDoNothing(); // role is fixed once chosen; a new browser identity can pick the other side
}

/* ── candidate profile + résumé ────────────────────────────────────── */

export async function getOwnCandidate(uid: string): Promise<CandidateProfile | null> {
  const [row] = await db().select().from(s.candidates).where(eq(s.candidates.userId, uid)).limit(1);
  if (!row) return null;
  const [r] = await db().select({ u: s.resumes.userId }).from(s.resumes).where(eq(s.resumes.userId, uid)).limit(1);
  return toCandidate(row, Boolean(r));
}

export async function upsertCandidate(uid: string, c: Omit<CandidateProfile, "resume_path" | "updated_at">) {
  const values = {
    userId: uid,
    fullName: c.full_name,
    email: c.email,
    headline: c.headline,
    summary: c.summary,
    fields: c.fields,
    skills: c.skills,
    experience: c.experience,
    education: c.education,
    location: c.location,
    remotePref: c.remote_pref,
    seniority: c.seniority,
    salaryMin: c.salary_min,
    salaryCurrency: c.salary_currency,
    visibleToRecruiters: c.visible_to_recruiters,
    ...(c.linkedin_url !== undefined ? { linkedinUrl: c.linkedin_url } : {}),
    updatedAt: new Date(),
  };
  await db().transaction(async (tx) => {
    await tx.update(s.users).set({ fullName: c.full_name }).where(eq(s.users.id, uid));
    await tx.insert(s.candidates).values(values).onConflictDoUpdate({ target: s.candidates.userId, set: values });
  });
}

export async function setVisibility(uid: string, visible: boolean) {
  await db().update(s.candidates).set({ visibleToRecruiters: visible }).where(eq(s.candidates.userId, uid));
}

export async function saveResume(uid: string, file: { filename: string; contentType: string; data: Buffer }) {
  await db()
    .insert(s.resumes)
    .values({ userId: uid, ...file })
    .onConflictDoUpdate({ target: s.resumes.userId, set: { ...file, uploadedAt: new Date() } });
}

/** The candidate themself, or a recruiter with an accepted match, may download the résumé. */
export async function getResumeFor(viewer: string, candidateId: string) {
  if (!isId(candidateId)) return null;
  if (viewer !== candidateId && !(await hasAcceptedMatch(viewer, candidateId))) throw new Forbidden();
  const [r] = await db().select().from(s.resumes).where(eq(s.resumes.userId, candidateId)).limit(1);
  return r ?? null;
}

async function hasAcceptedMatch(recruiterId: string, candidateId: string) {
  const [m] = await db()
    .select({ id: s.matches.id })
    .from(s.matches)
    .where(and(eq(s.matches.recruiterId, recruiterId), eq(s.matches.candidateId, candidateId), eq(s.matches.status, "accepted")))
    .limit(1);
  return Boolean(m);
}

/* ── live job results (candidate) ──────────────────────────────────── */

export async function listJobs(uid: string, which: "unreviewed" | "saved"): Promise<JobPosting[]> {
  const [rows, pro] = await Promise.all([
    db()
      .select()
      .from(s.jobResults)
      .where(and(eq(s.jobResults.candidateId, uid), which === "saved" ? eq(s.jobResults.decision, "like") : isNull(s.jobResults.decision)))
      .orderBy(desc(s.jobResults.score)),
    hasFullAccess(uid),
  ]);
  // unlocked first (best fit first within each group), so the free picks lead the deck
  const out = rows.map((r) => toJob(r, pro || r.unlockedAt !== null));
  return [...out.filter((j) => !j.locked), ...out.filter((j) => j.locked)];
}

export async function countJobs(uid: string) {
  const [r] = await db().select({ n: sql<number>`count(*)::int` }).from(s.jobResults).where(eq(s.jobResults.candidateId, uid));
  return r?.n ?? 0;
}

/** One of the viewer's jobs, redacted unless they can see it (Pro or unlocked). */
export async function getOwnJob(uid: string, jobId: string) {
  if (!isId(jobId)) return null;
  const [r] = await db().select().from(s.jobResults).where(and(eq(s.jobResults.id, jobId), eq(s.jobResults.candidateId, uid))).limit(1);
  if (!r) return null;
  return toJob(r, r.unlockedAt !== null || (await hasFullAccess(uid)));
}

/** Replaces unreviewed results with a fresh search; keeps anything saved or passed. */
export async function replaceJobResults(uid: string, jobs: Omit<JobPosting, "id">[], companies: CompanyLead[]) {
  await db().transaction(async (tx) => {
    // unreviewed results are replaced, but never ones the user unlocked (or got free)
    await tx.delete(s.jobResults).where(and(eq(s.jobResults.candidateId, uid), isNull(s.jobResults.decision), isNull(s.jobResults.unlockedAt)));
    if (jobs.length) {
      const inserted = await tx
        .insert(s.jobResults)
        .values(
          jobs.map(({ locked: _locked, saved: _saved, ...j }) => ({
            ...j,
            companyDomain: j.companyDomain ?? null,
            verified: j.verified ?? false,
            ats: j.ats ?? null,
            unlockedAt: null,
            unlockVia: null,
            candidateId: uid,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: s.jobResults.id, score: s.jobResults.score });
      // the best few new results of every search are free to see
      const free = inserted
        .sort((a, b) => b.score - a.score)
        .slice(0, FREE_PICKS_PER_SEARCH)
        .map((r) => r.id);
      if (free.length) await tx.update(s.jobResults).set({ unlockedAt: sql`now()`, unlockVia: "free" }).where(inArray(s.jobResults.id, free));
    }
    await tx.delete(s.companyLeads).where(eq(s.companyLeads.candidateId, uid));
    if (companies.length) {
      await tx
        .insert(s.companyLeads)
        .values(companies.map((c) => ({ name: c.name, why: c.why, url: c.url, domain: cleanDomain(c.domain), candidateId: uid })))
        .onConflictDoNothing();
    }
  });
}

export async function listCompanies(uid: string): Promise<CompanyLead[]> {
  return db().select({ name: s.companyLeads.name, domain: s.companyLeads.domain, why: s.companyLeads.why, url: s.companyLeads.url }).from(s.companyLeads).where(eq(s.companyLeads.candidateId, uid));
}

/** Saving needs the job unlocked (or Pro); passing is always allowed. Returns false if refused. */
export async function decideJob(uid: string, jobId: string, decision: Decision | null): Promise<boolean> {
  if (!isId(jobId)) return false;
  if (decision === "like") {
    const job = await getOwnJob(uid, jobId);
    if (!job || job.locked) return false;
  }
  await db().update(s.jobResults).set({ decision }).where(and(eq(s.jobResults.id, jobId), eq(s.jobResults.candidateId, uid)));
  return true;
}

/* ── recruiter roles ───────────────────────────────────────────────── */

export async function createRole(uid: string, r: Omit<RoleOpening, "id" | "recruiter_id" | "created_at">) {
  const [row] = await db()
    .insert(s.roles)
    .values({
      recruiterId: uid,
      title: r.title,
      company: r.company,
      description: r.description,
      fields: r.fields,
      mustHave: r.must_have,
      niceToHave: r.nice_to_have,
      location: r.location,
      remote: r.remote,
      seniority: r.seniority,
      salaryMin: r.salary_min,
      salaryMax: r.salary_max,
    })
    .returning({ id: s.roles.id });
  return row.id;
}

export async function listOwnRoles(uid: string) {
  const rows = await db().select().from(s.roles).where(eq(s.roles.recruiterId, uid)).orderBy(desc(s.roles.createdAt));
  const m = await db()
    .select({ roleId: s.matches.roleId, status: s.matches.status })
    .from(s.matches)
    .where(eq(s.matches.recruiterId, uid));
  return rows.map((r) => ({
    ...toRole(r),
    invited: m.filter((x) => x.roleId === r.id && x.status === "invited").length,
    accepted: m.filter((x) => x.roleId === r.id && x.status === "accepted").length,
  }));
}

export async function getOwnRole(uid: string, roleId: string) {
  if (!isId(roleId)) return null;
  const [r] = await db().select().from(s.roles).where(and(eq(s.roles.id, roleId), eq(s.roles.recruiterId, uid))).limit(1);
  return r ? toRole(r) : null;
}

/* ── candidate search (recruiter) ──────────────────────────────────── */

export type SearchRow = Omit<CandidateCardData, "score" | "reasons"> & { rank: number };

/**
 * Opted-in candidates for one of the recruiter's roles, anonymous fields only.
 * Excludes people already swiped or invited for this role.
 */
export async function searchCandidates(uid: string, roleId: string, limit = 40): Promise<SearchRow[]> {
  const role = await getOwnRole(uid, roleId);
  if (!role) throw new Forbidden();

  const text = [role.title, ...role.must_have, ...role.nice_to_have, role.description].join(" ");
  // same expression as the GIN index in drizzle/0001_candidate_search.sql, so the index is used
  const doc = sql`cm_candidate_doc(${s.candidates.headline}, ${s.candidates.summary}, ${s.candidates.skills})`;
  // OR every word of the role so partial overlaps still rank
  const query = sql`(select to_tsquery('english', string_agg(lexeme, ' | ')) from unnest(to_tsvector('english', ${text})))`;
  const fieldsOverlap = sql`${s.candidates.fields} && ${sql.param(role.fields)}::text[]`;
  const rank = sql<number>`coalesce(ts_rank(${doc}, ${query}), 0) + case when ${fieldsOverlap} then 0.2 else 0 end`;

  const rows = await db()
    .select({
      candidate_id: s.candidates.userId,
      headline: s.candidates.headline,
      summary: s.candidates.summary,
      fields: s.candidates.fields,
      skills: s.candidates.skills,
      experience: s.candidates.experience,
      seniority: s.candidates.seniority,
      location: s.candidates.location,
      remote_pref: s.candidates.remotePref,
      rank,
    })
    .from(s.candidates)
    .where(
      and(
        eq(s.candidates.visibleToRecruiters, true),
        ne(s.candidates.userId, uid),
        or(sql`${doc} @@ ${query}`, fieldsOverlap),
        notExists(
          db()
            .select({ x: sql`1` })
            .from(s.candidateSwipes)
            .where(and(eq(s.candidateSwipes.roleId, roleId), eq(s.candidateSwipes.candidateId, s.candidates.userId))),
        ),
        notExists(
          db()
            .select({ x: sql`1` })
            .from(s.matches)
            .where(and(eq(s.matches.roleId, roleId), eq(s.matches.candidateId, s.candidates.userId))),
        ),
      ),
    )
    .orderBy(desc(rank))
    .limit(Math.min(limit, 100));

  return rows.map((r) => ({
    ...r,
    fields: r.fields as FieldId[],
    seniority: r.seniority as Seniority,
    remote_pref: r.remote_pref as RemotePref,
    // job history without highlights: titles, companies, dates
    experience: (r.experience as Experience[]).map(({ title, company, start, end }) => ({ title, company, start, end })),
    rank: Number(r.rank),
  }));
}

/** Swipe on a candidate for a role. Right swipe sends an invite (candidate must be visible). */
export async function swipeCandidate(uid: string, roleId: string, candidateId: string, decision: Decision) {
  if (!isId(candidateId)) throw new Forbidden();
  if (!(await getOwnRole(uid, roleId))) throw new Forbidden();
  const [c] = await db()
    .select({ visible: s.candidates.visibleToRecruiters })
    .from(s.candidates)
    .where(eq(s.candidates.userId, candidateId))
    .limit(1);
  if (!c?.visible) throw new Forbidden();

  await db()
    .insert(s.candidateSwipes)
    .values({ roleId, candidateId, decision })
    .onConflictDoUpdate({ target: [s.candidateSwipes.roleId, s.candidateSwipes.candidateId], set: { decision } });
  if (decision === "like") {
    await db().insert(s.matches).values({ roleId, candidateId, recruiterId: uid }).onConflictDoNothing();
  }
}

/* ── invites, matches, messages ────────────────────────────────────── */

export async function listInvites(uid: string) {
  const rows = await db()
    .select({ m: s.matches, r: s.roles })
    .from(s.matches)
    .innerJoin(s.roles, eq(s.roles.id, s.matches.roleId))
    .where(and(eq(s.matches.candidateId, uid), eq(s.matches.status, "invited")))
    .orderBy(desc(s.matches.createdAt));
  return rows.map(({ m, r }) => ({ match: toMatch(m), role: toRole(r) }));
}

export async function countInvites(uid: string) {
  const [r] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(s.matches)
    .where(and(eq(s.matches.candidateId, uid), eq(s.matches.status, "invited")));
  return r?.n ?? 0;
}

/** Only the invited candidate can answer, and only while the invite is open. */
export async function respondInvite(uid: string, matchId: string, accept: boolean) {
  if (!isId(matchId)) throw new Forbidden();
  const res = await db()
    .update(s.matches)
    .set({ status: accept ? "accepted" : "declined" })
    .where(and(eq(s.matches.id, matchId), eq(s.matches.candidateId, uid), eq(s.matches.status, "invited")))
    .returning({ id: s.matches.id });
  if (res.length === 0) throw new Forbidden();
}

/** Accepted conversations for either side, with what each side is allowed to see. */
export async function listConversations(uid: string, role: Role) {
  const rows = await db()
    .select({ m: s.matches, r: s.roles, c: s.candidates })
    .from(s.matches)
    .innerJoin(s.roles, eq(s.roles.id, s.matches.roleId))
    .innerJoin(s.candidates, eq(s.candidates.userId, s.matches.candidateId))
    .where(and(eq(s.matches.status, "accepted"), role === "recruiter" ? eq(s.matches.recruiterId, uid) : eq(s.matches.candidateId, uid)))
    .orderBy(desc(s.matches.createdAt));
  const ids = rows.map((x) => x.m.id);
  const last = ids.length
    ? await db()
        .selectDistinctOn([s.messages.matchId])
        .from(s.messages)
        .where(inArray(s.messages.matchId, ids))
        .orderBy(s.messages.matchId, desc(s.messages.createdAt))
    : [];
  const lastBy = new Map(last.map((m) => [m.matchId, toMessage(m)]));
  return rows.map(({ m, r, c }) => ({
    match: toMatch(m),
    role: { title: r.title, company: r.company },
    // candidate identity is shown to the recruiter only because the match is accepted
    candidate: role === "recruiter" ? { full_name: c.fullName, headline: c.headline } : null,
    last: lastBy.get(m.id) ?? null,
  }));
}

/** A conversation the user is part of (accepted matches only). */
export async function getConversation(uid: string, matchId: string) {
  if (!isId(matchId)) return null;
  const [row] = await db()
    .select({ m: s.matches, r: s.roles, c: s.candidates })
    .from(s.matches)
    .innerJoin(s.roles, eq(s.roles.id, s.matches.roleId))
    .innerJoin(s.candidates, eq(s.candidates.userId, s.matches.candidateId))
    .where(and(eq(s.matches.id, matchId), eq(s.matches.status, "accepted"), or(eq(s.matches.recruiterId, uid), eq(s.matches.candidateId, uid))))
    .limit(1);
  if (!row) return null;
  const [resume] = await db().select({ u: s.resumes.userId }).from(s.resumes).where(eq(s.resumes.userId, row.c.userId)).limit(1);
  return {
    match: toMatch(row.m),
    role: toRole(row.r),
    candidate: toCandidate(row.c, Boolean(resume)),
    isRecruiter: row.m.recruiterId === uid,
  };
}

export async function listMessages(uid: string, matchId: string, after?: string): Promise<Message[]> {
  if (!(await getConversation(uid, matchId))) throw new Forbidden();
  const rows = await db()
    .select()
    .from(s.messages)
    .where(and(eq(s.messages.matchId, matchId), after && !Number.isNaN(Date.parse(after)) ? sql`${s.messages.createdAt} > ${new Date(after)}` : undefined))
    .orderBy(asc(s.messages.createdAt))
    .limit(500);
  return rows.map(toMessage);
}

export async function sendMessage(uid: string, matchId: string, body: string): Promise<Message> {
  const text = body.trim().slice(0, 4000);
  if (!text) throw new Error("Empty message");
  if (!(await getConversation(uid, matchId))) throw new Forbidden();
  const [row] = await db().insert(s.messages).values({ matchId, senderId: uid, body: text }).returning();
  return toMessage(row);
}

/* ── ATS board cache (public data, shared across users) ────────────── */

export async function rememberBoards(rows: { ats: string; token: string; company: string; ok: boolean; error?: string }[]) {
  for (const r of rows) {
    const set = r.ok
      ? { company: r.company, lastOkAt: new Date(), lastError: null, updatedAt: new Date() }
      : { lastError: (r.error ?? "error").slice(0, 300), updatedAt: new Date() };
    await db()
      .insert(s.companyBoards)
      .values({ ats: r.ats, token: r.token, company: r.company, ...set })
      .onConflictDoUpdate({ target: [s.companyBoards.ats, s.companyBoards.token], set });
  }
}

/** Known-good boards for these company names (case-insensitive). */
export async function boardsForCompanies(names: string[]) {
  const lower = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))];
  if (!lower.length) return [];
  return db()
    .select({ ats: s.companyBoards.ats, token: s.companyBoards.token, company: s.companyBoards.company })
    .from(s.companyBoards)
    .where(and(inArray(sql`lower(${s.companyBoards.company})`, lower), sql`${s.companyBoards.lastOkAt} is not null`));
}

/* ── quotas (no login yet, so cap costly actions per browser identity) ─ */

/** Limits apply in production; in development only when ENFORCE_QUOTAS=1 (tests set it). */
export function quotasEnforced(): boolean {
  return process.env.NODE_ENV === "production" || process.env.ENFORCE_QUOTAS === "1";
}

const envInt = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export const QUOTAS = {
  linkedin: { limit: envInt("QUOTA_LINKEDIN_PER_HOUR", 10), windowMins: 60 },
  jobSearch: { limit: envInt("QUOTA_JOB_SEARCH_PER_HOUR", 6), windowMins: 60 },
  /** free plan: fresh searches per week (Pro isn't limited by this) */
  jobSearchFree: { limit: envInt("QUOTA_FREE_SEARCHES_PER_WEEK", 2), windowMins: 7 * 24 * 60 },
  resumeParse: { limit: envInt("QUOTA_RESUME_PARSE_PER_HOUR", 10), windowMins: 60 },
  roleDraft: { limit: envInt("QUOTA_ROLE_DRAFT_PER_HOUR", 15), windowMins: 60 },
  candidateSearch: { limit: envInt("QUOTA_CANDIDATE_SEARCH_PER_HOUR", 20), windowMins: 60 },
};
export type QuotaKind = keyof typeof QUOTAS;

/**
 * Records one use of `kind` if the identity is under `limit` uses in the last
 * `windowMins`; returns false (and records nothing) when over the limit.
 */
export async function takeQuota(uid: string, kind: string, limit: number, windowMins: number): Promise<boolean> {
  if (!quotasEnforced()) return true;
  return db().transaction(async (tx) => {
    // serialise concurrent requests from the same identity
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${uid}:${kind}`}))`);
    const [r] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(s.usageEvents)
      .where(and(eq(s.usageEvents.userId, uid), eq(s.usageEvents.kind, kind), sql`${s.usageEvents.at} > now() - make_interval(mins => ${windowMins})`));
    if ((r?.n ?? 0) >= limit) return false;
    await tx.insert(s.usageEvents).values({ userId: uid, kind });
    return true;
  });
}

/** Give back the most recent use, when the failure was on our side (provider/API error). */
export async function refundQuota(uid: string, kind: string) {
  if (!quotasEnforced()) return;
  await db().execute(sql`
    delete from usage_events where id = (
      select id from usage_events where user_id = ${uid} and kind = ${kind} order by at desc limit 1
    )`);
}

/** Minutes until the oldest use in the window expires (i.e. until one more is allowed). */
export async function quotaRetryAfterMins(uid: string, kind: string, windowMins: number): Promise<number> {
  const [r] = await db()
    .select({ oldest: sql<Date | null>`min(${s.usageEvents.at})` })
    .from(s.usageEvents)
    .where(and(eq(s.usageEvents.userId, uid), eq(s.usageEvents.kind, kind), sql`${s.usageEvents.at} > now() - make_interval(mins => ${windowMins})`));
  if (!r?.oldest) return 0;
  const freeAt = new Date(r.oldest).getTime() + windowMins * 60_000;
  return Math.max(1, Math.ceil((freeAt - Date.now()) / 60_000));
}

/* ── plans, unlocks, billing ───────────────────────────────────────── */

/**
 * The paywall is live only together with payments (BILLING_ENABLED=1): until
 * then everyone sees everything, so nobody hits a lock they can't open.
 */
export const paywallOn = () => process.env.BILLING_ENABLED === "1";

/** New results of each search a free user can see in full. */
export const FREE_PICKS_PER_SEARCH = 3;
/** Unlocks in one pack. */
export const PACK_CREDITS = 5;
/** Subscription states that keep Pro (past_due: Stripe is still retrying the card). */
const PRO_STATUSES = ["active", "trialing", "past_due"];

/** Sees every job and feature: a Pro subscriber, or anyone while the paywall is off. */
export async function hasFullAccess(uid: string): Promise<boolean> {
  return !paywallOn() || (await isPro(uid));
}

export async function isPro(uid: string): Promise<boolean> {
  if (!isId(uid)) return false;
  const [r] = await db()
    .select({ status: s.subscriptions.status, end: s.subscriptions.currentPeriodEnd })
    .from(s.subscriptions)
    .where(eq(s.subscriptions.userId, uid))
    .limit(1);
  return Boolean(r && PRO_STATUSES.includes(r.status) && (!r.end || r.end.getTime() > Date.now()));
}

export async function getEntitlement(uid: string): Promise<Entitlement> {
  const [[u], [sub], pro] = await Promise.all([
    db().select().from(s.users).where(eq(s.users.id, uid)).limit(1),
    db().select().from(s.subscriptions).where(eq(s.subscriptions.userId, uid)).limit(1),
    isPro(uid),
  ]);
  return {
    plan: pro ? "pro" : "free",
    credits: u?.unlockCredits ?? 0,
    email: u?.email ?? null,
    renewsAt: pro && sub?.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: pro ? (sub?.cancelAtPeriodEnd ?? false) : false,
    digestEnabled: u?.digestEnabled ?? true,
  };
}

export type UnlockResult = "unlocked" | "already" | "no_credits" | "not_found";

/** Spends one pack credit to unlock a job for good. */
export async function unlockJob(uid: string, jobId: string): Promise<UnlockResult> {
  if (!isId(jobId)) return "not_found";
  if (await isPro(uid)) return "already";
  return db().transaction(async (tx) => {
    const [job] = await tx
      .select({ unlockedAt: s.jobResults.unlockedAt })
      .from(s.jobResults)
      .where(and(eq(s.jobResults.id, jobId), eq(s.jobResults.candidateId, uid)))
      .limit(1);
    if (!job) return "not_found";
    if (job.unlockedAt) return "already";
    const spent = await tx
      .update(s.users)
      .set({ unlockCredits: sql`${s.users.unlockCredits} - 1` })
      .where(and(eq(s.users.id, uid), sql`${s.users.unlockCredits} > 0`))
      .returning({ left: s.users.unlockCredits });
    if (spent.length === 0) return "no_credits";
    await tx.update(s.jobResults).set({ unlockedAt: sql`now()`, unlockVia: "credit" }).where(eq(s.jobResults.id, jobId));
    return "unlocked";
  });
}

export const normEmail = (e: string) => e.trim().toLowerCase();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validEmail = (e: string) => e.length <= 254 && EMAIL.test(normEmail(e));

export async function userIdByEmail(email: string): Promise<string | null> {
  const [u] = await db().select({ id: s.users.id }).from(s.users).where(eq(s.users.email, normEmail(email))).limit(1);
  return u?.id ?? null;
}

/**
 * Gives a user an email (on payment or first sign-in). Never moves an email
 * that already belongs to someone else; returns false in that case.
 */
export async function attachEmail(uid: string, email: string, verified: boolean): Promise<boolean> {
  const e = normEmail(email);
  const owner = await userIdByEmail(e);
  if (owner && owner !== uid) return false;
  await db()
    .update(s.users)
    .set({ email: e, ...(verified ? { emailVerifiedAt: sql`coalesce(${s.users.emailVerifiedAt}, now())` } : {}) })
    .where(eq(s.users.id, uid));
  return true;
}

export async function addCredits(uid: string, n: number) {
  await db()
    .update(s.users)
    .set({ unlockCredits: sql`${s.users.unlockCredits} + ${n}` })
    .where(eq(s.users.id, uid));
}

export interface SubscriptionState {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  priceId: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export async function upsertSubscription(sub: SubscriptionState) {
  const { userId, ...rest } = sub;
  await db()
    .insert(s.subscriptions)
    .values({ userId, ...rest })
    .onConflictDoUpdate({ target: s.subscriptions.userId, set: { ...rest, updatedAt: sql`now()` } });
}

/** Updates a subscription we already know (by its Stripe id); returns false if unknown. */
export async function updateSubscriptionById(stripeSubscriptionId: string, patch: Partial<Omit<SubscriptionState, "userId" | "stripeSubscriptionId">>) {
  const r = await db()
    .update(s.subscriptions)
    .set({ ...patch, updatedAt: sql`now()` })
    .where(eq(s.subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .returning({ userId: s.subscriptions.userId });
  return r.length > 0;
}

export async function stripeCustomerFor(uid: string): Promise<string | null> {
  const [r] = await db().select({ c: s.users.stripeCustomerId }).from(s.users).where(eq(s.users.id, uid)).limit(1);
  return r?.c ?? null;
}

export async function setStripeCustomer(uid: string, customerId: string) {
  await db().update(s.users).set({ stripeCustomerId: customerId }).where(and(eq(s.users.id, uid), isNull(s.users.stripeCustomerId)));
}

export async function userByStripeCustomer(customerId: string): Promise<string | null> {
  const [r] = await db().select({ id: s.users.id }).from(s.users).where(eq(s.users.stripeCustomerId, customerId)).limit(1);
  return r?.id ?? null;
}

/** Grants a paid pack once per payment (webhooks may repeat); returns true if credits were added. */
export async function grantPack(uid: string, paymentIntentId: string, credits: number): Promise<boolean> {
  return db().transaction(async (tx) => {
    const r = await tx.insert(s.packPurchases).values({ paymentIntentId, userId: uid, credits }).onConflictDoNothing().returning({ id: s.packPurchases.paymentIntentId });
    if (r.length === 0) return false;
    await tx.update(s.users).set({ unlockCredits: sql`${s.users.unlockCredits} + ${credits}` }).where(eq(s.users.id, uid));
    return true;
  });
}

/** Takes back a refunded or disputed pack's unspent credits (never below zero). */
export async function reversePack(paymentIntentId: string): Promise<boolean> {
  return db().transaction(async (tx) => {
    const [p] = await tx
      .update(s.packPurchases)
      .set({ reversedAt: sql`now()` })
      .where(and(eq(s.packPurchases.paymentIntentId, paymentIntentId), isNull(s.packPurchases.reversedAt)))
      .returning({ userId: s.packPurchases.userId, credits: s.packPurchases.credits });
    if (!p) return false;
    await tx
      .update(s.users)
      .set({ unlockCredits: sql`greatest(0, ${s.users.unlockCredits} - ${p.credits})` })
      .where(eq(s.users.id, p.userId));
    return true;
  });
}

/** Records a webhook event; false if it was already handled. */
export async function claimStripeEvent(id: string, type: string): Promise<boolean> {
  const r = await db().insert(s.stripeEvents).values({ id, type }).onConflictDoNothing().returning({ id: s.stripeEvents.id });
  return r.length > 0;
}

/** Lets a webhook be retried if handling failed after it was claimed. */
export async function releaseStripeEvent(id: string) {
  await db().delete(s.stripeEvents).where(eq(s.stripeEvents.id, id));
}

/* ── sign-in links ─────────────────────────────────────────────────── */

const LOGIN_TTL_MINS = 20;

async function sha256(x: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(x)));
  return Array.from(h, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Creates a one-time sign-in token for an email (the raw token goes in the emailed link only). */
export async function createLoginToken(email: string): Promise<string> {
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  const token = btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  await db()
    .insert(s.loginTokens)
    .values({ tokenHash: await sha256(token), email: normEmail(email), expiresAt: new Date(Date.now() + LOGIN_TTL_MINS * 60_000) });
  return token;
}

/** Spends a sign-in token; returns its email if it was valid, unused and unexpired. */
export async function consumeLoginToken(token: string): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const [r] = await db()
    .update(s.loginTokens)
    .set({ usedAt: sql`now()` })
    .where(and(eq(s.loginTokens.tokenHash, await sha256(token)), isNull(s.loginTokens.usedAt), sql`${s.loginTokens.expiresAt} > now()`))
    .returning({ email: s.loginTokens.email });
  return r?.email ?? null;
}

/** Sign-in links sent to an email recently (to rate-limit requests). */
export async function recentLoginTokens(email: string, withinMins = 60): Promise<number> {
  const [r] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(s.loginTokens)
    .where(and(eq(s.loginTokens.email, normEmail(email)), sql`${s.loginTokens.createdAt} > now() - make_interval(mins => ${withinMins})`));
  return r?.n ?? 0;
}

/* ── weekly digest ─────────────────────────────────────────────────── */

/** Pro users with a profile, an email and the digest on, not emailed for `everyDays`. */
export async function digestDue(limit: number, everyDays = 7): Promise<{ id: string; email: string }[]> {
  const rows = await db()
    .select({ id: s.users.id, email: s.users.email })
    .from(s.users)
    .innerJoin(s.subscriptions, eq(s.subscriptions.userId, s.users.id))
    .innerJoin(s.candidates, eq(s.candidates.userId, s.users.id))
    .where(
      and(
        eq(s.users.digestEnabled, true),
        sql`${s.users.email} is not null`,
        inArray(s.subscriptions.status, PRO_STATUSES),
        or(isNull(s.subscriptions.currentPeriodEnd), sql`${s.subscriptions.currentPeriodEnd} > now()`),
        or(isNull(s.users.lastDigestAt), sql`${s.users.lastDigestAt} < now() - make_interval(days => ${everyDays})`),
      ),
    )
    .orderBy(asc(s.users.lastDigestAt))
    .limit(limit);
  return rows.filter((r): r is { id: string; email: string } => Boolean(r.email));
}

/** Of these posting URLs, the ones not yet emailed to the user. */
export async function unsentUrls(uid: string, urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const sent = await db()
    .select({ url: s.digestSent.url })
    .from(s.digestSent)
    .where(and(eq(s.digestSent.userId, uid), inArray(s.digestSent.url, urls)));
  const done = new Set(sent.map((r) => r.url));
  return new Set(urls.filter((u) => !done.has(u)));
}

export async function markDigestSent(uid: string, urls: string[]) {
  await db().transaction(async (tx) => {
    if (urls.length) await tx.insert(s.digestSent).values(urls.map((url) => ({ userId: uid, url }))).onConflictDoNothing();
    await tx.update(s.users).set({ lastDigestAt: sql`now()` }).where(eq(s.users.id, uid));
  });
}

export async function setDigestEnabled(uid: string, on: boolean) {
  await db().update(s.users).set({ digestEnabled: on }).where(eq(s.users.id, uid));
}

/* ── résumé reviews ────────────────────────────────────────────────── */

export async function getResumeReview(uid: string): Promise<{ profileKey: string; fixes: ResumeFix[] } | null> {
  const [r] = await db().select().from(s.resumeReviews).where(eq(s.resumeReviews.userId, uid)).limit(1);
  return r ? { profileKey: r.profileKey, fixes: r.fixes } : null;
}

export async function saveResumeReview(uid: string, profileKey: string, fixes: ResumeFix[]) {
  await db()
    .insert(s.resumeReviews)
    .values({ userId: uid, profileKey, fixes })
    .onConflictDoUpdate({ target: s.resumeReviews.userId, set: { profileKey, fixes, createdAt: sql`now()` } });
}
