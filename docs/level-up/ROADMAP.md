# AutoAppli Level-Up Roadmap

_Generated 2026-04-23. Comprehensive audit across security, backend, frontend, UX, accessibility, architecture, code health, SEO, AI quality, PDF ingest, and integrations._

## How to read this document

- **[ROADMAP.md](./ROADMAP.md)** (this file) — the prioritized multi-phase plan. Start here.
- **[findings/](./findings/)** — raw audit findings per area, with file:line evidence.
- **[adrs/](./adrs/)** — architecture decision record stubs for the biggest strategic calls.

Each phase is sized so every item is a PR-sized workstream. Severity labels:

- **P0** — ship-stoppers. Security, data loss, broken core UX. Do before anything else.
- **P1** — quality foundations. Tests, CI, schema sharing, observability.
- **P2** — growth + moat. Content, prompt quality, semantic match, extension resilience.

Effort: **S** = ≤ 2 hours, **M** = half-day to 2 days, **L** = multi-day or ADR-gated.

---

## Executive summary

AutoAppli is a feature-rich codebase — Next.js 16 + FastAPI + Supabase + Chrome extension + Anthropic Claude across ~100 routes/endpoints. It ships, it works, and it has the shape of a real product. But four structural risks are worth addressing before piling on more features:

1. **Unauthenticated, unrate-limited AI routes** (`frontend/src/app/api/ai/*`) — any caller can burn Anthropic credits to zero. Verified: `tailor-resume/route.ts` has no session check and no rate limit. **P0.**
2. **JWT audience validation has an escape hatch** (`backend/app/deps/jobs_auth.py:27-33`) — on `InvalidAudienceError` the code retries with `verify_aud=False`, silently accepting tokens with wrong audience. **P0.**
3. **`ProfilePatch` schema is missing five fields** the frontend sends (`phone`, `location`, `portfolio_url`, `bio`, `remote_preference`). CLAUDE.md acknowledges this must be kept in sync — it isn't. Data is silently lost in Supabase-direct deployments. **P0.**
4. **SSRF in `scrape_job_details`** (`backend/app/services/scraper_service.py:48-58`) — user-supplied URL fetched with `follow_redirects=True` and zero origin validation. Combine with the scraper being reachable from an authenticated endpoint and this is a real in-product vector. **P0.**

Beyond the P0s, the codebase has strong bones but consistent gaps: no PR-gating CI, zero unit tests in `backend/tests/` or frontend, no shared type contract between Pydantic and TypeScript, and the repo root is littered with ~35 `.patch` / `apply-*.sh` files from scripted Claude sessions.

Overall health grade: **C+**. With the P0 patches and a week of P1 hygiene, it climbs to **B+**. The growth moves in P2 are where the product differentiates.

---

## Phase 0 — Stop the bleeding (Week 1, ~3-4 days of focused work)

The goal: every one of these should be a single small PR that can ship the same day it's written.

### 0.1 — Authenticate the AI routes and add a per-user rate limit — **P0, M**

**Where:** `frontend/src/app/api/ai/{tailor-resume,cover-letter,interview-prep,outreach,review-resume,thank-you}/route.ts` (6 routes)

**What to do:**
- In each route, obtain the Supabase session via `createRouteHandlerClient` (or your existing helper) and return `401` if no user.
- Wrap the Claude call in a per-user token-bucket. Simplest path: a Supabase table `ai_usage(user_id, minute_bucket, calls, tokens)` with an atomic RPC that increments and returns the current count. Reject at > 10 calls/hour for generation routes, > 30/hour for review routes.
- Log every call with `{user_id, route, model, input_tokens, output_tokens, duration_ms}` to `ai_usage_log`. This is the foundation for the dashboard in Phase 2.

**Acceptance:** a synthetic test that hits `/api/ai/tailor-resume` 11 times in 60 minutes as one user returns 429 on the 11th. Unauthenticated call returns 401.

