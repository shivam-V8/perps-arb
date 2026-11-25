/**
 * Accepts only public LinkedIn *profile* URLs (linkedin.com/in/<slug>) and
 * returns a canonical form, or null. Company pages, posts, search URLs and
 * anything off linkedin.com are rejected.
 */
export function normalizeLinkedInProfile(input: string): { url: string; slug: string } | null {
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase();
  // linkedin.com, www.linkedin.com, and country subdomains like in.linkedin.com / uk.linkedin.com
  if (!(host === "linkedin.com" || /^([a-z]{2,3}|www)\.linkedin\.com$/.test(host))) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts[0]?.toLowerCase() !== "in" || !parts[1]) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(parts[1]);
  } catch {
    return null;
  }
  if (!/^[\p{L}\p{N}_-]{2,100}$/u.test(slug)) return null;
  return { url: `https://www.linkedin.com/in/${encodeURIComponent(slug)}`, slug };
}

/**
 * Best-guess display name from a profile slug, e.g. "jane-doe-4b2a19123" → "Jane Doe".
 * LinkedIn appends random ids to common names; those are stripped. Returns "" when
 * the slug doesn't look like a name (e.g. "jd2024").
 */
export function nameFromSlug(slug: string): string {
  const parts = slug
    .toLowerCase()
    .split(/[-_]+/)
    .filter(Boolean);
  // drop trailing id-like segments: digits, or mixed letters+digits
  while (parts.length > 1 && /\d/.test(parts[parts.length - 1])) parts.pop();
  const words = parts.filter((p) => /^\p{L}+$/u.test(p));
  if (words.length < 2 || words.length > 4) return "";
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}
