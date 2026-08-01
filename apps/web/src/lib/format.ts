export function fmtPct(pct: number, opts: { sign?: boolean } = {}): string {
  const { sign = true } = opts;
  const abs = Math.abs(pct);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const body = abs.toFixed(digits);
  if (!sign) return `${body}%`;
  return `${pct < 0 ? "−" : "+"}${body}%`;
}

export function fmtUsd(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function fmtPrice(v: number): string {
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return v.toPrecision(3);
}

export function fmtAge(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

/** Dollars earned per year on `size` at `apy` percent. */
export function estPerYear(size: number, apy: number): number {
  return (size * apy) / 100;
}

/** Dollars earned per 8h on `size` at `apy` percent. */
export function estPer8h(size: number, apy: number): number {
  return estPerYear(size, apy) / 1095;
}
