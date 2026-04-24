# Phase 02 — Title normalizer + shadow-write wiring

**Status:** Done
**Scope:** Phase B of the rollout. Completes PR 2.

## Goal

1. Add `normalize_title` to PR 1's `normalizers.py` so all canonicalizers live under one roof.
2. Wire the orchestrator to write `posting_key` into `cached_jobs` and upsert `cached_jobs_sightings` on every ingest. No merge, no collapse — audit data only.

PR 2 **consumes** PR 1's pre-normalized fields rather than duplicating normalization. `compute_posting_key` reads `job.company_normalized`, `job.location_country/region/city/is_remote` directly off `NormalizedJob` (populated by PR 1's `__post_init__`).

## Out of scope

- Merge / field-level priority selection (PR 3).
- Deleting duplicate `cached_jobs` rows (PR 3).
- URL fingerprint binding (PR 3; we record `canonical_url` in sightings but don't use it to resolve keys yet).

## Feature flag

`JOBS_DEDUP_V1` environment variable.
- Unset / `"false"` / `"0"` / `"no"` / `"off"` → orchestrator behaves exactly as before PR 2 (no posting_key in cached_jobs rows, no sightings upsert). **Default.**
- `"true"` / `"1"` / `"yes"` / `"on"` → shadow-write enabled.

**Default off** so the env var works as a real rollback lever — if "unset" already meant "shadow-writing", reverting would require redeploying. The cron environment (`.github/workflows/ingest-cached-jobs.yml`) sets `JOBS_DEDUP_V1=true` to opt in.

## Files

**Extended:**
- `backend/app/services/ingestion/normalizers.py` — added `normalize_title(raw, source="")`.
- `backend/tests/test_ingestion_normalizers.py` — 13 new title test cases.
- `backend/scripts/ingest_all.py` — dual-shape `_load_config`, shadow-write helpers, sighting upsert.
- `ingestion-config.json` — rich shape with priority tiers.

**New:**
- `backend/app/services/ingestion/dedup.py` — `compute_posting_key`, `canonical_url`, `raw_hash`.
- `backend/tests/test_ingestion_dedup_shadow.py` — 33 cases covering the dedup module + orchestrator wiring.

## Posting key composition

```
posting_key = sha256(
  company_normalized || \x1F ||              # PR 1's normalize_company output
  normalize_title(title) || \x1F ||          # PR 2's title normalizer
  location_part                              # "remote" or "country/region/city"
)
```

Where `location_part` is `"remote"` when `job.location_is_remote` is true (PR 1's `should_mark_remote` reconciler decides), else a slash-joined slug from the country/region/city fields PR 1 populated.

## Tests

109 normalizer tests + 46 dedup/shadow tests + 11 existing per-source ingestion tests = 166 green. 0 regressions.

## Verification (post-deploy)

After flipping `JOBS_DEDUP_V1=true` and running the cron once:

```sql
-- (a) sightings table populated
select count(*) from cached_jobs_sightings;

-- (b) every sighting has a non-null posting_key
select count(*) filter (where posting_key is null) from cached_jobs_sightings;
-- expected: 0

-- (c) cached_jobs rows touched got a posting_key
select count(*) filter (where posting_key is not null) as keyed,
       count(*) filter (where posting_key is null)     as unkeyed
  from cached_jobs;

-- (d) cross-source overlap
select posting_key, count(distinct source) as source_count,
       array_agg(distinct source order by source) as sources
  from cached_jobs_sightings
 where posting_key is not null
 group by posting_key
having count(distinct source) > 1
 order by source_count desc
 limit 20;
```
