import time

from fastapi import APIRouter, Query, Request

from .. import spreads as spreads_mod
from .. import store
from ..store import venue_status

router = APIRouter()

# 5s in-process memo over the read path — sub-ms compute at this size,
# the memo just absorbs request bursts.
_CACHE_TTL = 5.0
_cache: dict[str, tuple[float, dict]] = {}


async def _state(request: Request) -> dict:
    key = "state"
    now = time.monotonic()
    hit = _cache.get(key)
    if hit and now - hit[0] < _CACHE_TTL:
        return hit[1]
    state = await store.read_all(request.app.state.redis)
    _cache[key] = (now, state)
    return state


@router.get("/healthz")
async def healthz() -> dict:
    return {"ok": True}


@router.get("/v1/rates")
async def rates(request: Request) -> dict:
    state = await _state(request)
    now = time.time()

    venues_out = []
    for venue, s in state.items():
        status, age = venue_status(s["hb"], now)
        venues_out.append({"venue": venue, "status": status, "last_success_ts": s["hb"], "age_s": age})

    by_asset: dict[str, dict[str, dict]] = {}
    for venue, s in state.items():
        for row in s["rates"]:
            by_asset.setdefault(row["asset"], {})[venue] = {
                "annualized_pct": row["annualized_pct"],
                "raw_rate": row["raw_rate"],
                "interval_hours": row["interval_hours"],
                "mark_price": row["mark_price"],
                "oi_usd": row["oi_usd"],
                "next_funding_ts": row["next_funding_ts"],
                "fetched_at": row["fetched_at"],
            }

    assets = [{"asset": a, "rates": r} for a, r in by_asset.items()]
    # venue-count desc, then max |annualized| desc — most comparable assets first
    assets.sort(
        key=lambda x: (len(x["rates"]), max(abs(r["annualized_pct"]) for r in x["rates"].values())),
        reverse=True,
    )
    return {"updated_at": int(now), "venues": venues_out, "assets": assets}


@router.get("/v1/spreads/top")
async def top_spreads(request: Request, limit: int = Query(default=5, ge=1, le=100)) -> dict:
    state = await _state(request)
    result = spreads_mod.compute(state, limit=limit)
    return {
        "updated_at": result["updated_at"],
        "spreads": result["spreads"],
    }


@router.get("/v1/health")
async def health(request: Request) -> dict:
    state = await _state(request)
    result = spreads_mod.compute(state)
    return {
        "venues": result["venues"],
        "symbol_conflicts": result["symbol_conflicts"],
    }
