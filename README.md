# ChainMatch

Cross-venue perpetuals funding-rate matcher — [chainmatch.ai](https://chainmatch.ai).
Phase 0: landing page, live public funding table across 6 venues, waitlist, OG share cards.
Product spec: [`chainmatch-perps-prd.md`](./chainmatch-perps-prd.md).

## Layout

```
apps/web          Next.js 15 (App Router) — landing, /rates matrix, /s + /share OG pipeline → Vercel
services/ingest   Python 3.12 FastAPI — per-venue pollers, Redis hot state, /v1/* API → Fly.io
shared/           symbol-aliases.json — canonical symbol map (single source of truth)
```

Venues: Hyperliquid, Binance (via HL `predictedFundings` — fapi geo-blocks US IPs),
Bybit, Lighter, Paradex, Aster. Each poller is isolated; a feed stale >3 min is marked
degraded in the UI and excluded from spread ranking — never shown as live.

## Local dev

Prereqs: pnpm, uv, docker, just.

```sh
docker compose up -d redis                # hot state
just ingest                               # FastAPI on :8100 (local, hot reload)
pnpm install && pnpm --filter web dev     # web on :3000 (or just web)
```

`apps/web/.env.local` needs `INGEST_API_URL=http://localhost:8100` (defaulted in code).
Waitlist inserts are dropped with a console warning until `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` are set (schema: `apps/web/supabase/waitlist.sql`).

Tests: `just test` (symbol canonicalization + spread computation).

## Deploy

1. **Ingest → Fly.io**: `fly launch --no-deploy` (repo root), `fly redis create`,
   `fly secrets set REDIS_URL=... ALLOWED_ORIGINS=https://chainmatch.ai`, then
   `just deploy-ingest`. Config: `services/ingest/fly.toml` (auto-stop off — pollers run 24/7).
2. **Supabase**: run `apps/web/supabase/waitlist.sql` in the SQL editor.
3. **Web → Vercel**: root directory `apps/web`; env vars `INGEST_API_URL`
   (Fly URL), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WAITLIST_SALT`,
   `NEXT_PUBLIC_SITE_URL=https://chainmatch.ai`.
4. Point chainmatch.ai DNS at Vercel.

## Daily posting

`/share` (noindex) lists the top 5 live spreads with generated post text, the OG card
preview, and copy buttons. The `/s?asset=…` links unfurl the card on X.

## Correctness notes

- Annualization: `rate × (24 / interval_hours) × 365`, interval always from venue
  metadata (Bybit/Paradex/Aster/HL) — except Lighter, whose API quotes an
  8h-equivalent rate paid hourly (verified against its own cross-venue rows).
- Binance rates are *predicted next-interval* values from HL's feed (no mark/OI).
- Assets whose cross-venue mark prices disagree >5% are excluded from spreads and
  reported in `/v1/health.symbol_conflicts` (symbol-collision guard).