### 0.2 — Fix the JWT audience escape hatch — **P0, S**

**Where:** `backend/app/deps/jobs_auth.py:27-33`

**What to do:** delete the `InvalidAudienceError` handler. Legitimate Supabase access tokens always have `aud="authenticated"`; if a token doesn't, it should be rejected. If you later need a different audience (e.g., for a service-to-service token), add it as an explicit alternative audience, not a bypass.

**Acceptance:** a unit test feeds a token with `aud="anon"` and asserts `InvalidTokenError` propagates.

### 0.3 — Bring `ProfilePatch` and `ProfileResponse` back in sync with the DB — **P0, S**

**Where:** `backend/app/models/schemas.py:111-121`

**What to do:** add the five missing fields to both models:

```python
class ProfileResponse(BaseModel):
    display_name: str = ""
    headline: str = ""
    linkedin_url: str = ""
    phone: str = ""
    location: str = ""
    portfolio_url: str = ""
    bio: str = ""
    remote_preference: Literal["remote", "hybrid", "onsite", "any"] = "any"
    updated_at: str | None = None

class ProfilePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    display_name: str | None = None
    headline: str | None = None
    linkedin_url: str | None = None
    phone: str | None = None
    location: str | None = None
    portfolio_url: str | None = None
    bio: str | None = None
    remote_preference: Literal["remote", "hybrid", "onsite", "any"] | None = None
```

Note the `extra="forbid"` — if the frontend sends a typo, you want a 422, not silent data loss.

**Acceptance:** `PATCH /profile` with each extended field round-trips. Unknown field returns 422.

### 0.4 — Lock down the scraper against SSRF — **P0, S**

**Where:** `backend/app/services/scraper_service.py:48-58` (and the sibling `_scrape_indeed` at line 116)

**What to do:**
- Before the fetch, parse the URL and reject if: scheme not in `{http, https}`, hostname missing, hostname is a literal IP, hostname in the RFC1918 ranges, or hostname resolves to a loopback/link-local address.
- Keep a small hostname allowlist of supported job boards (`indeed.com`, `lever.co`, `greenhouse.io`, `linkedin.com`, `glassdoor.com`) and reject everything else with 400.
- Set `follow_redirects=False`. Job boards don't need it; it's pure attack surface.
- Check `Content-Type` starts with `text/html` before parsing.

**Acceptance:** unit tests for each reject path (IP literal, 10.x.x.x, localhost, `file://`, `http://example.com/`, redirect to 10.x.x.x).

### 0.5 — Audit git history for the anon key — **P0, S**

The audit flagged `frontend/.env.local` as possibly committed. It's correctly gitignored today, but verify it was never accidentally committed earlier:

```sh
git log --all --oneline -- frontend/.env.local
git log --all -p -- frontend/.env.local | head -40
```

If it shows up in any commit, treat the anon key and Adzuna key as compromised: rotate both, then clean history with `git filter-repo`. The anon key alone isn't catastrophic (RLS is supposed to backstop it), but rotating is cheap and the Adzuna key has real billing exposure.

**Acceptance:** `git log --all -- frontend/.env.local` returns nothing, or if it returned something, both keys have been rotated.

### 0.6 — Fix the broken mobile kanban dialog — **P0, S**

**Where:** `frontend/src/app/dashboard/page.tsx` at lines 221, 236, 246, 328, 338 (verified — 5 instances)

Replace every `grid grid-cols-2 gap-3` with `grid grid-cols-1 sm:grid-cols-2 gap-3`. Form-add dialog on iPhone SE is currently broken.

**Acceptance:** open the Add Job dialog in a 375px viewport. Nothing overflows horizontally.

### 0.7 — Bump sub-16px form input font-size on iOS — **P0, S**

**Where:** `frontend/src/components/ui/input.tsx` and `textarea.tsx` defaults

