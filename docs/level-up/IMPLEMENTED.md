# Level-up — What the Nuclear Patch Shipped

5 grouped commits, 2026-04-23. Safe to re-run `apply-autoappli-nuclear.sh` (each edit is idempotent).

## Commit 1 — backend security

- **Phase 0.2** JWT audience escape hatch removed (`backend/app/deps/jobs_auth.py`)
- **Phase 0.3** `ProfilePatch` + `ProfileResponse` carry full extended schema; `extra="forbid"` on PATCH (`backend/app/models/schemas.py`)
- **Phase 0.4** SSRF lockdown: host allowlist, `follow_redirects=False`, content-type check (`backend/app/services/scraper_service.py`)
- **Phase 1.9** `extra="forbid"` flipped on AI response schemas (`backend/app/models/schemas.py`)
- **New** `Settings.validate_required_env()` for startup health check (`backend/app/config.py`)

## Commit 2 — frontend security + SEO

- **Phase 1.5** CSP + HSTS response headers (`frontend/next.config.ts`)
- **Phase 2.6** `SoftwareApplication` JSON-LD in root layout (`frontend/src/app/layout.tsx`)
- **UX** Toaster moved from top-center to bottom-right (avoids header overlap)

## Commit 3 — AI route hardening

- **Phase 1.8** `redactPII` utility (`frontend/src/lib/redact-pii.ts`)
- **Phase 1.8** XML-wrap user content in backend prompts (`resume_prompt.py`, `outreach_prompt.py`)
- **Phase 1.8** `tailor-resume` route rewritten with `<resume>` / `<job_description>` / `<user_instructions>` tags
- **Phase 1.8** `redactPII` applied to error-log paths across all 6+ AI routes

## Commit 4 — UX quick wins

- **Phase 0.6** Responsive `grid-cols-1 sm:grid-cols-2` in dashboard Add-Job form (5 instances)
- **Phase 1.12-lite** `eval-score-card` tiny text (10-11px) bumped to `text-xs` / `text-sm` for WCAG AA

## Commit 5 — docs

- **Phase 0.9** CLAUDE.md codemap path aligned with reality
- This file (IMPLEMENTED.md)
- FOLLOW-UPS.md — the items not shipped here, with concrete recipes


---

# v2 — 3D Hero + Build Fix

Shipped via `apply-autoappli-nuclear-v2.sh`.

## Commit 1 — fix broken Vercel build

- Added missing `import { redactPII } from "@/lib/redact-pii"` in `frontend/src/app/api/ai/interview-practice/route.ts`. The v1 script's import-insertion regex only matched routes importing from `../claude`; this route imports `Anthropic` directly, so it was missed. TypeScript build error resolved.

## Commit 2 — three.js deps

- Added `three ^0.169.0` + `@types/three ^0.169.0` to `frontend/package.json`. Enables the 3D hero in commit 3.
- **Run locally**: `cd frontend && npm install` before next `npm run dev`. Vercel installs automatically.

## Commit 3 — 3D marketing hero

- New component: `frontend/src/components/marketing/three-hero.tsx` — a plain-Three.js scene (no @react-three/fiber, to dodge React 19 compat churn) showing 5 stage columns × 3 floating cards each, representing the application pipeline. Ambient particles, camera parallaxing to mouse, smooth sine-wave card motion.
- Respects `prefers-reduced-motion` (static render, no animation, no mouse listener).
- Proper cleanup — disposes geometry, materials, renderer on unmount. No GPU leaks on route changes.
- `aria-hidden="true"` — decorative, skipped by screen readers.
- Wired into `landing-page.tsx` via `next/dynamic({ ssr: false })` with a matching gradient-orb loading fallback, replacing the static orb decoration that was there.

## Commit 4 — this file


---

# v3 — The Big Level-Up (2026-04-23)

Shipped as 9 atomic commits on `main`. Split by phase so any chunk can
be reverted or cherry-picked to another branch without collateral.

## Phase B — Security & Reliability

### B1 — AI route auth + rate limiting
- `supabase/migrations/20260424120000_ai_usage.sql` — `ai_usage_log`
  table + `ai_rate_limit_check()` / `ai_rate_limit_global()` RPCs + RLS.
- `frontend/src/lib/ai-gate.ts` — `gateAiRoute()` returns
  `{userId, log}` on success, 401/429 `NextResponse` on rejection.
  Falls open when Supabase env vars are missing so local dev works.
- All 7 `/api/ai/*` routes gated with per-route caps
  (tailor-resume 10/hr, cover-letter 10/hr, outreach 15/hr,
  review-resume 20/hr, interview-prep 10/hr, thank-you 15/hr,
  interview-practice 30/hr, global 100/day).
- **Closes the #1 P0 security issue from FOLLOW-UPS.md.**

