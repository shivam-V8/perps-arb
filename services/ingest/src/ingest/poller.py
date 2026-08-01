"""Generic per-venue poll loop. One asyncio task per venue; total isolation.

Heartbeat is written only on success, so a failing venue naturally ages into
"degraded" at STALE_AFTER_S without any extra bookkeeping.
"""

import asyncio
import logging

import httpx
import redis.asyncio as aioredis

from . import store
from .config import settings
from .venues.base import VenueAdapter

log = logging.getLogger(__name__)

MAX_BACKOFF_EXP = 3  # cap backoff at 8x poll interval


async def run_poller(adapter: VenueAdapter, http: httpx.AsyncClient, r: aioredis.Redis) -> None:
    errors = 0
    while True:
        try:
            rates = await adapter.fetch(http)
            if rates:
                await store.write_venue(r, adapter.name, rates)
                log.info("%s: wrote %d rates", adapter.name, len(rates))
            else:
                raise RuntimeError("adapter returned 0 rates")
            errors = 0
        except asyncio.CancelledError:
            raise
        except Exception as e:
            errors += 1
            log.exception("%s: poll failed (consecutive=%d)", adapter.name, errors)
            try:
                await store.write_error(r, adapter.name, errors, repr(e))
            except Exception:
                log.exception("%s: failed to record error state", adapter.name)

        delay = settings.poll_interval_s * (2 ** min(errors, MAX_BACKOFF_EXP) if errors else 1)
        await asyncio.sleep(delay)
