"""Cross-venue spread computation over live venues, on read.

Guards:
- only venues whose heartbeat is fresh (< STALE_AFTER_S)
- liquidity floor: each leg needs oi_usd None (unknown, e.g. Binance) or >= floor
- symbol-collision gate: assets whose cross-venue marks disagree > tolerance are
  excluded and reported (a collision manufactures a fake monster spread)
- outlier tripwire: log when one venue's |annualized| is >10x the cross-venue
  median on assets with >= 3 venues (catches a wrong hardcoded interval)
"""

import logging
import statistics
import time

from .config import settings
from .store import venue_status

log = logging.getLogger(__name__)


def compute(all_state: dict[str, dict], limit: int | None = None) -> dict:
    now = time.time()

    venues_out = []
    live: dict[str, list[dict]] = {}
    for venue, state in all_state.items():
        status, age = venue_status(state["hb"], now)
        venues_out.append(
            {
                "venue": venue,
                "status": status,
                "last_success_ts": state["hb"],
                "age_s": age,
                "asset_count": len(state["rates"]),
                "consecutive_errors": state["err"].get("consecutive_errors", 0),
                "last_error": state["err"].get("last_error"),
            }
        )
        if status == "live":
            live[venue] = state["rates"]

    # asset -> venue -> rate row (live venues only)
    by_asset: dict[str, dict[str, dict]] = {}
    for venue, rates in live.items():
        for row in rates:
            by_asset.setdefault(row["asset"], {})[venue] = row

    conflicts: list[str] = []
    spreads: list[dict] = []
    for asset, per_venue in by_asset.items():
        if len(per_venue) < 2:
            continue

        marks = [r["mark_price"] for r in per_venue.values() if r.get("mark_price")]
        if len(marks) >= 2 and (max(marks) - min(marks)) / max(marks) > settings.mark_price_tolerance:
            conflicts.append(asset)
            continue

        rows = list(per_venue.items())
        if len(rows) >= 3:
            med = statistics.median(abs(r["annualized_pct"]) for _, r in rows)
            if med > 0.5:
                for v, r in rows:
                    if abs(r["annualized_pct"]) > 10 * med:
                        log.warning(
                            "outlier: %s on %s annualized=%.1f%% vs median %.1f%% — check interval normalization",
                            asset, v, r["annualized_pct"], med,
                        )

        short_venue, short_row = max(rows, key=lambda kv: kv[1]["annualized_pct"])
        long_venue, long_row = min(rows, key=lambda kv: kv[1]["annualized_pct"])

        def liquid(row: dict) -> bool:
            oi = row.get("oi_usd")
            return oi is None or oi >= settings.min_spread_oi_usd

        if not (liquid(short_row) and liquid(long_row)):
            continue

        leg_ois = [r.get("oi_usd") for r in (short_row, long_row) if r.get("oi_usd") is not None]
        spreads.append(
            {
                "asset": asset,
                "short_venue": short_venue,
                "long_venue": long_venue,
                "short_apy": short_row["annualized_pct"],
                "long_apy": long_row["annualized_pct"],
                "spread_apy": short_row["annualized_pct"] - long_row["annualized_pct"],
                "short_mark": short_row.get("mark_price"),
                "min_leg_oi_usd": min(leg_ois) if leg_ois else None,
                "n_venues": len(rows),
            }
        )

    spreads.sort(key=lambda s: s["spread_apy"], reverse=True)
    if conflicts:
        log.warning("symbol conflicts excluded from spreads: %s", conflicts)

    return {
        "updated_at": int(now),
        "venues": venues_out,
        "spreads": spreads[:limit] if limit else spreads,
        "symbol_conflicts": sorted(conflicts),
    }
