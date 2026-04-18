# Search Accuracy — Integration Guide

This feature adds a 7-signal explainable match scorer, smart filters with
saved searches, a Greenhouse ingestion source, and a richer resume parser.
The new code is **fully self-contained in new files** — nothing existing is
deleted. To activate it, apply the four small wiring patches below.

All commands assume you are in the AutoAppli repo root.

---

## 0. Sanity check the new modules

```sh
# Frontend
cd frontend && npm run typecheck && npm run lint
npx vitest run src/lib/match/__tests__/score.test.ts

# Backend
cd ../backend
pip install -e .  # if not already
pytest tests/test_match_v2.py tests/test_ingestion_greenhouse.py -v
```

Expected: 0 type errors, 0 lint errors, 19 backend tests pass, ~30 vitest
tests pass.

## 1. Apply the database migration

```sh
supabase db push
# or, against a remote:
supabase migration up
```

Adds:
- `jobs.source` and `jobs.external_id` (+ unique index) so ingestion can
  upsert idempotently.
- `saved_searches` table (RLS, owner-only).

## 2. Wire `scoreMatch` into the demo-mode fallback

**File:** `frontend/src/lib/api.ts`

Find the `computeDemoMatchScore` function (search for that exact name). At
the very top of the function body, insert:

```ts
// Search accuracy v2: prefer the explainable scorer when we have enough
// structured input. Falls back to the legacy TF-IDF path otherwise so
// callers that pass only freeform text keep working.
import { scoreMatch, toJobProfile, toCandidateProfile } from "@/lib/match";

try {
  const job = toJobProfile(jobLike);
  const candidate = toCandidateProfile(profileLike);
  const result = scoreMatch(job, candidate);
  return {
    score: result.score,
    matched: result.matchedSkills,
    missing: result.missingSkills,
    breakdown: result.breakdown,
    headline: result.headline,
  };
} catch {
  // fall through to legacy implementation
}
```

(Adjust the variable names — `jobLike`, `profileLike` — to whatever the
function already calls its inputs. The adapters tolerate snake_case and
camelCase.)

## 3. Render the new components on the jobs page

**File:** `frontend/src/app/jobs/page.tsx`

Add at the top of the file:

```tsx
import { FitBadge } from "@/components/jobs/search-accuracy/fit-badge";
import { SmartFilters } from "@/components/jobs/search-accuracy/smart-filters";
import { applySmartFilters } from "@/components/jobs/search-accuracy/apply-filters";
import { rankJobs, toJobProfile, toCandidateProfile } from "@/lib/match";
```

Inside the page component, replace the existing job list rendering with:

```tsx
const ranked = useMemo(() => {
  if (!profile) return jobs.map((j) => ({ job: j, result: null }));
  const candidate = toCandidateProfile(profile);
  return rankJobs(jobs.map(toJobProfile), candidate).map(([job, result], i) => ({
    job: jobs[i],          // keep original snake_case row for downstream UI
    profile: job,          // normalized JobProfile
    result,
  }));
}, [jobs, profile]);

const filtered = useMemo(
  () => applySmartFilters(ranked, filters),
  [ranked, filters]
);

// ...

<SmartFilters
  filters={filters}
  onChange={setFilters}
  candidateSkills={profile?.skills ?? []}
/>

{filtered.map(({ job, result }) => (
  <JobCard key={job.id} job={job}>
    {result && <FitBadge result={result} />}
  </JobCard>
))}
```

## 4. (Optional) Use match_v2 server-side

**File:** `backend/app/routers/match.py`

If you want the FastAPI `/match` endpoint to return the same explainable
breakdown the frontend now shows, swap the legacy call:

```python
from app.services.match_v2 import score_match, result_to_dict
from app.services.match_v2 import JobProfile, CandidateProfile

# Replace the existing match_service.score_job(...) call with:
job_profile = JobProfile(**job_dict)
cand_profile = CandidateProfile(**profile_dict)
result = score_match(job_profile, cand_profile)
return result_to_dict(result)
```

The legacy `match_service.py` still works for any caller that doesn't pass
the v2 shape.

## 5. (Optional) Trigger ingestion

```sh
# Dry run — pretty-prints normalized jobs without touching Supabase
python -m backend.scripts.ingest --source greenhouse \
  --ids airbnb,stripe,anthropic --dry-run

# Live upsert
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
python -m backend.scripts.ingest --source greenhouse \
  --ids airbnb,stripe,anthropic
```

Schedule it with cron or GitHub Actions for nightly refreshes.

## 6. Refresh the codemap

```sh
python3 ~/.claude/skills/graphify/graphify.py
python3 ~/.claude/skills/graphify/codemap-query.py stats
git add docs/codemap.md docs/codemap.json
```

## 7. Manual demo walkthrough

1. `npm run dev` in `frontend/`.
2. Open `/jobs` with no Supabase session — should render demo jobs with fit
   badges and smart filters; saved searches persist via localStorage.
3. Save a filter named "Senior Python Remote", reload, confirm it loads.
4. Hover a fit badge — tooltip shows all 7 signal contributions.
5. Filter by "remote=remote" + skill "python" — count of results updates
   live without a network call.

## Rollback

The new modules are additive. To roll back, revert the four wiring patches
above and the migration (`saved_searches` table + jobs columns are safe to
drop or leave in place).
