# ChainMatch Perps — Product Requirements Document
**Domain:** chainmatch.ai · **Version:** 1.0 · **Date:** July 2026 · **Owner:** Shivam (solo founder/dev)

---

## 1. Product Vision

ChainMatch Perps is a cross-venue perpetuals opportunity matcher. It continuously scans funding rates, fees, and liquidity across the major perp DEXs and CEX reference markets, ranks live market-neutral opportunities (funding arbitrage, basis trades, cross-venue funding spreads), and lets the user execute the matched position in one click through Hyperliquid with a builder code attached.

**One-line pitch:** "Paste in your capital, get matched to the best market-neutral yield in crypto right now — and open it in one click."

**Why this wins:** every existing funding scanner (Loris, FundingView, CoinGlass, Buildix) is read-only. Every existing aggregator (Liquid, Bullpen) is a generalist trading terminal. Nobody owns the specific job: *find and execute market-neutral yield across venues*. That job has a high-willingness-to-pay user (yield farmers, funding arbers, treasuries, prop traders) and a zero-audit monetization primitive (Hyperliquid builder codes).

**What this is NOT (v1):** not a generalist perp aggregator, not a memecoin terminal, not a vault/asset-management product (no pooled custody — that triggers regulatory burden), not a mobile app.

---

## 2. Goals & Success Metrics

### Business goals
| Horizon | Goal | Metric |
|---|---|---|
| Month 1 | Validate demand | 200+ waitlist signups, 50+ daily visitors to free table |
| Month 3 | Live execution | First builder-code fees on-chain; ≥ $250k cumulative routed volume |
| Month 6 | Revenue floor | $1k–$3k/month combined (builder fees + referral + Pro) |
| Month 12 | Middle of builder pack | $10k+/month; $1M+/day routed volume on good months |

### Product health metrics
- **North star:** monthly routed volume through builder code (directly proportional to revenue).
- Weekly active matched-opportunity viewers; alert subscribers; execution conversion rate (viewed opportunity → executed); Pro conversion rate; position retention (avg days a delta-neutral position stays open — longer = stickier rebalancing revenue).

