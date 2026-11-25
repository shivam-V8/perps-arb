import { unzipSync, type UnzipFileInfo } from "fflate";
import Papa from "papaparse";
import type { CandidateDraft } from "@/lib/ai/schemas";
import type { Experience, Seniority } from "@/lib/types";

/**
 * Reads the ZIP LinkedIn emails a member from Settings → Data privacy →
 * "Get a copy of your data". Only the profile files below are ever decompressed;
 * messages, connections, invitations, ad data etc. in the same archive are skipped.
 * Sensitive Profile.csv columns (birth date, address, zip, IM handles) are ignored.
 */

export class LinkedInExportError extends Error {
  constructor(
    public code: "not_zip" | "not_linkedin",
    message: string,
  ) {
    super(message);
  }
}

const WANTED = {
  profile: "profile.csv",
  positions: "positions.csv",
  education: "education.csv",
  skills: "skills.csv",
  certifications: "certifications.csv",
  emails: "email addresses.csv",
  languages: "languages.csv",
} as const;
type Key = keyof typeof WANTED;

const MAX_ENTRY = 5 * 1024 * 1024;
const basename = (p: string) => p.split("/").pop()!.toLowerCase();
const wantedNames = new Set<string>(Object.values(WANTED));

type Row = Record<string, string>;

/** Parse a LinkedIn CSV: strip BOM, skip any "Notes:" preamble before the header row. */
export function parseCsv(text: string, expectHeader: string): Row[] {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/);
  // the header row starts with the expected first column; preamble notes are prose
  const start = lines.findIndex((l) => l.trim().replace(/^"/, "").toLowerCase().startsWith(expectHeader.toLowerCase()));
  if (start < 0) return [];
  const body = lines.slice(start).join("\n");
  const res = Papa.parse<Row>(body, { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
  return res.data.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, (v ?? "").trim()])));
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Mar 2021" / "2021" / "" → sortable number (yyyy*12+m) or null. */
function monthIndex(s: string): number | null {
  const m = s.trim().toLowerCase().match(/^(?:([a-z]{3})[a-z]*\s+)?(\d{4})$/);
  if (!m) return null;
  const month = m[1] ? Math.max(0, MONTHS.indexOf(m[1])) : 0;
  return Number(m[2]) * 12 + month;
}

function highlights(description: string): string[] {
  return description
    .split(/\r?\n|•|·|(?<=\.)\s+(?=[A-Z])/)
    .map((l) => l.replace(/^[-*–\s]+/, "").trim())
    .filter((l) => l.length > 3)
    .slice(0, 3)
    .map((l) => l.slice(0, 200));
}

const LEVEL_WORDS: [RegExp, Seniority][] = [
  [/\b(chief|cxo|ceo|cto|cfo|coo|vp|vice president|director|head of|founder|partner)\b/i, "executive"],
  [/\b(lead|principal|staff|manager|supervisor|charge)\b/i, "lead"],
  [/\b(senior|sr\.?)\b/i, "senior"],
  [/\b(intern|trainee|junior|jr\.?|graduate|apprentice|assistant)\b/i, "entry"],
];

/** Seniority from the current title's wording, else from total years of experience. */
export function estimateSeniority(exp: Experience[], now = new Date()): Seniority {
  const current = exp[0]?.title ?? "";
  for (const [re, level] of LEVEL_WORDS) if (re.test(current)) return level;
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  let months = 0;
  for (const e of exp) {
    const s = monthIndex(e.start);
    const f = e.end === "Present" ? nowIdx : monthIndex(e.end);
    if (s !== null && f !== null && f >= s) months += f - s;
  }
  const years = months / 12;
  if (years < 2) return "entry";
  if (years < 5) return "mid";
  return "senior";
}

export interface LinkedInImport {
  draft: CandidateDraft & { email: string };
  found: { positions: number; education: number; skills: number; certifications: number };
  missingFiles: string[];
}

