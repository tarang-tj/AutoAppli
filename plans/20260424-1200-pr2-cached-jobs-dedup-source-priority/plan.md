# PR 2 — `cached_jobs` Cross-Source Dedup + Source Priority

**Status:** Implemented — pending review.
**Project:** AutoAppli — Jobs DB Phase C (data quality).
**Date:** 2026-04-24
**Predecessor:** PR 1 `pr1-normalization-foundations` (merged on `main`).

## What's already in place from PR 1

- `backend/app/services/ingestion/normalizers.py` — `normalize_company`, `normalize_location` (returning `LocationNorm(city, region, country, is_remote)`), `should_mark_remote`. PR 2 adds `normalize_title` next to them.
- `backend/app/services/ingestion/base.py` — `NormalizedJob.__post_init__` auto-populates `company_normalized`, `location_city/region/country`, `location_is_remote`, `normalized_version` from raw fields.
- `supabase/migrations/20260424140000_normalization_columns.sql` — added the corresponding columns to both `cached_jobs` and `jobs`, plus `last_verified_at`.
- `backend/scripts/ingest_all.py` — `_row_for_cached` already stamps `last_verified_at`.

PR 2 builds on top — does **not** duplicate any of the above.

## What this PR ships

PR 2 covers Phase A (schema) + Phase B (shadow-write) of the rollout.

1. [Phase 01 — Schema migration](phase-01-schema-migration.md) — done
2. [Phase 02 — Normalization extension + shadow-write wiring](phase-02-normalization-and-shadow-write.md) — done

### Files

**Modified (extending PR 1):**
- `backend/app/services/ingestion/normalizers.py` — added `normalize_title`.
- `backend/tests/test_ingestion_normalizers.py` — added title test cases (13 new).
- `backend/scripts/ingest_all.py` — dual-shape config reader, `JOBS_DEDUP_V1` flag (default OFF), shadow-write of `posting_key` + `cached_jobs_sightings`.
- `ingestion-config.json` — upgraded to rich shape with priority tiers (ashby=1 … weworkremotely=6).

**New:**
- `supabase/migrations/20260424160000_cached_jobs_dedup.sql` — adds `posting_key`, `winning_source`, `source_contribution` to `cached_jobs`; creates `cached_jobs_sightings` table.
- `backend/app/services/ingestion/dedup.py` — `compute_posting_key`, `canonical_url`, `raw_hash`. Reads PR 1's pre-normalized fields off `NormalizedJob`.
- `backend/tests/test_ingestion_dedup_shadow.py` — 33 cases.
- `docs/level-up/adrs/0006-cached-jobs-dedup.md`.
- `plans/pr3-cached-jobs-backfill-merge/README.md` — stub.

## Rollout

| Phase | What runs | Knob |
| --- | --- | --- |
| A | Migration. Columns/table exist, all NULL. | n/a |
| B (this PR) | Orchestrator writes `posting_key` + `cached_jobs_sightings` on every upsert. | `JOBS_DEDUP_V1=true` in cron env. |
| C (PR 3) | Single-transaction backfill against ~3.1k existing rows. | n/a |
| D (PR 3) | Field-level merge runs on every ingest; losers deleted. | flag inversion |
| E (PR 4) | `UNIQUE(posting_key)` constraint locks canonical guarantee. | drop the index |

## Tests

- 109 normalizer tests pass (PR 1's 96 + PR 2's 13 title tests).
- 46 dedup/shadow-write tests pass (PR 2 new).
- 11 existing per-source ingestion tests still green.
- 4 pre-existing service tests fail at collection on `main` — see `plans/main-broken-tests.md`. Independent of this PR.

## Open questions (resolved with user)

| Q | Answer |
| --- | --- |
| Priority order? | ashby > greenhouse > lever > workable > smartrecruiters > weworkremotely. |
| Ship `cached_jobs_sightings` in PR 2? | Yes. |
| Backfill in PR 3 batched? | No — single transaction, ~3.1k rows. |
| ADR in this PR? | Yes — `docs/level-up/adrs/0006-cached-jobs-dedup.md`. |
| Rollout split? | A+B = PR 2; C+D = PR 3; E = PR 4. |
| Priority in DB or config file? | Config file. |
| Title normalizer location? | `normalizers.py` next to company/location. |

## Deploy notes

- `supabase db push` to apply migration (additive, zero-downtime).
- `JOBS_DEDUP_V1=true` in `.github/workflows/ingest-cached-jobs.yml` env block to enable shadow-write.
- Verify first cron run with the SQL checks in `phase-02-normalization-and-shadow-write.md`.
- After 1 week of shadow data, start PR 3.
