/**
 * Public job-board feeds from applicant tracking systems. These endpoints are
 * published by each ATS so companies' openings can be listed elsewhere; no keys,
 * read-only. We only ever call these fixed hosts (the company token is validated),
 * so user- or model-supplied URLs can't make the server fetch arbitrary addresses.
 */

export type Ats = "greenhouse" | "lever" | "ashby" | "workable" | "smartrecruiters";

export const ATS_LABEL: Record<Ats, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  workable: "Workable",
  smartrecruiters: "SmartRecruiters",
};

export interface Board {
  ats: Ats;
  token: string;
}

export interface FeedPosting {
  title: string;
  company: string;
  location: string;
  remote: "remote" | "hybrid" | "onsite" | "unknown";
  url: string;
  posted: string; // ISO date or ""
  salary: string | null;
  description: string; // plain text, truncated
  ats: Ats;
}

const TOKEN = /^[A-Za-z0-9._-]{1,80}$/;

/** Recognise a company's ATS board from any of its job or careers URLs. */
export function detectBoard(raw: string): Board | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase();
  const first = u.pathname.split("/").filter(Boolean)[0] ?? "";
  const token = decodeURIComponent(first);
  const ok = (ats: Ats, t: string): Board | null => (TOKEN.test(t) ? { ats, token: t } : null);

  if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io" || host === "job-boards.eu.greenhouse.io") {
    // embed form: boards.greenhouse.io/embed/job_board?for=<token>
    if (token === "embed") return ok("greenhouse", u.searchParams.get("for") ?? "");
    return ok("greenhouse", token);
  }
  if (host === "boards-api.greenhouse.io") {
    const parts = u.pathname.split("/").filter(Boolean); // v1/boards/<token>/...
    return parts[1] === "boards" ? ok("greenhouse", parts[2] ?? "") : null;
  }
  if (host === "jobs.lever.co" || host === "jobs.eu.lever.co") return ok("lever", token);
  if (host === "jobs.ashbyhq.com") return ok("ashby", token);
  if (host === "apply.workable.com") return ok("workable", token);
  if (host === "jobs.smartrecruiters.com" || host === "careers.smartrecruiters.com") return ok("smartrecruiters", token);
  return null;
}

/* ── parsers (pure; tested with fixtures) ─────────────────────────────── */

type J = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown): J[] => (Array.isArray(v) ? (v as J[]) : []);
const obj = (v: unknown): J => (v && typeof v === "object" ? (v as J) : {});

const decodeEntities = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