export function parseLinkedInExport(buf: Uint8Array): LinkedInImport {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(buf, {
      filter: (f: UnzipFileInfo) => wantedNames.has(basename(f.name)) && f.originalSize <= MAX_ENTRY,
    });
  } catch {
    throw new LinkedInExportError("not_zip", "That file isn't a ZIP archive. Upload the .zip LinkedIn emailed you.");
  }

  const dec = new TextDecoder("utf-8");
  const text: Partial<Record<Key, string>> = {};
  for (const [path, data] of Object.entries(files)) {
    if (data.byteLength > MAX_ENTRY) continue; // declared size lied: skip
    const key = (Object.keys(WANTED) as Key[]).find((k) => WANTED[k] === basename(path));
    if (key && !text[key]) text[key] = dec.decode(data);
  }
  if (!text.profile && !text.positions) {
    throw new LinkedInExportError("not_linkedin", "This doesn't look like a LinkedIn data export (no Profile.csv or Positions.csv inside).");
  }

  const profile = text.profile ? parseCsv(text.profile, "First Name")[0] ?? {} : {};
  const positions = text.positions ? parseCsv(text.positions, "Company Name") : [];
  const education = text.education ? parseCsv(text.education, "School Name") : [];
  const skills = text.skills ? parseCsv(text.skills, "Name") : [];
  const certs = text.certifications ? parseCsv(text.certifications, "Name") : [];
  const emails = text.emails ? parseCsv(text.emails, "Email Address") : [];
  const languages = text.languages ? parseCsv(text.languages, "Name") : [];

  const experience: Experience[] = positions
    .filter((p) => p["Title"] || p["Company Name"])
    .map((p) => ({
      title: p["Title"] ?? "",
      company: p["Company Name"] ?? "",
      start: p["Started On"] ?? "",
      end: p["Finished On"] ? p["Finished On"] : "Present",
      highlights: highlights(p["Description"] ?? ""),
    }))
    .sort((a, b) => {
      // current roles first, then most recent start
      if ((a.end === "Present") !== (b.end === "Present")) return a.end === "Present" ? -1 : 1;
      return (monthIndex(b.start) ?? 0) - (monthIndex(a.start) ?? 0);
    })
    .slice(0, 8);

  const year = (d: string) => d.match(/\d{4}/)?.[0] ?? "";
  const educationLines = [
    ...education
      .filter((e) => e["School Name"])
      .map((e) => {
        const end = year(e["End Date"] ?? "");
        return [e["Degree Name"], e["School Name"]].filter(Boolean).join(", ") + (end ? ` (${end})` : "");
      }),
    ...certs.filter((c) => c["Name"]).map((c) => (c["Authority"] ? `${c["Name"]} — ${c["Authority"]}` : c["Name"])),
  ].slice(0, 8);

  const skillNames = [
    ...skills.map((s) => s["Name"]).filter(Boolean),
    ...languages.map((l) => l["Name"]).filter(Boolean).map((n) => `Language: ${n}`),
  ].slice(0, 25);

  const primary =
    emails.find((e) => /yes/i.test(e["Primary"] ?? "") && /yes/i.test(e["Confirmed"] ?? "")) ??
    emails.find((e) => /yes/i.test(e["Confirmed"] ?? "")) ??
    emails[0];

  const draft: LinkedInImport["draft"] = {
    full_name: [profile["First Name"], profile["Last Name"]].filter(Boolean).join(" "),
    email: primary?.["Email Address"] ?? "",
    headline: (profile["Headline"] ?? "").slice(0, 120),
    summary: (profile["Summary"] ?? "").slice(0, 800),
    fields: [],
    skills: skillNames,
    experience,
    education: educationLines,
    location: profile["Geo Location"] ?? "",
    remote_pref: "any",
    seniority: estimateSeniority(experience),
    salary_min: null,
    salary_currency: "USD",
  };

  const DISPLAY = { profile: "Profile.csv", positions: "Positions.csv", education: "Education.csv", skills: "Skills.csv" } as const;
  const missingFiles = (Object.keys(DISPLAY) as (keyof typeof DISPLAY)[]).filter((k) => !text[k]).map((k) => DISPLAY[k]);

  return {
    draft,
    found: { positions: experience.length, education: education.length, skills: skills.length, certifications: certs.length },
    missingFiles,
  };
}