Add `text-base` (or at least a conditional `@media (hover: none)` bump to 16px) so iOS doesn't zoom on focus. Today inputs inherit `text-sm` → 14px → auto-zoom → jarring UX.

### 0.8 — Clean up repo root artifacts — **P0, S**

Root currently has ~35 `.patch` and `apply-*.sh` files mixed with source trees. Do this in one PR:

```sh
mkdir -p patches/landed patches/archive
# Move everything. Sort into 'landed' (content is already in git) vs 'archive' (no longer relevant).
```

Add `patches/README.md` documenting the convention going forward: new patches go in `patches/wip/`, promoted to `landed/` after the PR merges, archived after 90 days.

**Acceptance:** `ls` at repo root shows only real directories plus `README.md`, `CLAUDE.md`, `package.json`, config files.

### 0.9 — Fix the codemap path in CLAUDE.md — **P0, S**

CLAUDE.md line 50 points at `docs/codemap.md`. The file actually lives at `./codemap.md`. Either move it or update the pointer. Recommend: move to `docs/codemap.md` for consistency with this new `docs/level-up/` directory.

---

## Phase 1 — Quality foundations (Weeks 2-4)

Before piling on features, establish the safety net. Without tests and CI, every P0 fix above is one merge conflict away from regression.

### 1.1 — Stand up PR-gating CI — **P1, M**

**Where:** create `.github/workflows/ci.yml`

Current state: `.github/workflows/` has `ingest-cached-jobs.yml` and `ingest-jobs.yml` (data cron jobs), but nothing runs on PR. Add:

- **frontend**: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Cache `.next/cache` and `node_modules`.
- **backend**: `pip install -r backend/requirements.txt`, `pytest backend/tests/`, `ruff check backend/`, `mypy backend/app/`.
- **migrations**: `supabase db lint` if Supabase CLI is available, else a smoke-test that `psql` can apply all migrations in order against a fresh Postgres.

Add branch protection on `main`: all four jobs must pass.

### 1.2 — Baseline test coverage — **P1, L (split across 3-4 PRs)**

Zero tests exist in `backend/tests/` despite the directory being listed as having files in the codemap — they're likely stubs. Frontend has no test runner at all. Start with the critical paths:

- **PR 1:** add `pytest` + `pytest-asyncio` to `backend/requirements-dev.txt`. Write 6 tests for `match_service.compute_match_score` covering: identical text → high score, disjoint text → low, remote preference bonuses (+8/+3/-6), empty inputs.
- **PR 2:** 4 tests for `jobs_auth.decode_supabase_user_sub` — valid token, expired, wrong audience (should now reject after 0.2), malformed.
- **PR 3:** 5 tests for `eval_service` — `detect_hallucinations`, `score_keyword_coverage`, `measure_change_delta` with representative inputs.
- **PR 4:** vitest + @testing-library in frontend. Start with `lib/api.ts` fallback logic: mock `isSupabaseConfigured=true, isJobsApiConfigured=false` and verify reads go to Supabase directly.

Goal: ~60% coverage of the `services/` layer in backend and ~40% of `lib/` in frontend within the month.

### 1.3 — Add backend rate limiting middleware — **P1, M**

**Where:** `backend/app/main.py`

Install `slowapi`. Configure:

- Default: 200 requests/hour per `user_id` (derived from JWT).
- `/resumes/generate`, `/cover-letter/generate`, `/interviews/prep`, `/outreach/generate`: 20/hour (AI cost path).
- `/search`: 30/hour (external API cost).

Return 429 with `Retry-After`. This mirrors and reinforces the frontend-side limits from 0.1.

### 1.4 — Repository protocol interfaces — **P1, M**

**Where:** `backend/app/repositories/`

Today `jobs_memory.py` and `jobs_supabase.py` are two independent implementations with no shared contract. Define a `Protocol`:

```python
# backend/app/repositories/_protocols.py
from typing import Protocol
class JobRepository(Protocol):
    def create_job(self, user_id: str, payload: dict) -> Job: ...
    def list_jobs(self, user_id: str) -> list[Job]: ...
    # ... etc
```

