# Findings — Architecture + Code Health

_Severity: **HIGH** > **MED** > **LOW**. ✅ = spot-checked against source._

## Summary

Grade: **C+**. Strong TS strict and clear router/service layering, but three structural gaps cost compounding velocity: no shared contract between TypeScript and Pydantic, zero PR-gating CI and no test suites, and a dual-backend (FastAPI vs Supabase-direct) architecture that is claimed but under-maintained — see `ProfilePatch` drift.

## Findings

### [HIGH] Type drift between frontend and backend ✅
- **Where:** `frontend/src/types/index.ts` vs `backend/app/models/schemas.py`
- **Evidence:** `Job`, `Resume`, `Profile` all defined twice. `ProfilePatch` missing 5 fields (§0.3 in Roadmap). `GeneratedDocument` has `eval_result` in TS, not in the Python response model.
- **Impact:** every schema change is two edits in two languages. Forgotten edits don't break the build (no typechecker spans the boundary) — they ship as data loss.
- **Fix:** ADR-0002. Codegen TS from Pydantic JSON Schema. Roadmap 2.5.
- **Effort:** M (one-time); S (per field after)

### [HIGH] No test coverage
- **Where:** `backend/tests/` has test files per the codemap but stubs only; frontend has no test runner configured.
- **Impact:** every refactor is a coin flip. Many findings in this audit (e.g., JWT regression, ProfilePatch drift) would be a single integration test apiece.
- **Fix:** Roadmap 1.2. Prioritize `match_service`, `jobs_auth`, `eval_service`, and the `api.ts` fallback path.
- **Effort:** L

### [HIGH] No PR-gating CI ✅
- **Where:** `.github/workflows/` has `ingest-jobs.yml`, `ingest-cached-jobs.yml` (cron data jobs) — no `ci.yml` / `test.yml`.
- **Impact:** TS strict is a local-only rule. Broken builds can land on `main`.
- **Fix:** Roadmap 1.1.
- **Effort:** M

### [HIGH] Match scoring logic duplicated between TS and Python
- **Where:** `frontend/src/lib/api.ts::computeDemoMatchScore` vs `backend/app/services/match_service.py::compute_match_score`
- **Impact:** skill term sets diverge (~20 terms different). Scoring formula subtly different. Same resume + job returns different score depending on whether FastAPI is reachable.
- **Fix:** Roadmap 1.6. Delete the TS fallback; call the backend or a Supabase RPC always. ADR-0005.
- **Effort:** M

### [HIGH] Repository layer has no protocol / interface
- **Where:** `backend/app/repositories/jobs_memory.py` vs `jobs_supabase.py`
- **Impact:** adding a method to one implementation doesn't force the other to keep up. Silent drift.
- **Fix:** Roadmap 1.4. `typing.Protocol` for each repo domain.
- **Effort:** M

### [MED] Repo root littered with patch files ✅
- **Where:** `/`: 30+ `.patch` + `apply-*.sh` scripts mixed with `frontend/`, `backend/`, etc.
- **Impact:** unclear which patches are active, which landed, which are historical. New-engineer cost.
- **Fix:** Roadmap 0.8. Move to `patches/` with a manifest.
- **Effort:** S

### [MED] CLAUDE.md points at wrong codemap path ✅
- **Where:** `CLAUDE.md:50` says `docs/codemap.md`; file is actually at `./codemap.md`.
- **Fix:** Roadmap 0.9. Move the file (recommended) or fix the pointer.
- **Effort:** S

### [MED] Error handling is all 500s
- **Where:** `backend/app/routers/resume.py:76`, `jobs.py:87`, most routers.
- **Evidence:** `except RuntimeError as e: raise HTTPException(500, str(e))` pattern everywhere.
- **Impact:** client can't distinguish "duplicate job URL" (should show inline form error) from "Supabase down" (should retry). All 500s look the same.
- **Fix:** service-layer error types → HTTP code mapping middleware. Pair with structlog for request IDs.
- **Effort:** M

### [MED] Pydantic response models use `extra="ignore"` on AI schemas
- **Where:** `backend/app/models/schemas.py` — several schemas
- **Fix:** Roadmap 1.9. Flip to `extra="forbid"`.
- **Effort:** S

### [MED] `schemas.py` is 371 lines, 37 schemas, 10 domains
- **Where:** `backend/app/models/schemas.py`
- **Impact:** merge conflicts on every feature branch that touches a model.
- **Fix:** split into `models/{jobs,profile,resume,cover_letter,...}.py`.
- **Effort:** M

### [LOW] Dependency ranges loose
- **Where:** `backend/requirements.txt` uses `>=`, frontend `package.json` uses `^`.
- **Fix:** `pip-compile` → `requirements.txt` with exact versions. `npm ci` in CI.
- **Effort:** S

### [LOW] Duplicated skill term lists (matches the scoring duplication above)
- **Where:** `api.ts:176-186` and `match_service.py:17-35`
- **Fix:** single JSON file loaded by both (or deleted by consolidating scoring to backend per Roadmap 1.6).
- **Effort:** S

### [LOW] No observability in prod
- No Sentry, no structured logs, no metrics dashboard. Can't debug a bug report.
- **Fix:** Roadmap 2.10.
- **Effort:** M

## Quick wins

0.3, 0.8, 0.9, 1.9.

## ADRs needed

0001 (dual-backend), 0002 (type sharing), 0003 (prompt versioning), 0005 (match scoring). See `../adrs/`.
