# PR 3 — `cached_jobs` Backfill + Merge

**Status:** Stub — not started. Blocked on PR 2 merging + ~1 week of shadow-write telemetry.

**Predecessor:** [PR 2](../20260424-1200-pr2-cached-jobs-dedup-source-priority/plan.md).

## Scope

- **Phase C — Backfill.** One-shot script that groups existing `cached_jobs` rows by `posting_key` and collapses duplicates. Prod has ~3,102 rows today — small enough to run in a **single transaction** (no batching, no checkpointing).
- **Phase D — Online merge.** Orchestrator runs field-level priority merge on every ingest. `winning_source` and `source_contribution` populated. Losers deleted from `cached_jobs`; only the canonical row survives.

## Not in scope (deferred to PR 4)

- `UNIQUE (posting_key)` constraint.

## Prereqs

- [ ] PR 2 merged.
- [ ] Seven days of shadow data reviewed:
      - [ ] `cached_jobs_sightings` shows expected multi-source overlap on known cases (e.g., Linear postings via Ashby + WeWorkRemotely).
      - [ ] No rash of collisions on legitimate distinct roles.
      - [ ] Title/location normalizer behavior on edge cases that PR 2 tests missed.
- [ ] Staging DB snapshot for backfill dry-run.
- [ ] Priority order from PR 2 design §5.4 still stands.

## Rough file list

- New: `backend/scripts/backfill_cached_jobs_dedup.py`
- New: `backend/app/services/ingestion/merge.py`
- Touched: `backend/scripts/ingest_all.py` (run merge after sighting upsert)
- Tests: `backend/tests/test_ingestion_merge.py`, `test_backfill_cached_jobs_dedup.py`

## Reconciliation report template

PR 3's backfill emits `plans/pr3-cached-jobs-backfill-merge/reconciliation-<date>.json`:

```json
{
  "run_started_at": "...",
  "before": {"cached_jobs_rows": 3102, "distinct_posting_keys": 2850},
  "after":  {"cached_jobs_rows": 2850, "distinct_posting_keys": 2850},
  "collapsed_groups": 252,
  "warnings": [],
  "per_priority_wins": {"ashby": 180, "greenhouse": 45, "lever": 15, "workable": 8, "smartrecruiters": 3, "weworkremotely": 1}
}
```

---

**Do not start implementation until PR 2 is merged and the week-of-shadow-data review is complete.**
