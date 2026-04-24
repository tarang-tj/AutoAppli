# ADR 0006 — Cross-source dedup for `cached_jobs`

**Status:** Accepted (2026-04-24)
**Supersedes:** None
**Superseded by:** None

## Context

AutoAppli ingests jobs from six sources (ashby, greenhouse, lever, smartrecruiters, weworkremotely, workable) into a shared firehose table `cached_jobs`. Today the only dedup is `UNIQUE(source, external_id)` plus the in-memory `dedupe_jobs()` helper in `services/ingestion/base.py` — both dedup within a single source. When two sources report the same real-world posting (an Ashby-native posting echoed by WeWorkRemotely, or a Lever listing cross-posted to a remote board), we get multiple `cached_jobs` rows, multiple Discover tiles, and duplicate recommendation scoring.

PR 1 (`pr1-normalization-foundations`, merged) shipped the prerequisite normalizer foundation: `normalize_company`, `normalize_location`, and the `location_city/region/country/is_remote/company_normalized/normalized_version/last_verified_at` columns on both `cached_jobs` and `jobs`. This ADR records the design for the follow-up dedup pass that consumes those normalized fields.

## Decision

Introduce a cross-source canonical identity on `cached_jobs` via a `posting_key` column derived at ingest time from PR 1's pre-normalized fields, plus a `cached_jobs_sightings` audit table recording each source's sighting of each canonical posting. PR 2 ships only the schema + shadow-write; PR 3 layers field-level merge over it.

### Key shape

```
posting_key = sha256(
  company_normalized || U+001F ||
  normalize_title(title) || U+001F ||
  location_part
)
```

`location_part` is `"remote"` when `location_is_remote` is true; otherwise `country/region/city` joined with `/` (or `"unknown"` when none parsed).

`company_normalized` and the four `location_*` fields come straight off PR 1's `NormalizedJob.__post_init__` — no re-normalization. The title normalizer (`normalize_title`) is added to PR 1's `normalizers.py` in this PR so all canonicalizers live under one roof.

URL canonicalization (`canonical_url` in `dedup.py`) strips tracking params, fragment, and `www.`, and is stored on `cached_jobs_sightings.url` for a future URL-fingerprint match path (used by PR 3, not PR 2).

### Excluded from the hash

- **Salary** — sparse per the `cached_jobs` migration comment ("rarely populated by ingestion").
- **`posted_at`** — varies across sources for the same real posting.
- **Employment type** — not in the current schema.
- **Description** — too noisy; aggregators truncate.

### Priority tier

Held in `ingestion-config.json` so a non-code change retunes:

1. ashby
2. greenhouse
3. lever
4. workable
5. smartrecruiters
6. weworkremotely

ATS-native feeds (1–4) carry richer structured fields than aggregators (smartrecruiters occasionally, weworkremotely always). Within ATS, ashby is ranked above greenhouse because its API surfaces more fields (compensation metadata, team labels). Within equal priority, freshness (`last_seen_at desc`) breaks ties.

The reader in `_load_config` accepts both the legacy flat shape (`{source: [slugs]}`) and the new rich shape (`{source: {priority, slugs}}`), defaulting to priority 999 for the flat shape.

### Merge rules (implemented in PR 3)

- Field-level highest-priority-wins.
- `description`: within top two priorities, pick the longer one if priority-1's length < 60% of priority-2's. Aggregators truncate.
- `posted_at`: earliest non-null across sightings (the real posting date).
- `last_seen_at`: max across sightings.
- `first_seen_at`: never overwritten by merge.
- `skills`, `tags`: set-union across sightings.
- `salary_min`, `salary_max`: prefer the sighting where both are present; if only one source has salary, take it regardless of priority.

### Rollout split (three PRs)

| PR  | Scope                                                            | Rollback                        |
| --- | ---------------------------------------------------------------- | ------------------------------- |
| PR 2 (this work) | Phase A (schema) + Phase B (shadow-write). Migration adds columns; orchestrator writes `posting_key` and `cached_jobs_sightings` behind `JOBS_DEDUP_V1` env flag (default off). No merge, no collapse, no UNIQUE. | `JOBS_DEDUP_V1=false` (or unset). Migration drop is clean. |
| PR 3 | Phase C (backfill) + Phase D (online merge). Collapses existing duplicates in a single transaction (prod has ~3,102 rows); orchestrator runs full merge on every ingest. | Revert PR 3 merge; DB restore for backfill. |
| PR 4 | Phase E — `UNIQUE(posting_key)`. Locks in the canonical guarantee. | Drop the unique index. |

The split exists so we get a week of shadow-write telemetry from PR 2 before committing to merge logic in PR 3. The `dedup_contributors_histogram` from Phase B tells us whether the normalizer behaves as expected on real data.

## Alternatives considered

- **Split into `job_postings` + `job_source_records`.** Rejected: requires rewriting every reader of `cached_jobs` (Discover, recommendations). Not worth the blast radius when columns on the existing table solve the same problem.
- **MinHash / embedding fuzzy match across titles.** Rejected: too much surface area and infrastructure dependency. Revisit only if the hash-based key leaves duplicates on the table at scale.
- **Dedup on read via materialized view.** Rejected: doesn't solve per-source flapping of `last_seen_at` on the "recently posted" sort, and re-materializing on every ingest is expensive.
- **UNIQUE(posting_key) from day 1.** Rejected: forces resolving every genuine hash-collision (distinct roles with identical normalized titles at the same company) before the migration can land. Ship nullable + indexed first; tighten after a week of data.
- **Priority in Supabase `source_priorities` table (live-editable).** Rejected: solo builder, no ops rotation needing a runtime toggle, one less migration and RLS surface. `ingestion-config.json` is sufficient and git-auditable.

## Consequences

- Two new persistent columns on `cached_jobs` (`posting_key`, `winning_source`, `source_contribution`) and one new table (`cached_jobs_sightings`). RLS-parity with `cached_jobs` — public read, service-role writes.
- Ingestion cost per run increases by one HTTP POST per batch (the sighting upsert). Batch size remains 200; expected latency delta < 5% per run.
- `ingestion-config.json` shape is now "rich" but the reader accepts the legacy flat shape forever.
- A new `dedup.py` module becomes the home for cross-source dedup logic. Title normalization extends PR 1's `normalizers.py` rather than living separately.
