"""Binance — sourced from Hyperliquid's predictedFundings feed, NOT fapi.binance.com.

fapi.binance.com returns HTTP 451 to US-region serverless/datacenter IPs.
HL's {"type":"predictedFundings"} returns, per coin, rows for HlPerp / BinPerp /
BybitPerp with fundingRate, nextFundingTime and fundingIntervalHours (per-coin,
4h or 8h — undocumented but present in the live response; never hardcode 8).

Caveats (disclosed on the methodology page): this is Binance's *predicted next*
rate, and it carries no mark price or OI — those stay None.
"""

import time

import httpx

from ..models import NormalizedRate, annualize_pct
from ..symbols import canonicalize
from .base import safe_float

INFO_URL = "https://api.hyperliquid.xyz/info"

name = "binance"


async def fetch(http: httpx.AsyncClient) -> list[NormalizedRate]:
    resp = await http.post(INFO_URL, json={"type": "predictedFundings"})
    resp.raise_for_status()
    now = time.time()

    out: list[NormalizedRate] = []
    for coin, venue_rows in resp.json():
        for venue_key, info in venue_rows:
            if venue_key != "BinPerp" or not info:
                continue
            raw_rate = safe_float(info.get("fundingRate"))
            interval = safe_float(info.get("fundingIntervalHours"), default=8.0)
            if raw_rate is None:
                continue
            asset, _mult = canonicalize(coin)
            next_ts = safe_float(info.get("nextFundingTime"))
            out.append(
                NormalizedRate(
                    venue=name,
                    asset=asset,
                    venue_symbol=coin,
                    raw_rate=raw_rate,
                    interval_hours=interval,
                    annualized_pct=annualize_pct(raw_rate, interval),
                    mark_price=None,
                    oi_usd=None,
                    next_funding_ts=int(next_ts / 1000) if next_ts else None,
                    fetched_at=now,
                )
            )
    return out
