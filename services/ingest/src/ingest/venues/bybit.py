"""Bybit v5: GET /v5/market/tickers?category=linear.

fundingIntervalHour (singular "Hour") is inline per symbol.
openInterestValue is already USD. All numerics are strings.
Envelope: {retCode, retMsg, result: {list: [...]}}.
"""

import time

import httpx

from ..models import NormalizedRate, annualize_pct
from ..symbols import canonicalize
from .base import safe_float

TICKERS_URL = "https://api.bybit.com/v5/market/tickers"

name = "bybit"


async def fetch(http: httpx.AsyncClient) -> list[NormalizedRate]:
    resp = await http.get(TICKERS_URL, params={"category": "linear"})
    resp.raise_for_status()
    body = resp.json()
    if body.get("retCode") != 0:
        raise RuntimeError(f"bybit retCode={body.get('retCode')} retMsg={body.get('retMsg')}")
    now = time.time()

    out: list[NormalizedRate] = []
    for item in body["result"]["list"]:
        raw_rate = safe_float(item.get("fundingRate"))
        if raw_rate is None:  # odd/spot-ish listings carry empty fundingRate
            continue
        interval = safe_float(item.get("fundingIntervalHour"), default=8.0)
        symbol = item["symbol"]
        # Inverse/odd quotes would collide with linear after suffix stripping;
        # category=linear should be USDT/USDC only, but be strict.
        if not (symbol.endswith("USDT") or symbol.endswith("USDC") or symbol.endswith("PERP")):
            continue
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
                oi_usd=safe_float(item.get("openInterestValue")),
                next_funding_ts=int(next_ts / 1000) if next_ts else None,
                fetched_at=now,
            )
        )
    return out
