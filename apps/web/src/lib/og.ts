import { VENUE_IDS, VENUE_LABELS, type VenueId } from "./types";

// Allowlist validation for OG/share params — these render attacker-controlled
// query strings into images and meta tags. Never interpolate raw input.
const ASSET_RE = /^[A-Z0-9]{1,12}$/;

export interface SpreadCardParams {
  asset: string;
  venueA: VenueId; // short leg (receives high funding)
  venueB: VenueId; // long leg
  apy: number;
}

export function parseSpreadParams(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
): SpreadCardParams | null {
  const get = (k: string): string =>
    sp instanceof URLSearchParams
      ? (sp.get(k) ?? "")
      : typeof sp[k] === "string"
        ? (sp[k] as string)
        : "";

  const asset = get("asset").toUpperCase();
  const venueA = get("venueA").toLowerCase() as VenueId;
  const venueB = get("venueB").toLowerCase() as VenueId;
  const apy = Number(get("apy"));

  if (!ASSET_RE.test(asset)) return null;
  if (!VENUE_IDS.includes(venueA) || !VENUE_IDS.includes(venueB)) return null;
  if (!Number.isFinite(apy)) return null;

  return { asset, venueA, venueB, apy: Math.max(-10_000, Math.min(10_000, apy)) };
}

export function cardQuery(p: SpreadCardParams): string {
  return `asset=${p.asset}&venueA=${p.venueA}&venueB=${p.venueB}&apy=${p.apy.toFixed(1)}`;
}

export function label(v: VenueId): string {
  return VENUE_LABELS[v];
}
