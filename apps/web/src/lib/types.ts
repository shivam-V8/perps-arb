export type Role = "candidate" | "recruiter";

export type FieldId =
  | "engineering"
  | "data"
  | "design"
  | "product"
  | "marketing"
  | "sales"
  | "finance"
  | "healthcare"
  | "operations"
  | "education"
  | "legal"
  | "other";

export type Seniority = "entry" | "mid" | "senior" | "lead" | "executive";
export type RemotePref = "remote" | "hybrid" | "onsite" | "any";

export interface Experience {
  title: string;
  company: string;
  start: string;
  end: string;
  highlights: string[];
}

/** A candidate's profile, parsed from a résumé or LinkedIn export and edited by them. */
export interface CandidateProfile {
  full_name: string;
  email: string;
  headline: string;
  summary: string;
  fields: FieldId[];
  skills: string[];
  experience: Experience[];
  education: string[];
  location: string;
  remote_pref: RemotePref;
  seniority: Seniority;
  salary_min: number | null;
  salary_currency: string;
  visible_to_recruiters: boolean;
  resume_path?: string | null;
  linkedin_url?: string | null;
  updated_at?: string;
}

/** A live posting found on the web for a candidate. */
export interface JobPosting {
  id: string;
  title: string;
  company: string;
  /** company's website domain, for its logo (null if unknown) */
  companyDomain?: string | null;
  location: string;
  remote: RemotePref | "unknown";
  url: string;
  source: string;
  posted: string;
  salary: string | null;
  summary: string;
  score: number;
  reasons: string[];
  saved?: boolean;
  /** read from (or confirmed in) the company's live ATS feed */
  verified?: boolean;
  ats?: string | null;
}

export interface CompanyLead {
  name: string;
  /** company's website domain, for its logo (null if unknown) */
  domain?: string | null;
  why: string;
  url: string;
}

/** A recruiter's open position. */
export interface RoleOpening {
  id: string;
  recruiter_id: string;
  title: string;
  company: string;
  description: string;
  fields: FieldId[];
  must_have: string[];
  nice_to_have: string[];
  location: string;
  remote: RemotePref;
  seniority: Seniority;
  salary_min: number | null;
  salary_max: number | null;
  created_at: string;
}

/** What a recruiter sees before a candidate accepts: no name, email or résumé file. */
export interface CandidateCardData {
  candidate_id: string;
  headline: string;
  summary: string;
  fields: FieldId[];
  skills: string[];
  experience: Pick<Experience, "title" | "company" | "start" | "end">[];
  seniority: Seniority;
  location: string;
  remote_pref: RemotePref;
  score: number;
  reasons: string[];
}

export type MatchStatus = "invited" | "accepted" | "declined";

export interface MatchRow {
  id: string;
  role_id: string;
  candidate_id: string;
  recruiter_id: string;
  status: MatchStatus;
  note: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export type Decision = "like" | "pass";
