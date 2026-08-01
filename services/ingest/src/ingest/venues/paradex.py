"""Paradex: GET /v1/markets/summary?market=ALL + /v1/markets.

summary=ALL includes OPTIONS rows (e.g. BTC-USD-30OCT26-61000-P) with empty
funding_rate — keep only symbols ending -PERP.
/v1/markets carries funding_period_hours (explicit interval metadata).

RISK (verify vs Paradex UI at first run): whether funding_rate is the
per-funding_period rate. If it's already time-scaled, annualization is 8x off.
"""

import time

import httpx

from ..models import NormalizedRate, annualize_pct
from ..symbols import canonicalize
from .base import safe_float

BASE = "https://api.prod.paradex.trade/v1"

name = "paradex"

# funding_period_hours changes ~never; refetch metadata every 10 minutes.
_meta_cache: dict = {"ts": 0.0, "periods": {}}
_META_TTL_S = 600


async def _funding_periods(http: httpx.AsyncClient) -> dict[str, float]:
    now = time.time()
    if now - _meta_cache["ts"] < _META_TTL_S and _meta_cache["periods"]:
        return _meta_cache["periods"]
    resp = await http.get(f"{BASE}/markets")
    resp.raise_for_status()
    periods: dict[str, float] = {}
    for m in resp.json().get("results", []):
        symbol = m.get("symbol", "")
        period = safe_float(m.get("funding_period_hours"))
        if symbol.endswith("-PERP") and period:
            periods[symbol] = period
    _meta_cache.update(ts=now, periods=periods)
    return periods


async def fetch(http: httpx.AsyncClient) -> list[NormalizedRate]:
    periods = await _funding_periods(http)
    resp = await http.get(f"{BASE}/markets/summary", params={"market": "ALL"})
    resp.raise_for_status()
    now = time.time()

    out: list[NormalizedRate] = []
    for m in resp.json().get("results", []):
        symbol = m.get("symbol", "")
        if not symbol.endswith("-PERP"):
            continue
        raw_rate = safe_float(m.get("funding_rate"))
        if raw_rate is None:
            continue
        interval = periods.get(symbol, 8.0)
        asset, mult = canonicalize(symbol)
        mark = safe_float(m.get("mark_price"))
        oi_base = safe_float(m.get("open_interest"))
        out.append(
            NormalizedRate(
                venue=name,
                asset=asset,
                venue_symbol=symbol,
                raw_rate=raw_rate,
                interval_hours=interval,
                annualized_pct=annualize_pct(raw_rate, interval),
                mark_price=mark / mult if mark is not None else None,
                oi_usd=oi_base * mark if (oi_base is not None and mark is not None) else None,
                next_funding_ts=None,
                fetched_at=now,
            )
        )
    return out
