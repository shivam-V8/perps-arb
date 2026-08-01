"""Redis hot-state schema. All keys live here.

cm:rates:{venue}  JSON array of NormalizedRate dicts — atomic single-key swap
cm:hb:{venue}     unix ts of last successful full poll
cm:err:{venue}    JSON {consecutive_errors, last_error, last_error_ts}
"""

import json
import time

import redis.asyncio as aioredis

from .config import settings
from .models import NormalizedRate

RATES_TTL_S = 15 * 60

VENUES = ["hyperliquid", "binance", "bybit", "lighter", "paradex", "aster"]


def new_client() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, decode_responses=True)


async def write_venue(r: aioredis.Redis, venue: str, rates: list[NormalizedRate]) -> None:
    payload = json.dumps([x.to_dict() for x in rates])
    async with r.pipeline(transaction=True) as pipe:
        pipe.set(f"cm:rates:{venue}", payload, ex=RATES_TTL_S)
        pipe.set(f"cm:hb:{venue}", str(time.time()))
        pipe.set(f"cm:err:{venue}", json.dumps({"consecutive_errors": 0, "last_error": None, "last_error_ts": None}))
        await pipe.execute()


async def write_error(r: aioredis.Redis, venue: str, consecutive: int, error: str) -> None:
    await r.set(
        f"cm:err:{venue}",
        json.dumps({"consecutive_errors": consecutive, "last_error": error[:500], "last_error_ts": time.time()}),
    )


async def read_all(r: aioredis.Redis) -> dict[str, dict]:
    """Return {venue: {rates: [...], hb: float|None, err: {...}}} for all venues."""
    async with r.pipeline(transaction=False) as pipe:
        for v in VENUES:
            pipe.get(f"cm:rates:{v}")
            pipe.get(f"cm:hb:{v}")
            pipe.get(f"cm:err:{v}")
        flat = await pipe.execute()

    out: dict[str, dict] = {}
    for i, v in enumerate(VENUES):
        rates_raw, hb_raw, err_raw = flat[i * 3 : i * 3 + 3]
        out[v] = {
            "rates": json.loads(rates_raw) if rates_raw else [],
            "hb": float(hb_raw) if hb_raw else None,
            "err": json.loads(err_raw) if err_raw else {"consecutive_errors": 0, "last_error": None, "last_error_ts": None},
        }
    return out


def venue_status(hb: float | None, now: float) -> tuple[str, int | None]:
    """Return (status, age_s). Status: live | degraded | down."""
    if hb is None:
        return "down", None
    age = int(now - hb)
    return ("live" if age < settings.stale_after_s else "degraded"), age