Type-annotate both implementations. Mypy will then surface missing methods. Same pattern for `resume`, `profile`, `documents`.

### 1.5 — Add CSP, HSTS, and tighten security headers — **P1, S**

**Where:** `frontend/next.config.ts`

Current config has `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` but no CSP and no HSTS. Add:

```ts
{ key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.anthropic.com; frame-ancestors 'none'" },
{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
```

The `unsafe-inline` for styles is a tailwind thing; remove it later by switching to nonces. Get the baseline in now.

### 1.6 — Unify match scoring on the backend — **P1, M**

**Where:** `frontend/src/lib/api.ts::computeDemoMatchScore` (TF-IDF fallback) vs `backend/app/services/match_service.py::compute_match_score`

Today both implement TF-IDF with diverging skill term lists and weight formulas. Per the audit, skill term sets differ by ~20 entries and the tokenization regex diverges.

Move to a single source: delete `computeDemoMatchScore`; always call `POST /match/scores` or the equivalent Supabase RPC. For demo mode, return static match scores with a `"demo": true` flag — don't re-implement scoring.

### 1.7 — PDF extraction with OCR fallback — **P1, M**

**Where:** `backend/app/services/resume_parser.py` (verified: 12 lines, trivially thin)

Add Tesseract OCR fallback. Flow:
1. Try `pypdf.PdfReader(...).extract_text()` as today.
2. If total extracted chars < 200 OR < 10% of file size, treat as scanned.
3. Use `pdf2image` + `pytesseract` to OCR each page.
4. Surface a `extraction_method: "ocr" | "text"` flag in the response so the frontend can warn about lower accuracy.

Add a `requirements.txt` note that Tesseract must be available on the host (render.yaml probably needs `apt-get install tesseract-ocr`).

### 1.8 — Wrap user content in XML tags in AI prompts — **P1, S**

**Where:** `backend/app/prompts/resume_prompt.py`, `outreach_prompt.py`, and all `frontend/src/app/api/ai/*/route.ts`

Today prompts interpolate user content directly. Prompt injection isn't high-risk against Claude, but XML wrapping is cheap belt-and-suspenders:

```ts
const userMessage = `<resume>\n${resume_text}\n</resume>\n\n<job>\n${job_description}\n</job>\n\n<instructions>Please rewrite my resume...</instructions>`;
```

Pair with a `redactPII` utility applied to `console.error` bodies so your server logs don't accumulate candidate PII.

### 1.9 — Pydantic `extra="forbid"` on all request/response schemas — **P1, S**

**Where:** `backend/app/models/schemas.py`

Grep the file for `ConfigDict(extra="ignore")` and flip each to `"forbid"`. Silent-drop is the wrong default for API contracts. When the frontend sends a typo, you want a 422, not a no-op. This pairs with 0.3.

### 1.10 — Light mode / dark mode toggle — **P1, S**

**Where:** `frontend/src/app/layout.tsx:74`

