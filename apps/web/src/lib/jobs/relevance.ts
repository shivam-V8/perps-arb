import { fieldLabel } from "@/lib/fields";
import type { CandidateProfile } from "@/lib/types";
import type { FeedPosting } from "./ats";

/**
 * Cheap keyword prefilter: ATS boards can list hundreds of roles, so we keep
 * only the most plausible ones before asking Claude to rank them.
 */

const STOP = new Set(
  "a an and the of for to in on at with by from or as is are be this that our your we you i me my their it its role team work working job jobs experience years year senior junior lead manager".split(" "),
);

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9+#. ]+/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

const LEVEL: Record<string, number> = { intern: 0, entry: 1, junior: 1, mid: 2, senior: 3, staff: 4, lead: 4, principal: 5, head: 5, director: 6, vp: 7, chief: 8 };
const CANDIDATE_LEVEL = { entry: 1, mid: 2, senior: 3, lead: 4, executive: 6 } as const;

function titleLevel(title: string): number | null {
  const t = title.toLowerCase();
  let best: number | null = null;
  for (const [word, lvl] of Object.entries(LEVEL)) {
    if (new RegExp(`\\b${word}\\b`).test(t)) best = Math.max(best ?? 0, lvl);
  }
  return best;
}

export function scorePosting(p: FeedPosting, c: CandidateProfile): number {
  const strong = new Set(tokens([c.headline, ...c.experience.slice(0, 3).map((e) => e.title)].join(" ")));
  const skills = new Set(tokens(c.skills.join(" ")));
  const fields = new Set(tokens(c.fields.map(fieldLabel).join(" ")));

  const title = new Set(tokens(p.title));
  const body = new Set(tokens(`${p.title} ${p.description}`));

  let score = 0;
  for (const t of strong) if (title.has(t)) score += 4;
  for (const t of skills) if (title.has(t)) score += 3;
  for (const t of skills) if (body.has(t)) score += 1;
  for (const t of fields) if (title.has(t)) score += 1;
  if (score === 0) return 0; // nothing in common: don't let location alone rank it

  // location / work setup
  const loc = p.location.toLowerCase();
  const home = c.location.toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
  if (c.remote_pref === "remote" && p.remote === "remote") score += 3;
  else if (home.some((h) => h.length > 2 && loc.includes(h))) score += 3;
  else if (c.remote_pref === "remote" && p.remote === "onsite") score -= 3;

  // seniority distance
  const lvl = titleLevel(p.title);
  if (lvl !== null) score -= Math.max(0, Math.abs(lvl - CANDIDATE_LEVEL[c.seniority]) - 1) * 2;

  return score;
}

/** Top postings for a candidate, best first. */
export function prefilter(postings: FeedPosting[], c: CandidateProfile, limit = 40): FeedPosting[] {
  return postings
    .map((p) => ({ p, s: scorePosting(p, c) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
}
