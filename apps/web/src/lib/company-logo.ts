/**
 * Company website domains, used to show a company's logo.
 * The domain comes from the job search (the model reports it) or, failing that,
 * from the posting's own URL when it's on the company's site (not a job board).
 */

/** Hosts that belong to job boards / applicant-tracking systems, never to the employer. */
const BOARD_HOSTS = [
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "workable.com",
  "smartrecruiters.com",
  "myworkdayjobs.com",
  "workday.com",
  "icims.com",
  "jobvite.com",
  "bamboohr.com",
  "recruitee.com",
  "teamtailor.com",
  "personio.de",
  "personio.com",
  "breezy.hr",
  "jazzhr.com",
  "applytojob.com",
  "successfactors.com",
  "taleo.net",
  "oraclecloud.com",
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "monster.com",
  "wellfound.com",
  "angel.co",
  "builtin.com",
  "naukri.com",
  "bayt.com",
  "gulftalent.com",
  "web3.career",
  "cryptojobslist.com",
  "remoteok.com",
  "weworkremotely.com",
  "simplyhired.com",
  "dice.com",
  "google.com",
];

const DOMAIN = /^(?=.{3,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

/** A bare, lower-case domain ("stripe.com"), or null if the input isn't one. */
export function cleanDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.trim().toLowerCase();
  if (!d) return null;
  try {
    if (d.includes("/") || d.includes(":")) d = new URL(d.includes("://") ? d : `https://${d}`).hostname;
  } catch {
    return null;
  }
  d = d.replace(/^www\./, "").replace(/\.$/, "");
  if (!DOMAIN.test(d) || isBoardHost(d)) return null;
  return d;
}

function isBoardHost(host: string): boolean {
  return BOARD_HOSTS.some((b) => host === b || host.endsWith(`.${b}`));
}

const SECOND_LEVEL = new Set(["co", "com", "org", "net", "ac", "gov", "edu", "ne", "or"]);
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * The employer's domain from a posting URL on its own site (careers.acme.com → acme.com),
 * only when the domain matches the company's name. Ecosystem boards like jobs.solana.com
 * list other companies' jobs, so an unmatched domain is never trusted.
 */
export function domainFromUrl(url: string | null | undefined, company: string): string | null {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  const labels = host.split(".").filter(Boolean);
  if (labels.length < 2) return null;
  const n = labels.length;
  const keep = n >= 3 && SECOND_LEVEL.has(labels[n - 2]) && labels[n - 1].length === 2 ? 3 : 2; // acme.co.uk
  const domain = cleanDomain(labels.slice(-keep).join("."));
  if (!domain) return null;
  const label = norm(labels[n - keep]);
  const name = norm(company);
  if (label.length < 3 || name.length < 3) return null;
  return name.includes(label) || label.includes(name) ? domain : null;
}

/** Best domain we have for a company: the one the search reported, else its own careers URL. */
export function companyDomainFor(job: { companyDomain?: string | null; url?: string | null; company: string }): string | null {
  return cleanDomain(job.companyDomain) ?? domainFromUrl(job.url, job.company);
}

/** Logo image for a domain (Google's public favicon service, up to 128px). */
export function logoUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}
