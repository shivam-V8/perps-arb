"""Hyperliquid: POST /info {"type":"metaAndAssetCtxs"}.

Response is [meta, ctxs] — two parallel arrays zipped by index.
Funding is hourly. openInterest is in base units; USD = oi * markPx.
"""

import time

import httpx

from ..models import NormalizedRate, annualize_pct
from ..symbols import canonicalize
from .base import safe_float

INFO_URL = "https://api.hyperliquid.xyz/info"

name = "hyperliquid"


async def fetch(http: httpx.AsyncClient) -> list[NormalizedRate]:
    resp = await http.post(INFO_URL, json={"type": "metaAndAssetCtxs"})
    resp.raise_for_status()
    meta, ctxs = resp.json()
    now = time.time()

    out: list[NormalizedRate] = []
    for coin, ctx in zip(meta["universe"], ctxs):
        if coin.get("isDelisted"):
            continue
        raw_rate = safe_float(ctx.get("funding"))
        mark = safe_float(ctx.get("markPx"))
        if raw_rate is None or mark is None:
            continue
        asset, mult = canonicalize(coin["name"])
        oi = safe_float(ctx.get("openInterest"))
        out.append(
            NormalizedRate(
                venue=name,
                asset=asset,
                venue_symbol=coin["name"],
                raw_rate=raw_rate,
                interval_hours=1,
                annualized_pct=annualize_pct(raw_rate, 1),
                mark_price=mark / mult,
                oi_usd=oi * mark if oi is not None else None,
                next_funding_ts=None,  # HL funds every hour on the hour
                fetched_at=now,
            )
        )
    return out