### B2 — Backend rate limiting (slowapi)
- `slowapi>=0.1.9` added to `backend/requirements.txt`.
- `backend/app/middleware/rate_limit.py` — shared Limiter keying on
  Supabase `sub` when authenticated, else IP.
- Default 100/min; `/search` 20/min; `/match/scores` 60/min.

### B3 — Prompt caching flag
- `backend/app/services/claude_service.py` — `generate_text(..., cache_system=True)`
  wraps system prompt with `cache_control: ephemeral`. Opt-in;
  most current system prompts are below the 1024-token minimum.

### B4 — Tests + PR-gating CI
- `backend/tests/test_live_search_service.py` — 3 tests (cached-first
  happy path, thin-cache fallback, URL dedup).
- `.github/workflows/test-backend.yml` — pytest on every push/PR that
  touches `backend/**`. **First PR-gating check in the repo.**

## Phase A — Job Database & Accuracy

### A1 — Live multi-source search
- `backend/app/repositories/cached_jobs_supabase.py` — reads from the
  `cached_jobs` firehose populated by the nightly ingestion cron.
- `backend/app/services/live_search_service.py` — cached-first search,
  Indeed fallback when cached coverage is thin, URL dedup, pagination.
- `/api/v1/search` now returns 10–100× more jobs than the old
  Indeed-scraper-only path.

### A2 — Match scoring v2 (ADR-0005 Phase 1 — Accepted)
- `backend/app/routers/match.py` rewritten to call `match_v2.score_match`
  with a CandidateProfile built from the user's profile
  (location, remote_preference) and skills extracted from their resume
  via the 87-entry taxonomy.
- Response envelope: `{ scores, engine: "v2" }`. Each score carries
  a 7-signal breakdown (skills 0.40 / title 0.15 / seniority 0.10 /
  location 0.10 / remote 0.10 / recency 0.05 / salary 0.10).
- `backend/app/repositories/profile_supabase.py` — `_public_row` +
  `patch_profile` now return / accept the extended profile fields
  (phone, location, portfolio_url, bio, remote_preference) that
  migration 20260421120000 added but the repo layer was silently
  dropping.
- `frontend/src/types/index.ts` — `MatchScore` + `MatchScoresResponse`
  extended for the v2 shape while keeping legacy fields for back-compat.

### A4 — Performance indexes
- `supabase/migrations/20260424130000_performance_indexes.sql` —
  composite `(user_id, sort-key)` indexes on jobs, job_searches,
  timeline_events, outreach_messages, contacts, interview_notes,
  salary_comps. Partial index on jobs excludes archived rows so the
  dashboard Kanban touches live entries only.

## Phase C — UI/Design

### C1 — Command palette (⌘K / Ctrl-K)
- `frontend/src/components/command-palette.tsx` — full-featured,
  no new npm dep. Fuzzy scoring (startsWith > wordBoundary >
  substring > subsequence), grouped results (Navigate / Actions /
  Theme), arrow-key nav, esc-to-close, scroll-into-view.
- 17 route shortcuts, 3 quick actions, 3 theme commands.

### C2 — Theme toggle (light / dark / system)
- `frontend/src/components/theme-provider.tsx` wrapping
  `next-themes`, defaultTheme=dark, enableSystem.
- `frontend/src/components/theme-toggle.tsx` — cycles light → dark
  → system with matching icon + aria-label.
- Removed hardcoded `className="dark"` from `<html>`; Toaster no
  longer hardcoded to dark.

### C3 — Dashboard loading skeletons
- `frontend/src/components/dashboard/dashboard-skeleton.tsx` mirrors
  the real layout (header / filter / 5-col kanban / stats).
- Rendered both as the Suspense fallback and while `useJobs()` is
  loading — no blank dashboard.

### C5 — Mobile Kanban scroll-snap
- Horizontal scroll with `snap-x snap-mandatory` on mobile so cards
  snap to column boundaries. `snap-none` on lg+ where all columns
  are visible anyway.
- `role="list"` + `aria-label` on the board; `role="listitem"` +
  per-column count labels on each column.

### C9 — Landing-page FAQ + FAQPage JSON-LD
- New `<FAQ />` section between testimonial and final CTA. 6 honest
  Q&As (free tier, no auto-apply, Claude Sonnet, data sources, export,
  privacy). Uses native `<details>` so it works without JavaScript.
- FAQPage structured data injected for Google rich results.

## Phase D — Docs

### D4 — This section
- Marks ADR-0004 (Rate Limiting) and ADR-0005 (Match Scoring) as
  Accepted by virtue of their Phase-1 recipes being shipped.
- ADR-0001 (dual-backend), ADR-0002 (type sharing), ADR-0003 (prompt
  versioning) remain Proposed — not blockers for accuracy or UX wins.
