import asyncio
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .config import settings
from .poller import run_poller
from .store import new_client
from .venues import aster, binance, bybit, hyperliquid, lighter, paradex

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

ADAPTERS = [hyperliquid, binance, bybit, lighter, paradex, aster]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = new_client()
    app.state.http = httpx.AsyncClient(
        timeout=settings.request_timeout_s,
        headers={"User-Agent": "chainmatch-ingest/0.1 (+https://chainmatch.ai)"},
    )
    tasks = [asyncio.create_task(run_poller(a, app.state.http, app.state.redis), name=f"poll:{a.name}") for a in ADAPTERS]
    try:
        yield
    finally:
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        await app.state.http.aclose()
        await app.state.redis.aclose()


app = FastAPI(title="chainmatch-ingest", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(router)
