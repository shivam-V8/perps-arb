# ChainMatch

Résumé-to-job matching for any field — [chainmatch.ai](https://chainmatch.ai).

- **Job seekers** upload a résumé (PDF/DOCX/TXT) or a LinkedIn "Save to PDF" export. Claude builds an editable profile, then searches the web for **live postings** and **companies hiring** for that profile, ranked with reasons. Swipe to save, draft a cover note, apply on the company's site.
- **Recruiters** paste a job description (or one sentence). Claude structures it, then ranks candidates who opted in to be found. Swipe right to invite; when a candidate accepts, their name, email and résumé unlock and a chat opens.

## Stack

`apps/web` — Next.js 15 (App Router), Tailwind v4, shadcn/ui, Framer Motion, **Postgres + Drizzle ORM**, Claude (`claude-opus-5-5`). Fonts: Bricolage Grotesque + Inter. No login yet: each browser gets an anonymous, signed identity cookie.

## Setup

```bash
docker compose up -d db                      # local Postgres on :5433
cd apps/web
cp .env.example .env.development.local     # fill ANTHROPIC_API_KEY; set SESSION_SECRET (dev-only file: never baked into builds)
pnpm install
pnpm db:migrate                              # apply drizzle/ migrations
pnpm db:seed                                 # optional: 8 fake visible candidates (dev only)
pnpm dev                                     # http://localhost:3000
pnpm test                                    # privacy-rule tests (needs the chainmatch_test database, see below)
NEXT_DIST_DIR=.next-build pnpm build         # separate dir so it can run beside `pnpm dev`
```

Tests run against `chainmatch_test`: `docker exec perps-arb-db-1 psql -U chainmatch -c "create database chainmatch_test"` once.

Schema changes: edit `src/db/schema.ts`, then `pnpm db:generate` and `pnpm db:migrate`.

## Identity (no login yet)

`src/middleware.ts` gives every browser a random id in an http-only cookie signed with `SESSION_SECRET`. Profiles, saved jobs, roles, invites and chats hang off that id. "Start over" on the profile page drops it. Real sign-in can attach to the same `users` table later.

## Privacy model (enforced in `src/server/data.ts`, covered by `data.test.ts`)

- Candidates are hidden until they turn on "Let recruiters find me".
- Recruiter search returns anonymous fields only (no name, email, job highlights or résumé).
- Invites need the candidate to be visible and the role to belong to the recruiter; only the invited candidate can accept.
- After acceptance, that recruiter (only) sees the candidate's name, email and résumé (`/api/resume/<id>`), and both sides can chat (polling every 3s).
- Résumé files are stored in Postgres (`resumes` table), served only through that access check.

## AI

| Route | Does |
| --- | --- |
| `POST /api/resume/linkedin` | LinkedIn profile URL → profile draft from **public web research** (Claude web search; never requests linkedin.com), with source links and a list of what it couldn't find. User must confirm it's their own profile |
| `POST /api/resume/parse` | Résumé / LinkedIn PDF / pasted text → candidate profile (PDF sent to Claude as a document; DOCX via mammoth) |
| `POST /api/jobs/search` | Claude web search finds postings + companies → companies' **ATS job feeds** (Greenhouse, Lever, Ashby, Workable, SmartRecruiters) confirm which are still open, drop closed ones, and add more live postings ranked for the candidate |
| `POST /api/jobs/cover-note` | Cover note for a saved posting, from the candidate's own profile |
| `POST /api/roles/draft` | Job description → structured role |
| `POST /api/candidates/search` | Postgres full-text prefilter → Claude ranks with reasons |
| `POST /api/ai/chat` | Three suggested messages in a conversation |

Cost note: each job search runs several web searches plus a long model turn; it's triggered on demand ("Search again"), and results are stored.

LinkedIn link import order: (1) **Firecrawl** provider data when `FIRECRAWL_API_KEY` is set (`src/lib/linkedin/firecrawl.ts`; FullEnrich `people/match`, ~1–5 credits per match, no charge on no match; needs Alexandria enabled and the third-party data terms accepted by a Firecrawl org admin); (2) public web research; (3) copy-paste of the user's own profile page or the LinkedIn data-export ZIP. Since Nov 2025 LinkedIn hides experience/education from logged-out visitors, so live page reads can't get work history; provider data may lag recent edits. LinkedIn's User Agreement prohibits automated collection: imports are user-initiated, own-profile only, low volume, and Firecrawl should be listed as a processor in the privacy policy.

Older note — LinkedIn: we don't scrape linkedin.com (login wall, bot protection, and against LinkedIn's terms). A pasted profile link is researched from publicly indexed sources, which is what backdoorai.app's published vendor list (xAI + Firecrawl web research, no LinkedIn data vendor) suggests they do too. For the full work history, the "Save to PDF" export is the reliable path.

ATS feeds (`src/lib/jobs/ats.ts`) are public, key-less endpoints each ATS publishes for listing jobs elsewhere; only those fixed hosts are called. Discovered boards are cached in `company_boards`. `pnpm smoke:ats` checks them live.

Quotas: with no login, costly actions are capped per browser identity in production (`QUOTAS` in `src/server/data.ts`, overridable via `QUOTA_*_PER_HOUR`). Off in development unless `ENFORCE_QUOTAS=1`. Failures on our side are refunded; the limit message shows minutes until the next lookup.

## Where things live

- `src/app/(app)/` — app pages: `jobs`, `saved`, `invites` (candidate); `roles`, `roles/new`, `roles/[id]` (recruiter); `matches`, `profile`
- `src/app/actions.ts` — server actions (save profile, swipes, invites, roles)
- `src/server/data.ts` — every query, with the access checks; `src/server/session.ts` — current identity
- `src/db/schema.ts`, `drizzle/` — schema and migrations; `scripts/seed.ts` — demo data
- `src/lib/ai/` — Claude helpers, schemas, job search loop