/** Greenhouse sends escaped HTML: unescape, strip tags, then decode the text's own entities. */
export function htmlToText(html: string, max = 1500): string {
  const text = decodeEntities(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(text).replace(/\s+/g, " ").trim().slice(0, max);
}

function guessRemote(...parts: string[]): FeedPosting["remote"] {
  const s = parts.join(" ").toLowerCase();
  if (/\bhybrid\b/.test(s)) return "hybrid";
  if (/\bremote\b/.test(s)) return "remote";
  if (/\bon-?site\b|\bin[- ]office\b/.test(s)) return "onsite";
  return "unknown";
}

const iso = (v: unknown) => {
  const d = typeof v === "number" ? new Date(v) : new Date(str(v));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

export function parseGreenhouse(data: unknown, company: string): FeedPosting[] {
  return arr(obj(data).jobs).map((j) => {
    const location = str(obj(j.location).name);
    return {
      title: str(j.title),
      company: str(j.company_name) || company,
      location,
      remote: guessRemote(location),
      url: str(j.absolute_url),
      posted: iso(j.first_published ?? j.updated_at),
      salary: null,
      description: htmlToText(str(j.content)),
      ats: "greenhouse" as const,
    };
  });
}

export function parseLever(data: unknown, company: string): FeedPosting[] {
  return arr(data).map((j) => {
    const cat = obj(j.categories);
    const location = str(cat.location);
    const wp = str(j.workplaceType);
    const sr = obj(j.salaryRange);
    const salary =
      typeof sr.min === "number" && typeof sr.max === "number"
        ? `${str(sr.currency)} ${sr.min.toLocaleString()}–${sr.max.toLocaleString()}${sr.interval ? ` ${str(sr.interval).replace("-", " ")}` : ""}`.trim()
        : null;
    return {
      title: str(j.text),
      company,
      location,
      remote: wp === "remote" ? "remote" : wp === "hybrid" ? "hybrid" : wp === "on-site" ? "onsite" : guessRemote(location),
      url: str(j.hostedUrl),
      posted: iso(j.createdAt),
      salary,
      description: str(j.descriptionPlain).slice(0, 1500),
      ats: "lever" as const,
    };
  });
}

export function parseAshby(data: unknown, company: string): FeedPosting[] {
  return arr(obj(data).jobs)
    .filter((j) => j.isListed !== false)
    .map((j) => {
      const location = str(j.location);
      const wp = str(j.workplaceType).toLowerCase();
      return {
        title: str(j.title),
        company,
        location,
        // the explicit workplace type wins: Ashby can mark a hybrid job isRemote too
        remote: wp === "remote" ? "remote" : wp === "hybrid" ? "hybrid" : wp === "onsite" ? "onsite" : j.isRemote === true ? "remote" : guessRemote(location),
        url: str(j.jobUrl),
        posted: iso(j.publishedAt),
        salary: str(obj(j.compensation).compensationTierSummary) || null,
        description: str(j.descriptionPlain).slice(0, 1500),
        ats: "ashby" as const,
      };
    });
}

export function parseWorkable(data: unknown, company: string): FeedPosting[] {
  const d = obj(data);
  const name = str(d.name) || company;
  return arr(d.jobs).map((j) => {
    const location = [str(j.city), str(j.state), str(j.country)].filter(Boolean).join(", ");
    return {
      title: str(j.title),
      company: name,
      location,
      remote: j.telecommuting === true ? "remote" : guessRemote(location),
      url: str(j.url) || str(j.shortlink),
      posted: iso(j.published_on ?? j.created_at),
      salary: null,
      description: "",
      ats: "workable" as const,
    };
  });
}

export function parseSmartRecruiters(data: unknown, company: string, token: string): FeedPosting[] {
  return arr(obj(data).content).map((j) => {
    const loc = obj(j.location);
    const location = str(loc.fullLocation) || [str(loc.city), str(loc.region), str(loc.country).toUpperCase()].filter(Boolean).join(", ");
    const co = obj(j.company);
    return {
      title: str(j.name),
      company: str(co.name) || company,
      location,
      remote: loc.remote === true ? "remote" : loc.hybrid === true ? "hybrid" : guessRemote(location),
      url: `https://jobs.smartrecruiters.com/${encodeURIComponent(str(co.identifier) || token)}/${encodeURIComponent(str(j.id))}`,
      posted: iso(j.releasedDate),
      salary: null,
      description: "",
      ats: "smartrecruiters" as const,
    };
  });
}

/* ── fetching ─────────────────────────────────────────────────────────── */

function endpoint(b: Board): string {
  const t = encodeURIComponent(b.token);
  switch (b.ats) {
    case "greenhouse":
      return `https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`;
    case "lever":
      return `https://api.lever.co/v0/postings/${t}?mode=json`;
    case "ashby":
      return `https://api.ashbyhq.com/posting-api/job-board/${t}?includeCompensation=true`;
    case "workable":
      return `https://apply.workable.com/api/v1/widget/accounts/${t}`;
    case "smartrecruiters":
      return `https://api.smartrecruiters.com/v1/companies/${t}/postings?limit=100`;
  }
}

export function parseFeed(b: Board, data: unknown, company: string): FeedPosting[] {
  switch (b.ats) {
    case "greenhouse":
      return parseGreenhouse(data, company);
    case "lever":
      return parseLever(data, company);
    case "ashby":
      return parseAshby(data, company);
    case "workable":
      return parseWorkable(data, company);
    case "smartrecruiters":
      return parseSmartRecruiters(data, company, b.token);
  }
}

const cache = new Map<string, { at: number; postings: FeedPosting[] }>();
const TTL = 15 * 60_000;
const USER_AGENT = `ChainMatchBot/1.0 (+${process.env.NEXT_PUBLIC_SITE_URL ?? "https://chainmatch.ai"})`;

/** Fetch one board's open postings (cached 15 min). Throws on HTTP/network errors. */
export async function fetchBoard(b: Board, company = b.token): Promise<FeedPosting[]> {
  const key = `${b.ats}:${b.token.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.postings;

  const res = await fetch(endpoint(b), {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${b.ats}/${b.token}: HTTP ${res.status}`);
  const postings = parseFeed(b, await res.json(), company).filter((p) => p.title && p.url.startsWith("https://"));
  cache.set(key, { at: Date.now(), postings });
  return postings;
}

/** Fetch several boards with limited concurrency; failures are reported, not thrown. */
export async function fetchBoards(
  boards: (Board & { company: string })[],
  concurrency = 4,
): Promise<{ board: Board & { company: string }; postings: FeedPosting[] | null; error?: string }[]> {
  const out: { board: Board & { company: string }; postings: FeedPosting[] | null; error?: string }[] = [];
  let i = 0;
  async function worker() {
    while (i < boards.length) {
      const board = boards[i++];
      try {
        out.push({ board, postings: await fetchBoard(board, board.company) });
      } catch (e) {
        out.push({ board, postings: null, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, boards.length) }, worker));
  return out;
}
