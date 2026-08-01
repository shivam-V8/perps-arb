"""Aster: Binance-schema clone at fapi.asterdex.com (no geo-block).

GET /fapi/v1/premiumIndex (all symbols) -> lastFundingRate, markPrice, nextFundingTime
GET /fapi/v1/fundingInfo -> fundingIntervalHours for ALL symbols (better than
Binance's exceptions-only version). Absent symbol => 8h (Binance-clone convention).
"""

import time

import httpx

from ..models import NormalizedRate, annualize_pct
from ..symbols import canonicalize
from .base import safe_float

BASE = "https://fapi.asterdex.com/fapi/v1"

name = "aster"


async def fetch(http: httpx.AsyncClient) -> list[NormalizedRate]:
    prem_resp = await http.get(f"{BASE}/premiumIndex")
    prem_resp.raise_for_status()
    info_resp = await http.get(f"{BASE}/fundingInfo")
    info_resp.raise_for_status()
    now = time.time()

    intervals: dict[str, float] = {}
    for row in info_resp.json():
        iv = safe_float(row.get("fundingIntervalHours"))
        if iv:
            intervals[row.get("symbol", "")] = iv

    out: list[NormalizedRate] = []
    for item in prem_resp.json():
        symbol = item.get("symbol", "")
        raw_rate = safe_float(item.get("lastFundingRate"))
        if raw_rate is None or not symbol:
            continue
        interval = intervals.get(symbol, 8.0)
        asset, mult = canonicalize(symbol)
        mark = safe_float(item.get("markPrice"))
        next_ts = safe_float(item.get("nextFundingTime"))
        out.append(
            NormalizedRate(
                venue=name,
                asset=asset,
                venue_symbol=symbol,
                raw_rate=raw_rate,
                interval_hours=interval,
                annualized_pct=annualize_pct(raw_rate, interval),
                mark_price=mark / mult if mark is not None else None,
                oi_usd=None,  # premiumIndex carries no OI; add openInterest endpoint later if needed
                next_funding_ts=int(next_ts / 1000) if next_ts else None,
                fetched_at=now,
            )
        )
    return out