### Kill / pivot criteria
- < 200 waitlist signups and negligible X traction after 4 weeks of daily spread-posting → pivot wedge to copy-trading (idea #2 from research).
- < $1k/month builder fees after 3 months of live execution → keep the free audience, shift monetization weight to Pro subscription + affiliate, or fold in copy-trading.

---

## 3. Users & Personas

**P1 — The Funding Arber (primary).** Trades $10k–$500k of own capital. Already runs delta-neutral trades manually across 2–3 venues using CoinGlass + exchange tabs + a spreadsheet. Pain: finding the best spread is manual, sizing both legs is error-prone, funding flips silently and eats the position. Pays for: execution speed, auto-rebalance, reversal alerts. This user generates the routed volume.

**P2 — The Passive Yield Hunter.** Holds $5k–$50k stablecoins, understands "funding = yield" at a surface level, won't manage two legs manually. Pain: wants the 15–40% APY headline without operational complexity. Pays for: one-click "open the matched trade," guardrails, plain-language risk display. Largest audience, converts via content.

**P3 — The Prop/Small-Fund Trader.** Runs $500k+. Uses the free matcher as a screener, executes on their own rails. Pain: no unified historical funding-spread dataset for backtesting. Pays for: Pro API + historical data. Small count, high ARPU, low routing revenue.

**P4 — The Airdrop/Points Farmer (opportunistic).** Farms new perp DEX points (Lighter, Paradex, Pacifica). Uses funding arb as a low-risk way to generate qualifying volume. Served by cross-venue spread data + referral links; monetized via affiliate signups.

---

## 4. Core Product Concepts

### 4.1 Opportunity types (v1 supports the first two; v1.5 adds the third)
1. **Spot–perp basis (single venue, Hyperliquid):** long spot HYPE/BTC/ETH/SOL on HL spot, short the same-size perp on HL. Collect funding when positive. Simplest to execute atomically through one venue — this is the MVP execution product.
2. **Cross-venue funding spread (display + guided execution):** short perp on Venue A (high positive funding — you receive), long perp on Venue B (low/negative funding — you receive or pay less). v1 displays and alerts; execution is guided (we place the HL leg via builder code, deep-link the other leg with our referral code). Full dual-venue execution is v2.
3. **CEX–DEX basis:** perp vs perp between Binance/Bybit and HL. Reference display only in v1 (drives credibility and SEO); no CEX order routing.

### 4.2 The Match Score
Every opportunity is ranked by a single 0–100 **Match Score**, computed per user inputs (capital size, risk tolerance, venue whitelist):

```
MatchScore = w1·NetAPY + w2·Stability + w3·Liquidity + w4·ExecutionCost + w5·VenueRisk
```

- **NetAPY:** annualized funding differential minus estimated fees (taker/maker on both legs, builder fee, est. slippage at user's size). Funding intervals normalized: HL funding is hourly; Binance/Bybit 8h; other DEXs vary — everything converted to annualized %.
- **Stability:** how long the current spread has persisted + variance of the funding rate over trailing 7d (a 60% APY that flips every 4 hours scores below a stable 18%).
- **Liquidity:** order-book depth at ±10bps on both legs relative to user's size; open interest caps.
- **ExecutionCost:** round-trip cost to enter AND exit at user's size (many "juicy" spreads die on exit slippage).
- **VenueRisk:** static tier per venue (HL = A, established DEXs = B, new points-farming venues = C) shown transparently.

The Match Score is the product's brand asset — it is what makes this a *matcher* rather than a table, and it justifies the domain name. Weights are tuned manually at first; publish the methodology page for trust.

### 4.3 Position lifecycle (executed positions)
`Matched → Opened (both legs filled) → Monitored (delta drift, funding trend) → Alert (funding compressing / flipped / liquidation distance) → Rebalance (optional auto) → Closed (one click, both legs)`.

---

## 5. Feature Specification

### Phase 0 — Landing + Live Table (Week 0–1) — validation
- **F0.1** Landing page: pitch, live embedded top-5 spread table, waitlist email capture, methodology teaser.
- **F0.2** Public read-only spread table: asset × venue matrix of current annualized funding, sortable, top cross-venue spreads highlighted, auto-refresh 60s. No login. This page is the marketing engine — every screenshot posted on X points here.
- **F0.3** OG-image generation per top spread (auto-generated card: "BTC funding spread: HL vs Lighter = 22.4% APY") for daily X posts.

### Phase 1 — Matcher + Alerts (Week 2–5)
- **F1.1** Opportunity feed: ranked list of live opportunities with Match Score, Net APY at three size presets ($5k/$25k/$100k), venue pair, stability sparkline (7d funding history), and a per-opportunity detail view showing the exact two legs, fees breakdown, and break-even holding time.
- **F1.2** Capital input: user enters size + risk tier → all Net APYs and Match Scores recompute for their size (slippage-adjusted). No wallet needed.
- **F1.3** Alerts: Telegram bot + email. Free tier: 1 alert rule (e.g., "any spread > 20% APY on BTC/ETH"). Rule types: spread above X, funding flip on tracked position, new venue listing. Telegram chosen first — this audience lives there.
- **F1.4** Historical spread charts (30d free / full history Pro-gated later).
- **F1.5** Accounts: wallet-connect (SIWE) or email. Store watchlists + alert rules.

### Phase 2 — One-Click Execution on Hyperliquid (Week 5–10) — the revenue engine
- **F2.1** Builder registration + fee approval flow: on first execution, user signs the Hyperliquid `ApproveBuilderFee` action (EIP-712) approving ChainMatch's builder address at **1.0 bps (perps)** initial fee (undercutting the 3–5 bps incumbents; raise later with feature depth). One-time approval; revocable; shown transparently with a "you pay us $1 per $10k traded" plain-language line.
- **F2.2** Agent-key session: user approves a scoped agent wallet (HL "API wallet") that can place orders but **cannot withdraw**. Key generated client-side, held in memory/session only (see Security). This removes per-order wallet popups → real one-click UX.
- **F2.3** One-click delta-neutral open (HL spot–perp basis): user picks opportunity + size → app computes both legs (spot buy + perp short, matched notional, leverage 1–2x on perp side), previews total fees + est. entry slippage + liquidation price → single confirm → both orders placed sequentially with IOC/limit-with-buffer logic; partial-fill reconciliation auto-sizes the second leg to actual first-leg fill.
- **F2.4** Position dashboard: live PnL split into funding earned vs price PnL (should net ~0), delta drift %, current funding trend, projected APY, liquidation distance.
- **F2.5** One-click close: unwinds both legs, shows realized funding captured.
- **F2.6** Guided cross-venue mode: for cross-DEX spreads, execute the HL leg natively; for the other venue show exact order parameters + deep link with ChainMatch referral code attached.
- **F2.7** Referral integration: signup links with revshare codes for every non-HL venue listed (Lighter, Aster, EdgeX, Paradex, Bybit, Binance where program available).

### Phase 3 — Retention + Pro (Week 10–16)
- **F3.1** Auto-rebalance (opt-in): keep delta within ±1% band; rebalance via agent key; each rebalance routes volume → compounding builder-fee revenue. Hard safety rails: max rebalances/day, max size, kill switch.
- **F3.2** Auto-exit rules: "close if funding < X for Y hours," "close if net APY < fees."
- **F3.3** Pro tier ($29/mo, $290/yr): full funding history + CSV export, backtester ("what would this spread have earned over 90d"), unlimited alert rules, multi-wallet tracking, REST API (rate-limited), priority data refresh (5s vs 60s).
- **F3.4** Copy the vault operators (borrowed from idea #2): leaderboard of wallets running the largest delta-neutral books on HL (fully on-chain, queryable), one-click mirror of their basis positions → more routed volume.
- **F3.5** AI intent layer (thin, justifies the .ai): chat box → "I have 20k USDC, medium risk, market-neutral" → returns top 3 matched opportunities via the existing engine + one-click execute. Implemented as an LLM function-calling wrapper over the internal matcher API. Marketing feature, not core.

### Explicit non-goals for v1
Pooled vaults / managing user funds · CEX API-key trading · mobile apps · perp aggregation beyond HL execution · options/exotics · token launch.

---

## 6. Technical Architecture

```
                 ┌─────────────────────────────────────────────┐
                 │                 FRONTEND                     │
                 │  Next.js 14 (App Router) · wagmi/viem ·      │
                 │  RainbowKit · TanStack Query · Recharts      │
                 │  Vercel hosting                              │
                 └───────────────┬─────────────────────────────┘
                                 │ REST + WebSocket
                 ┌───────────────┴─────────────────────────────┐
                 │              API / APP SERVER                │
                 │  Node.js (Fastify) or Python (FastAPI)       │
                 │  Auth (SIWE + email magic link)              │
                 │  Matcher API · Alerts API · Positions API    │
                 └───────┬───────────────┬─────────────────────┘
                         │               │
        ┌────────────────┴───┐   ┌───────┴──────────────────────┐
        │  INGESTION WORKERS  │   │   EXECUTION SERVICE          │
        │  1 worker / venue   │   │  HL order placement w/       │
        │  WS + REST pollers  │   │  builder code param          │
        │  Funding, OB depth, │   │  Two-leg sequencer,          │
        │  OI, prices         │   │  fill reconciliation,        │
        └───────┬────────────┘   │  rebalancer cron             │
                │                └───────┬──────────────────────┘
        ┌───────┴────────────────────────┴─────┐
        │           DATA LAYER                  │
        │  Redis (hot: latest rates, OB snaps)  │
        │  Postgres + TimescaleDB (history:     │
        │  funding series, spreads, positions,  │
        │  fills, users, alert rules)           │
        └───────────────────────────────────────┘
        Telegram Bot (grammY/aiogram) · Resend (email) · Stripe + crypto pay (Pro)
```

**Stack choice rationale:** Python (FastAPI + asyncio) for ingestion/execution is the fastest path given existing funding-arb dashboard code can be reused; Next.js frontend. Single VPS (Hetzner/Fly.io, 4vCPU) + managed Postgres is sufficient well past $10k/mo revenue. Keep it boring.

### 6.1 Data ingestion
| Venue | Method | Data | Poll/stream |
|---|---|---|---|
| Hyperliquid | WS `activeAssetCtx` + REST `metaAndAssetCtxs` | funding (hourly), mark, OI, L2 book | WS live + 30s REST |
| Lighter, Aster, EdgeX, Paradex, Ostium, Drift | public REST/WS per venue | funding, mark, OI, depth | 30–60s |
| Binance, Bybit (reference) | public REST | 8h funding, mark | 60s |

- Normalize all funding to **annualized %** (HL hourly ×24×365; 8h venues ×3×365; per-venue intervals from metadata, never hardcoded).
- Store raw rate + normalized rate + timestamp in Timescale hypertable (`funding_rates`), retention: raw 1y, downsampled forever.
- Depth snapshots: top-of-book ±10 levels every 60s for slippage estimation (`book_snapshots`), retention 7d.
- Each worker is an independent process with heartbeat; a stale feed (> 3 min) marks the venue "degraded" in UI and excludes it from Match Scores rather than showing wrong data. **Never show stale rates as live.**

### 6.2 Matcher engine
- Runs every 30s over Redis hot state: enumerate asset × venue-pair combinations (filtered to assets listed on ≥ 2 venues + HL spot pairs), compute Net APY at the 3 size presets, compute Match Score, write ranked feed to Redis; push deltas over WS.
- Slippage model v1: walk the stored book snapshot for the user's size (simple, honest, transparent). v2: impact model fit from snapshots.
- Fees table per venue (maker/taker/builder) versioned in DB, admin-editable — venues change fees often.

### 6.3 Execution service (Hyperliquid)
- **Builder setup (one-time, founder):** fund builder wallet with ≥ 100 USDC in HL perps account; this address is the `b` param on all routed orders.
- **User onboarding tx flow:** (1) connect wallet → (2) sign `ApproveBuilderFee` (EIP-712, fee expressed in tenths of a bp — 1.0 bps = `"0.001%"`) → (3) approve agent wallet (`ApproveAgent`) with a named key `chainmatch-session`.
- **Order placement:** all orders sent with `builder: {b: <builder_addr>, f: <fee>}`. Two-leg sequencer: place leg 1 as limit-with-buffer (mark ± 5bps, IOC fallback), await fill via WS, size leg 2 to *actual* filled notional, place leg 2, reconcile. If leg 2 fails after leg 1 fill → immediate retry ×3 → auto-unwind leg 1 + alert user. All transitions journaled in `executions` table for support/debugging.
- **Rebalancer (Phase 3):** cron every 5 min over open auto-managed positions; if |delta| > band, compute correcting order, place via agent key, journal. Global kill switch env var.

### 6.4 Database schema (core tables)
```
users(id, wallet_addr, email, tier, created_at)
alert_rules(id, user_id, type, params_jsonb, channel, active)
funding_rates(venue, asset, ts, raw_rate, interval, annualized)   -- hypertable
book_snapshots(venue, asset, ts, bids_jsonb, asks_jsonb)          -- hypertable, 7d TTL
opportunities(id, ts, type, asset, venue_a, venue_b, net_apy_5k/25k/100k, match_score, meta_jsonb)
positions(id, user_id, opp_type, legs_jsonb, status, opened_at, closed_at, funding_earned, price_pnl)
executions(id, position_id, leg, order_payload, fill_payload, status, ts)
referral_clicks(id, venue, user_id?, ts)
```

### 6.5 Security requirements (non-negotiable)
- **Non-custodial always.** No private keys server-side, ever. Agent keys generated client-side, kept in memory (sessionStorage at most, encrypted), expire ≤ 72h, scoped name, revocation button in UI. Server receives *signed actions*, not keys — or (simpler v1) all order signing happens client-side and the server only prepares payloads. Decide in build week 5; client-side signing is the safer default even though it constrains auto-rebalance (Phase 3 can use HL's server-side agent pattern with explicit user opt-in and its own dedicated agent key).
- Strict CSP headers (no inline scripts, no third-party script injection surface), no third-party analytics that can read DOM on execution pages, dependency pinning + lockfile audit in CI. XSS on an execution frontend = drained sessions; treat frontend supply chain as the top threat.
- Rate limits + size caps per user in v1 (max $250k notional/position) until execution paths are battle-tested.
- Public status page (venue feed health + execution service health).

---

## 7. Monetization

| Stream | Mechanism | v1 setting | Expected mix at month 6 |
|---|---|---|---|
| Builder-code fees | HL `builder` param on every routed order | 1.0 bps perps (intro) | 60–70% |
| Venue referrals | Signup links w/ revshare (Lighter, Aster, EdgeX, Bybit, Binance etc.) | 20–50% revshare per venue program | 15–25% |
| Pro subscription | Stripe + crypto payments | $29/mo · $290/yr | 10–20% |

- **Revenue model math (builder fees):** revenue/day = routed volume × 1.0 bps. $1M/day routed → ~$100/day → ~$3k/mo. Rebalancing volume compounds this: 20 open auto-managed positions averaging $50k rebalancing 4%/day adds ~$40k/day routed passively.
- **Fee philosophy:** launch cheap (1 bps vs incumbents' 3–5+), win the price-sensitive arber, raise to 2–3 bps only after auto-rebalance ships (users then pay for management, not access). Always display the fee in dollars in the confirm modal — trust is the moat.
- **Pro pricing test:** $29/mo anchor; run a founding-member $19/mo lifetime-rate cohort at launch for testimonials.

---

## 8. Go-to-Market

1. **Founder-led X account (daily, from day 1):** post the top spread card every day (auto-generated OG image, F0.3), weekly "state of funding" thread, screenshots of realized funding captured on own positions (trade the product publicly with own capital — nothing markets a yield tool like receipts).
2. **Free-tool-first:** the public table has zero login wall; it is the SEO + CT asset. Target queries: "funding rate arbitrage 2026", "hyperliquid funding vs lighter", "best funding rate scanner", "delta neutral crypto yield". One comparison page per venue-pair (programmatic SEO from own data).
3. **Community seeding:** HL ecosystem Discord/Telegram groups, Lighter/Paradex points-farming groups (P4 persona), r/CryptoMarkets-type subs (light touch).
4. **Telegram alert bot as viral loop:** every alert footer links the opportunity page; free tier limited to 1 rule → upgrade path.
5. **KOL routing (the power-law lever):** after execution is stable, offer 1–2 mid-tier trading KOLs a builder-fee revshare sub-code for volume they route. One KOL routing $5M/day changes the business.
6. **Product Hunt / launch platforms:** for the Pro/backtester layer specifically, not the trading tool.

---

## 9. Build Plan & Timeline (solo dev, aggressive but realistic)

| Weeks | Milestone | Ships |
|---|---|---|
| 0–1 | **Validate** | Landing, live table (HL + Binance + 2 DEXs), waitlist, OG cards, X account starts daily posting |
| 2–5 | **Matcher** | 6+ venues ingested, Match Score, opportunity feed + detail pages, capital-size recompute, Telegram+email alerts, accounts |
| 5–8 | **Execute (alpha)** | Builder registration, ApproveBuilderFee + agent-key flow, one-click HL spot–perp basis open/close for whitelisted alpha users (own capital first, then 10–20 users, $10k position cap) |
| 8–10 | **Execute (public)** | Public execution, position dashboard, guided cross-venue mode, referral links live |
| 10–14 | **Retention** | Auto-rebalance (opt-in), auto-exit rules, historical charts full |
| 14–16 | **Monetize fully** | Pro tier + backtester + API, AI intent chat, copy-the-vault-operators leaderboard |

**Weekly cadence rule:** ship something visible every week and post it. The X account and the product compound together.

---

## 10. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Volume cyclicality (builder fees track market volume; HL earnings fell ~43% from Q3-25 peak) | High | Three revenue streams; Pro sub is counter-cyclical (backtesting demand persists); keep burn ~$0 (single VPS) |
| Frontend supply-chain / XSS → agent-key theft | High | Client-side signing default, strict CSP, no third-party scripts on execution routes, short-lived scoped agent keys, size caps |
| Two-leg execution failure (one leg fills, other doesn't) | High | Sequencer with reconciliation + auto-unwind + journaling; alpha-gate with caps before public |
| Users lose money on funding reversals and blame the tool | Med | Stability score, reversal alerts on by default, break-even-hold-time shown pre-trade, plain-language risk box, methodology page |
| Venue API changes/instability | Med | Per-venue isolated workers, degraded-state UI, never display stale as live |
| Incumbent (Liquid/Bullpen) adds a basis-trade tab | Med | Specialist depth (score, backtester, auto-rebalance) + cheapest fee + content moat; they optimize for generalist volume |
| Regulatory (UAE/VARA) | Low-Med | Pure non-custodial software interface, no pooled funds, no advice language ("data + execution tooling"), geo-block sanctioned jurisdictions, add ToS/risk disclosure at execution launch; get a one-off legal review before public execution (Dubai has accessible VARA-aware counsel) |
| Solo-founder bus factor / burnout | Med | Boring stack, heavy journaling/observability, kill switches, weekly scope discipline (this PRD is the scope contract) |

---

## 11. Open Questions (decide during build)
1. Client-side signing only vs server-side agent for auto-rebalance — resolve by week 5 with a security-first bias.
2. Initial venue list beyond HL: confirm which of Lighter/Aster/EdgeX/Paradex/Ostium have stable public funding + depth endpoints and live referral programs (verify current docs at build time).
3. Pro payment rails: Stripe availability for the entity vs crypto-native (e.g., USDC on HyperEVM) — likely both.
4. Entity/jurisdiction for the builder wallet + Stripe + affiliate payouts (UAE free-zone entity is the default candidate given residency).
5. Whether to publish the Match Score weights fully (trust) or partially (moat) — default: publish v1 fully, differentiate on data + execution.

---

## 12. Definition of Done (v1 complete)
- Public matcher live with ≥ 6 venues and honest degraded-state handling.
- One-click HL basis open/close in production with builder code attached, ≥ 50 positions executed without an unreconciled failure.
- First on-chain builder fees received; referral links live on ≥ 3 venues; Pro tier purchasable.
- Daily automated spread post pipeline running; 500+ Telegram alert subscribers.
