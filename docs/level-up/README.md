# AutoAppli Level-Up — Index

_Audit + phased roadmap generated 2026-04-23._

## Start here

- **[ROADMAP.md](./ROADMAP.md)** — the prioritized multi-phase plan. This is the primary deliverable.

## Raw findings (by area)

- **[findings/security-backend.md](./findings/security-backend.md)** — auth, authz, secrets, SSRF, rate limiting, prompt injection.
- **[findings/frontend-ux.md](./findings/frontend-ux.md)** — component patterns, a11y, mobile, perceived perf.
- **[findings/architecture-health.md](./findings/architecture-health.md)** — dual-backend duality, type drift, tests, CI.
- **[findings/growth.md](./findings/growth.md)** — SEO, prompt quality, PDF ingest, extension parsers.

## Architecture decisions needed

Stubs only — fill these in before Phase 2.

- [adrs/0001-dual-backend.md](./adrs/0001-dual-backend.md)
- [adrs/0002-type-sharing.md](./adrs/0002-type-sharing.md)
- [adrs/0003-prompt-versioning.md](./adrs/0003-prompt-versioning.md)
- [adrs/0004-rate-limiting.md](./adrs/0004-rate-limiting.md)
- [adrs/0005-match-scoring.md](./adrs/0005-match-scoring.md)

## How this was produced

Four parallel audits — security+backend, frontend+UX, architecture+health, growth — each framed by the corresponding skills in `.claude/skills/`. The skills themselves are mostly boilerplate; the real work is the findings, grounded in `codemap.md` at the repo root and verified against the live source. High-severity findings were spot-checked against real code before being included in the roadmap.

## Verified vs. audit-claimed

Before publishing, these top-severity claims were checked against the real code:

- ✅ JWT `InvalidAudienceError` fallback exists — `backend/app/deps/jobs_auth.py:27-33`
- ✅ `ProfilePatch` missing 5 fields — `backend/app/models/schemas.py:118-121`
- ✅ `/api/ai/tailor-resume` has no auth or rate limit — `frontend/src/app/api/ai/tailor-resume/route.ts:4`
- ✅ Scraper SSRF exposure — `backend/app/services/scraper_service.py:53-55` (worse than reported — `follow_redirects=True`)
- ✅ `resume_parser.py` is 12 lines with no OCR fallback
- ✅ `frontend/src/app/dashboard/page.tsx` has 5× `grid grid-cols-2` without responsive breakpoints
- ⚠️  "Secrets committed to git" — **NOT verified** from sandbox. `.env.local` is correctly gitignored; run `git log --all -- frontend/.env.local` locally to confirm it was never accidentally committed. Flagged as P0 "verify" rather than "remediate" in the roadmap.
- ⚠️  "No CI" — partially accurate. `.github/workflows/` has `ingest-jobs.yml` and `ingest-cached-jobs.yml` (cron jobs), but nothing PR-gating. Roadmap says "stand up PR-gating CI", which is the right framing.
