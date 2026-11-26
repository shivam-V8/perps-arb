import { and, asc, desc, eq, inArray, isNull, ne, notExists, or, sql } from "drizzle-orm";
import { cleanDomain } from "@/lib/company-logo";
import { getDb, schema as s } from "@/db";
import type {
  CandidateCardData,
  CandidateProfile,
  CompanyLead,
  Decision,
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

function toJob(r: JobRow): JobPosting {
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
  const rows = await db()
    .select()
    .from(s.jobResults)
    .where(and(eq(s.jobResults.candidateId, uid), which === "saved" ? eq(s.jobResults.decision, "like") : isNull(s.jobResults.decision)))
    .orderBy(desc(s.jobResults.score));
  return rows.map(toJob);
}

export async function countJobs(uid: string) {
  const [r] = await db().select({ n: sql<number>`count(*)::int` }).from(s.jobResults).where(eq(s.jobResults.candidateId, uid));
  return r?.n ?? 0;
}

export async function getOwnJob(uid: string, jobId: string) {
  if (!isId(jobId)) return null;
  const [r] = await db().select().from(s.jobResults).where(and(eq(s.jobResults.id, jobId), eq(s.jobResults.candidateId, uid))).limit(1);
  return r ? toJob(r) : null;
}

/** Replaces unreviewed results with a fresh search; keeps anything saved or passed. */
export async function replaceJobResults(uid: string, jobs: Omit<JobPosting, "id">[], companies: CompanyLead[]) {
  await db().transaction(async (tx) => {
    await tx.delete(s.jobResults).where(and(eq(s.jobResults.candidateId, uid), isNull(s.jobResults.decision)));
    if (jobs.length) {
      await tx
        .insert(s.jobResults)
        .values(jobs.map((j) => ({ ...j, companyDomain: j.companyDomain ?? null, verified: j.verified ?? false, ats: j.ats ?? null, candidateId: uid })))
        .onConflictDoNothing();
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

export async function decideJob(uid: string, jobId: string, decision: Decision | null) {
  if (!isId(jobId)) return;
  await db().update(s.jobResults).set({ decision }).where(and(eq(s.jobResults.id, jobId), eq(s.jobResults.candidateId, uid)));
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
