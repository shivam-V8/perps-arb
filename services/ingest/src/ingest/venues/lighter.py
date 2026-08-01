"""Lighter: GET /api/v1/funding-rates + /api/v1/orderBookDetails, joined on market_id.

funding-rates also carries binance/bybit/hyperliquid rows — we keep ONLY
exchange == "lighter" (the others are ingested first-party).
`rate` is a JSON number (the one venue that doesn't use strings).

INTERVAL: the `rate` field is an 8H-EQUIVALENT rate, verified empirically —
the endpoint's own `bybit` row matches Bybit's direct 8h fundingRate exactly,
and its `hyperliquid` row is ~8x HL's hourly rate. Funding is PAID hourly
(1/8 of the 8h rate per hour, per docs.lighter.xyz), but for annualization the
quoted rate divides over 8h. Treating it as hourly inflates APY 8x (BTC showed
84% vs ~5-10% everywhere else). No API field exposes this; if Lighter changes
quote units, the >10x-median outlier log in spreads.py is the tripwire.
"""

import time

import httpx

from ..models import NormalizedRate, annualize_pct
from ..symbols import canonicalize
from .base import safe_float

BASE = "https://mainnet.zklighter.elliot.ai/api/v1"

name = "lighter"


async def fetch(http: httpx.AsyncClient) -> list[NormalizedRate]:
    rates_resp = await http.get(f"{BASE}/funding-rates")
    rates_resp.raise_for_status()
    books_resp = await http.get(f"{BASE}/orderBookDetails")
    books_resp.raise_for_status()
    now = time.time()

    books: dict[int, dict] = {}
    for b in books_resp.json().get("order_book_details", []):
        if b.get("status") == "active":
            books[b["market_id"]] = b

    out: list[NormalizedRate] = []
    for row in rates_resp.json().get("funding_rates", []):
        if row.get("exchange") != "lighter":
            continue
        book = books.get(row.get("market_id"))
        if book is None:  # inactive market (junk marks like SKHYNIX=1231123)
            continue
        raw_rate = safe_float(row.get("rate"))
        if raw_rate is None:
            continue
        symbol = row.get("symbol") or book.get("symbol") or ""
        asset, mult = canonicalize(symbol)
        mark = safe_float(book.get("mark_price"))
        oi_base = safe_float(book.get("open_interest"))
        out.append(
            NormalizedRate(
                venue=name,
                asset=asset,
                venue_symbol=symbol,
                raw_rate=raw_rate,
                interval_hours=8,  # 8h-equivalent quote, paid hourly — see module docstring
                annualized_pct=annualize_pct(raw_rate, 8),
                mark_price=mark / mult if mark is not None else None,
                oi_usd=oi_base * mark if (oi_base is not None and mark is not None) else None,
                next_funding_ts=None,
                fetched_at=now,
            )
        )
    return out
