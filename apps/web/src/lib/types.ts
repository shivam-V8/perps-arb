// TS mirrors of services/ingest response shapes (api/routes.py). Keep in sync.

export type VenueId =
  | "hyperliquid"
  | "binance"
  | "bybit"
  | "lighter"
  | "paradex"
  | "aster";

export const VENUE_IDS: VenueId[] = [
  "hyperliquid",
  "binance",
  "bybit",
  "lighter",
  "paradex",
  "aster",
];

export const VENUE_LABELS: Record<VenueId, string> = {
  hyperliquid: "Hyperliquid",
  binance: "Binance",
  bybit: "Bybit",
  lighter: "Lighter",
  paradex: "Paradex",
  aster: "Aster",
};

export type VenueStatus = "live" | "degraded" | "down";

export interface VenueHealth {
  venue: VenueId;
  status: VenueStatus;
  last_success_ts: number | null;
  age_s: number | null;
}

export interface RateEntry {
  annualized_pct: number;
  raw_rate: number;
  interval_hours: number;
  mark_price: number | null;
  oi_usd: number | null;
  next_funding_ts: number | null;
  fetched_at: number;
}

export interface AssetRates {
  asset: string;
  rates: Partial<Record<VenueId, RateEntry>>;
}

export interface RatesResponse {
  updated_at: number;
  venues: VenueHealth[];
  assets: AssetRates[];
}

export interface Spread {
  asset: string;
  short_venue: VenueId;
  long_venue: VenueId;
  short_apy: number;
  long_apy: number;
  spread_apy: number;
  short_mark: number | null;
  min_leg_oi_usd: number | null;
  n_venues: number;
}

export interface SpreadsResponse {
  updated_at: number;
  spreads: Spread[];
}
