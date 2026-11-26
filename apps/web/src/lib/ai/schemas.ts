import { z } from "zod";
import { FIELD_IDS } from "@/lib/fields";

const Field = z.enum(FIELD_IDS);
const Seniority = z.enum(["entry", "mid", "senior", "lead", "executive"]);
const Remote = z.enum(["remote", "hybrid", "onsite", "any"]);

/** Résumé / LinkedIn export → candidate profile. */
export const CandidateDraftSchema = z.object({
  full_name: z.string().describe("Candidate's name if present, else empty string"),
  headline: z.string().describe("Current or target role in a few words, e.g. 'ICU Registered Nurse' or 'Senior Backend Engineer'"),
  summary: z.string().describe("Third-person-neutral 2-3 sentence summary of experience and strengths, max 450 chars"),
  fields: z.array(Field).describe("1-3 broad fields that fit, most relevant first"),
  skills: z.array(z.string()).describe("Up to 15 concrete skills, tools, certifications or licences"),
  experience: z
    .array(
      z.object({
        title: z.string(),
        company: z.string(),
        start: z.string().describe("e.g. '2021' or 'Mar 2021'"),
        end: z.string().describe("e.g. '2023' or 'Present'"),
        highlights: z.array(z.string()).describe("Up to 3 short outcome-focused bullets"),
      }),
    )
    .describe("Most recent first, up to 6 roles"),
  education: z.array(z.string()).describe("Degrees/certifications as short lines"),
  location: z.string().describe("City, country if stated, else empty string"),
  remote_pref: Remote.describe("Use 'any' unless the text states a preference"),
  seniority: Seniority,
  salary_min: z.number().nullable().describe("Only if explicitly stated, else null"),
  salary_currency: z.string().describe("ISO code, default 'USD'"),
});

/** Job description (or a sentence) → recruiter role. */
export const RoleDraftSchema = z.object({
  title: z.string(),
  company: z.string().describe("If stated, else empty string"),
  description: z.string().describe("Clean summary of the role for candidates, max 600 chars"),
  fields: z.array(Field).describe("1-3 fields"),
  must_have: z.array(z.string()).describe("Up to 8 hard requirements"),
  nice_to_have: z.array(z.string()).describe("Up to 6 nice-to-haves"),
  location: z.string(),
  remote: Remote,
  seniority: Seniority,
  salary_min: z.number().nullable(),
  salary_max: z.number().nullable(),
});

/** Claude's ranking of candidates for a role. */
export const RankSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      score: z.number().describe("0-100 fit score"),
      reasons: z.array(z.string()).describe("Exactly 2 specific reasons, max 22 words each"),
    }),
  ),
});

/** Final output of the live job search (reported through a tool call). */
export const JobReportSchema = z.object({
  jobs: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      company_domain: z.string().describe("The company's main website domain, e.g. 'stripe.com' (not a job board or ATS domain); empty string if unsure"),
      location: z.string(),
      remote: z.enum(["remote", "hybrid", "onsite", "any", "unknown"]),
      url: z.string().describe("Direct link to the posting, exactly as found"),
      source: z.string().describe("Site the posting is on, e.g. 'greenhouse.io' or the company careers site"),
      posted: z.string().describe("Posting date or age if shown, else empty string"),
      salary: z.string().nullable(),
      summary: z.string().describe("One sentence on what the job is"),
      score: z.number().describe("0-100 fit for this candidate"),
      reasons: z.array(z.string()).describe("Exactly 2 reasons it fits (or a clear caveat), max 22 words each"),
    }),
  ),
  companies: z.array(
    z.object({
      name: z.string(),
      domain: z.string().describe("The company's main website domain, e.g. 'stripe.com' (not a job board or ATS domain); empty string if unsure"),
      why: z.string().describe("Why this company suits the candidate, max 25 words"),
      url: z.string().describe("Careers page URL"),
    }),
  ),
});

export const OpenersSchema = z.object({
  messages: z.array(z.string()).describe("Exactly 3 distinct message options"),
});

export const CoverNoteSchema = z.object({
  note: z.string().describe("Cover note, 120-180 words"),
});

export type CandidateDraft = z.infer<typeof CandidateDraftSchema>;
export type RoleDraft = z.infer<typeof RoleDraftSchema>;
export type JobReport = z.infer<typeof JobReportSchema>;

/** LinkedIn URL → profile draft from public web research, with provenance. */
export const LinkedInDraftSchema = CandidateDraftSchema.extend({
  sources: z
    .array(z.object({ url: z.string(), title: z.string() }))
    .describe("Every web page you actually used, exactly as it appeared in search results"),
  missing: z.array(z.string()).describe("Fields you couldn't confirm from public sources, in plain words, e.g. 'work history before 2020', 'skills'"),
  matched: z.boolean().describe("true only if you found public information that clearly belongs to this exact profile"),
});
export type LinkedInDraft = z.infer<typeof LinkedInDraftSchema>;

/** Claude's ranking of ATS feed postings for a candidate. */
export const FeedRankSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      company_domain: z.string().describe("The company's main website domain, e.g. 'stripe.com' (not a job board or ATS domain); empty string if unsure"),
      score: z.number().describe("0-100 fit score"),
      summary: z.string().describe("One sentence on what the job is"),
      reasons: z.array(z.string()).describe("Exactly 2 reasons it fits (or a clear caveat), max 22 words each"),
    }),
  ),
});
