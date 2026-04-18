# `lib/match` — Search Accuracy Engine

Single source of truth for **how AutoAppli decides whether a job fits a
candidate**. Used in two places:

1. **Frontend fallback** — when `NEXT_PUBLIC_API_URL` is unset and
   `apiGet`/`apiPost` route through Supabase-direct mode, `score.ts` runs in
   the browser and produces the same numbers the backend would.
2. **Backend mirror** — `backend/app/services/match_v2.py` is a line-for-line
   Python port. Both implementations consume the same canonical taxonomy and
   the same default weights, so a job scored on either side gets the same
   number.

If you change scoring logic, change it in **both** places and re-run the
test suites. Tests live at:

- `frontend/src/lib/match/__tests__/score.test.ts` (Vitest)
- `backend/tests/test_match_v2.py` (Pytest)

## Module map

| File | Responsibility |
| --- | --- |
| `taxonomy.ts` | Canonical skill list (~85 skills, 11 categories) + alias resolution. Mirrors `backend/app/services/taxonomy.py`. |
| `types.ts` | `JobProfile`, `CandidateProfile`, `MatchResult`, `ScoringWeights`, `DEFAULT_WEIGHTS`. |
| `extract.ts` | Free-text → structured: `extractSkills`, `detectRemoteType`, `parseSalary`, `resolveSeniority`. |
| `score.ts` | The 7-signal scorer (`scoreMatch`) and `rankJobs` convenience. |
| `adapters.ts` | Tolerant adapters from snake_case Supabase rows / demo-data shapes to `JobProfile` / `CandidateProfile`. |
| `resume-parser.ts` | `parseResume(rawText)` — pulls skills, latest title, seniority, YOE, contact info. |
| `saved-searches.ts` | `localStorage`-backed CRUD for Smart Filters presets (cross-device sync via `saved_searches` table is opt-in). |
| `index.ts` | Barrel export — only import from here. |

## The 7 signals

Default weights sum to 1.0. Each signal returns a `raw` score in `[0, 1]`,
contributing `raw * weight * 100` points to the final score.

| Signal | Weight | What it measures |
| --- | --- | --- |
| `skills` | 0.40 | 75% coverage (how many of the job's required skills the candidate has) + 25% relevance (how much of the candidate's stack is used). |
| `title` | 0.15 | Jaccard similarity on role-family tokens after stripping seniority words. |
| `seniority` | 0.10 | Gap table on the seniority ranks: 0→1.0, 1→0.75, 2→0.45, 3→0.20, 4→0.05. |
| `location` | 0.10 | Exact city match, metro overlap, or remote-job exemption. |
| `remote` | 0.10 | Compatibility matrix: remote↔hybrid=0.7, hybrid↔onsite=0.6, remote↔onsite=0.1. |
| `recency` | 0.05 | Linear decay over ~120 days posted. |
| `salary` | 0.10 | Penalises target-above-ceiling, rewards target-within-band. |

`MatchResult.breakdown` is the array a UI tooltip should render — each row
has `signal`, `raw`, `weight`, `points`, and a one-line `explanation`.

## Adding a new skill

1. Append to `SKILLS` in `taxonomy.ts` with `name`, `category`, and any
   `aliases` (each alias must be lowercase).
2. Mirror the entry in `backend/app/services/taxonomy.py`.
3. Add a unit test in both `score.test.ts` and `test_match_v2.py` covering
   the alias → canonical resolution.

The two taxonomies are kept in sync by hand, not by codegen — if they drift,
the frontend and backend will produce different scores for the same job and
the user will see different numbers depending on which path they hit. This
is the most important invariant in this module.

## Adding a new signal

1. Add a weight key to `DEFAULT_WEIGHTS` in `types.ts` (and Python).
2. Implement the sub-score function in `score.ts` returning a value in
   `[0, 1]`.
3. Push a `SignalContribution` row into the breakdown.
4. Re-tune the other weights so they still sum to 1.0 — `weightsValid()`
   asserts this and `score_match` raises if you pass invalid weights.
5. Update the README's table above.

## Wiring points

- `frontend/src/lib/api.ts :: computeDemoMatchScore` should delegate to
  `scoreMatch` once the legacy TF-IDF fallback is retired. See
  `search-accuracy-integration.patch`.
- `frontend/src/app/jobs/page.tsx` renders `<FitBadge>` and `<SmartFilters>`
  from `components/jobs/search-accuracy/`.
- `backend/app/routers/match.py` can call `match_v2.score_match` directly;
  the existing `match_service.py` continues to work for legacy callers.
- `backend/scripts/ingest.py` upserts `NormalizedJob` rows into the
  `jobs` table using `(source, external_id)` as the conflict target.

## Demo-mode behaviour

Every consumer must degrade gracefully when there is no resume, no jobs,
and no Supabase session:

- `parseResume("")` returns an empty `ParsedResume` (no throws).
- `scoreMatch(job, emptyCandidate)` still returns a valid `MatchResult` —
  all signals just score low.
- `applySmartFilters([], filters)` returns `[]`.
- `listSavedSearches()` returns `[]` if `localStorage` is unavailable.
