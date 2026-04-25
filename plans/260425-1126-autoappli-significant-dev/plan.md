# 260425-1126 — AutoAppli significant development push

**Repo:** `~/AutoAppli-clean` (canonical, on `main`)
**Mode:** Auto, parallel-agent dispatch
**Branding constraint:** No auto-submit anywhere. AutoAppli is read-only on apply, free-tier moat.

## Goal

One coordinated push that lands one big new differentiating feature (AI Mock Interview), promotes Story Library off localStorage so it survives device switches, clears two carried-over open threads (CI gating + lint debt), and adds a Goal Tracker dashboard widget.

## Streams (parallel, file-disjoint)

| Stream | Scope | Owns (no other stream touches these) |
|--------|-------|--------------------------------------|
| **A — AI Mock Interview** | Backend service + router + tests, frontend page. Uses Claude API w/ prompt caching. New differentiating feature. | `backend/app/services/mock_interview_service.py`, `backend/app/routers/mock_interview.py`, `backend/app/models/mock_interview_models.py`, `backend/tests/test_mock_interview_router.py`, `frontend/src/app/interview/mock/page.tsx`, `frontend/src/app/interview/mock/mock-interview-ui.tsx`, `frontend/src/lib/mock-interview/api.ts` |
| **B — Story Library Supabase migration** | Migration, backend CRUD, frontend storage façade swap (localStorage → API w/ fallback). | `supabase/migrations/20260425120000_stories.sql`, `backend/app/services/stories_service.py`, `backend/app/routers/stories.py`, `backend/app/models/story_models.py`, `backend/tests/test_stories_router.py`, `frontend/src/lib/stories/storage.ts` |
| **C — CI gating + lint debt + supabase/.temp** | Wire vitest + playwright as blocking checks, fix `practice-history-panel.tsx` purity errors with `useSyncExternalStore` pattern, gitignore `supabase/.temp/`. | `.github/workflows/test-frontend.yml`, `frontend/src/components/interviews/practice-history-panel.tsx`, `.gitignore` |
| **D — Goal Tracker dashboard widget** | New widget: weekly application target, streak, projection. localStorage v1, deliberately structured for future Supabase migration like Story Library. | `frontend/src/components/dashboard/goal-tracker.tsx`, `frontend/src/lib/goals/storage.ts`, `frontend/src/components/dashboard/goal-tracker.test.tsx`, integration line in `frontend/src/app/dashboard/page.tsx` |

## Shared file: `backend/app/main.py`

Streams A and B each register one new router. They MUST NOT modify `main.py` themselves — they leave a one-line note in their final report stating the import + include line. The orchestrator integrates after dispatch.

## Status protocol

Each agent ends with:
```
**Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
**Summary:** ...
**main.py registration (if applicable):** import line + include_router line
**Concerns/Blockers:** ...
```

## Skills agents should activate

- All: `verification-before-completion`, `test-driven-development` (where applicable)
- A: `claude-api` (prompt caching mandatory), `backend-development`, `frontend-development`, `web-testing`
- B: `databases`, `backend-development`, `frontend-development`
- C: `devops`, `react-best-practices`
- D: `frontend-development`, `web-testing`

## Out of scope (do NOT touch)

- `backend/app/main.py` (A, B leave notes; orchestrator integrates)
- `frontend/src/lib/api.ts` (use stream-local helpers under `lib/<domain>/api.ts`)
- `backend/app/models/schemas.py` (use stream-local model files to avoid conflict)
- Marketing/landing copy (orthogonal to this push)
- Existing routers other than `main.py` registration

## Definition of done

- All 4 streams report DONE or DONE_WITH_CONCERNS
- Backend: `pytest backend/tests/test_mock_interview_router.py backend/tests/test_stories_router.py` passes
- Frontend: `npm run typecheck` passes, new vitest tests pass, no new lint regressions
- Orchestrator integrated `main.py` lines
- Brain session note written at wrap

## Reports

`{plan_dir}/reports/{stream}-260425-1126.md` — one per agent.