Hardcoded `className="h-full antialiased dark"`. `next-themes` is installed but unused. Wrap children in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`. Adds ~5% of user pool back.

### 1.11 — Loading skeletons on the four heaviest pages — **P1, M**

**Where:** `frontend/src/app/{dashboard,resume,jobs,application-kit}/{loading.tsx,page.tsx}`

Dashboard currently uses `<Suspense fallback={null}>` — blank page for 2-3s. Build a `<KanbanSkeleton columns={5} cardsPerColumn={4} />` and use it in `dashboard/loading.tsx`. Same pattern for the other three.

### 1.12 — Fix the aria-label gap — **P1, M**

Audit flagged only 3 `aria-label` attributes in 38 components. Start with: icon-only buttons (Download, Search, Plus, Send, Sparkles), dialog triggers, kanban cards, and toast. Run axe-core locally — it'll enumerate the rest.

---

## Phase 2 — Growth + moat (Month 2-3)

These are the moves that turn AutoAppli from "it works" into "it compounds".

### 2.1 — Content marketing engine — **P2, L**

**Ship:** `frontend/src/app/blog/[slug]/page.tsx` with MDX or static file sourcing. Ten pillar posts seeded:

1. "How to write an ATS-friendly resume in 2026"
2. "Cover letter templates by role — engineering, design, PM"
3. "Reading a job description: what 'nice-to-haves' actually mean"
4. "Negotiating offers: the three-numbers framework"
5. "Tracking 50+ applications without going insane"
6. "Remote vs hybrid vs onsite: what each actually requires"
7. "The thank-you note that gets replies"
8. "When your resume should be one page (and when not)"
9. "AI-tailored resumes: ethics and what ATS will and won't detect"
10. "Your first tech job: applying the 'portfolio, projects, people' formula"

Each post targets one high-intent SEO query. Link every post to the relevant AutoAppli feature.

Add `/blog/*` to `sitemap.ts`, generate `opengraph-image.tsx` per post, add JSON-LD `BlogPosting` schema.

### 2.2 — Prompt versioning + eval harness — **P2, L, ADR-gated (see [ADR-0003](./adrs/0003-prompt-versioning.md))**

**Ship:**
- `backend/app/prompts/registry.py` — named/versioned prompts (`resume_tailor.v2`, `cover_letter.v3`), each with a system prompt, user template, and optional JSON schema.
- `backend/app/services/eval_service.py` grows to accept a prompt version, produce an eval result, and log `{prompt_version, model, eval_score, user_feedback_id}`.
- `/api/ai/feedback` endpoint where the frontend POSTs `{ doc_id, rating: 1-5, regenerated: bool }`.
- Internal `/admin/prompts/compare?version_a=v1&version_b=v2&job_id=X` tool to side-by-side two versions on the same input.

Without this, every prompt change is a YOLO rewrite.

### 2.3 — Semantic match scoring — **P2, L, ADR-gated (see [ADR-0005](./adrs/0005-match-scoring.md))**

TF-IDF misses "Kubernetes" ≈ "container orchestration". Swap to a hybrid:

- Backend: call Voyage or Cohere embeddings API (cheaper than Claude for embeddings) to embed resume + job description.
- Store embeddings in `resumes.embedding` and `jobs.embedding` (Supabase `pgvector`).
- Score = 0.6 * cosine(embedding_resume, embedding_jd) + 0.3 * tf_idf + 0.1 * remote_preference_bonus.
- Return an explanation string: "Strong match on {top 3 skills}; remote preference aligned."

Backfill embeddings in a background job for existing rows.

### 2.4 — Chrome extension parser telemetry + fallback — **P2, M**

**Where:** `extension/parsers/*.js`, new endpoint `POST /api/extension/parse-telemetry`

Each parser today tries 2-3 selectors per field in sequence and falls through silently. Ship:
- Log per-field `{selector_hit, selector_index, field, board}` to a telemetry endpoint.
- When a selector set returns empty for > 20% of pageloads in 24h, alert (Slack webhook or email).
- Generic fallback: if all selectors miss, run a DOM heuristic (largest `<h1>`, first `<span class*="company">`) and flag the result as "low confidence".

This converts "our LinkedIn parser broke three weeks ago" into "our LinkedIn parser broke yesterday and we already shipped a fix".

### 2.5 — Type contract: Pydantic → TypeScript codegen — **P2, M, ADR-gated (see [ADR-0002](./adrs/0002-type-sharing.md))**

**Where:** new `scripts/gen-types.sh`, `frontend/src/types/generated/*.ts`

Today the frontend `types/index.ts` and backend `models/schemas.py` drift independently. This is how 0.3 happened. Solution:

- Pydantic v2 ships `model_json_schema()` — export all models.
- Use `json-schema-to-typescript` to emit `frontend/src/types/generated/`.
- Add `make types` to CI; fail the build if `git diff` shows uncommitted generated type changes.

Rule: generated types are the only API contract. `types/index.ts` becomes "frontend-only UI state types".

### 2.6 — Per-route generateMetadata and JSON-LD — **P2, S**

**Where:** every `page.tsx` with external value (`/`, `/blog/*`, `/pricing` if exists, `/privacy`, `/terms`).

Export `generateMetadata` on each. Add a `SoftwareApplication` JSON-LD block in `layout.tsx` for the product itself. Marginal SEO lift on its own; compounds with 2.1.

### 2.7 — Dynamic OG image per shared resource — **P2, S**

`frontend/src/app/job/[id]/opengraph-image.tsx` — render a Vercel OG image showing the job title, company, and user's match score. When the user shares a job link (e.g., "look at this match I found"), the unfurl is compelling instead of generic.

### 2.8 — Kanban keyboard navigation — **P2, M**

`@hello-pangea/dnd` supports keyboard — it just needs to be wired. Users with motor impairments, and power users, both benefit. Arrow keys move focus between cards and columns; Space picks up/drops; Escape cancels. Add a `?` overlay showing shortcuts.

### 2.9 — AbortController on AI routes — **P2, S**

When a user clicks Generate then navigates away, the Claude call keeps running to completion — wasted tokens and wasted latency. Thread an `AbortSignal` from the frontend fetch through to the Anthropic SDK call.

### 2.10 — Observability: Sentry + structured logs — **P2, M**

- Sentry on both frontend and backend. Free tier covers startup scale.
- `structlog` on backend with a request-id middleware. Every log line gets `{request_id, user_id, route}`.
- Dashboard in Supabase or Grafana: AI call volume, 5xx rate, p95 latency, parser failure rate.

Half of the audits in this report could have been self-serve metrics if this existed.

---

## ADRs to write before Phase 2

Five architectural decisions big enough to deserve a written record. Stubs are in [adrs/](./adrs/):

1. [ADR-0001: Dual-backend (FastAPI + Supabase-direct) — commit or deprecate](./adrs/0001-dual-backend.md)
2. [ADR-0002: Single source of truth for domain types](./adrs/0002-type-sharing.md)
3. [ADR-0003: AI prompt versioning and evaluation framework](./adrs/0003-prompt-versioning.md)
4. [ADR-0004: Rate limiting and abuse prevention](./adrs/0004-rate-limiting.md)
5. [ADR-0005: Match scoring — TF-IDF, semantic, or hybrid](./adrs/0005-match-scoring.md)

Phase 1 items 1.3 and 1.6 depend on decisions in ADR-0001 and ADR-0005. Phase 2 is fully blocked on the ADRs.

---

## What I intentionally did not recommend

To keep this focused:

- **3D web experiences / WebGL / Three.js** — one of the 15 skills, but AutoAppli is a productivity tool, not a portfolio site. A 3D hero is visual noise on the critical onboarding path. Skip.
- **Rewriting in a different framework** — Next.js 16 + FastAPI is working. The problems are hygiene, not platform choice.
- **Micro-optimizations before measurement** — adding React.memo everywhere is tempting and mostly useless. Get Sentry + real perf data (2.10) first, then optimize what's actually slow.
- **More AI features before evals exist** — the six AI routes are already undertested. Ship 2.2 before adding a seventh.

---

## Sequencing summary

```
Week 1         Phase 0 (all 9 items): 3-4 days focused
Weeks 2-4      Phase 1 (12 items, parallel across 3-4 PRs/week)
Weeks 5-6      Write ADRs 0001-0005, get them reviewed
Months 2-3     Phase 2 (10 items, roughly one per week)
```

After Phase 0, security posture is defensible. After Phase 1, the codebase is safe to iterate on. After Phase 2, AutoAppli has a defensible content moat, provable AI quality, and product-grade observability.
