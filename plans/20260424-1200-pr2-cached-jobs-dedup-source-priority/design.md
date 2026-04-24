# Design Doc — `cached_jobs` Cross-Source Dedup + Source Priority

**Author:** Claude (drafted for Tarang, 2026-04-24)
**Status:** Implemented (PR 2 = Phase A + Phase B).

## 1. Problem

AutoAppli's Jobs DB is split into two tables (`20260420120000_cached_jobs.sql`):

- **`cached_jobs`** — shared ingestion firehose written by the nightly orchestrator. Discover + recommendation engine read it.
- **`jobs`** — user-owned kanban rows. Save copies fields into a fresh `jobs` row; **no FK to `cached_jobs`** (`repositories/jobs_supabase.py::create_job`). User state is decoupled from ingestion identity by construction.

PR 1 (`pr1-normalization-foundations`, merged) shipped:
- `normalize_location` and `normalize_company` in `services/ingestion/normalizers.py`.
- `NormalizedJob.__post_init__` auto-populates `company_normalized`, `location_city/region/country/is_remote`, `normalized_version`.
- Migration `20260424140000_normalization_columns.sql` added those columns + `last_verified_at` to both `cached_jobs` and `jobs`.

What PR 1 didn't address: cross-source dedup. The `UNIQUE(source, external_id)` constraint plus the in-memory `dedupe_jobs()` helper only dedup within a single source. Two sources reporting the same posting → two rows, two Discover tiles, two recommendation scores.

PR 2 fills that gap.

## 2. Goals

1. **One canonical `cached_jobs` row** per real-world posting, even when N sources report it.
2. **Deterministic, config-driven source priority** — a non-code change can re-rank.
3. **Idempotent ingestion.** Re-running a source cron converges, doesn't flap canonical choice.
4. **Auditability.** `cached_jobs_sightings` records which sources contributed.
5. **Zero impact on `jobs`.** User kanban untouched.
6. **Reversible rollout.** `JOBS_DEDUP_V1` flag gates shadow-write; backfill separate.

## 3. Non-goals

- Cross-company fuzzy match.
- Dedup of user-saved `jobs` rows.
- Re-tuning match-v2.
- Title normalization for any purpose other than dedup (PR 1's stance: parsers don't need to read `title_normalized`).

## 4. Design

### 4.1 Schema (PR 2 — Phase A)

Migration `20260424160000_cached_jobs_dedup.sql` adds:

```sql
alter table public.cached_jobs
  add column if not exists posting_key         text,
  add column if not exists winning_source      text,
  add column if not exists source_contribution jsonb default '{}'::jsonb;

create index if not exists cached_jobs_posting_key_idx
  on public.cached_jobs (posting_key);

create table if not exists public.cached_jobs_sightings (
  source        text not null,
  external_id   text not null,
  posting_key   text,
  url           text,
  raw_hash      text,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  primary key (source, external_id)
);
create index if not exists cached_jobs_sightings_posting_key_idx
  on public.cached_jobs_sightings (posting_key);
```

`UNIQUE(posting_key)` deferred to PR 4 — backfill in PR 3 may surface genuine hash collisions that need human review.

### 4.2 Posting key (PR 2 — Phase B)

```
posting_key = sha256(
  company_normalized || \x1F ||              # PR 1
  normalize_title(title) || \x1F ||          # PR 2 (added to normalizers.py)
  location_part                              # PR 1 fields, joined per rule
)
```

Where `location_part` is:
- `"remote"` when `job.location_is_remote` is true (PR 1's `should_mark_remote` reconciler).
- `"country/region/city"` slash-joined slug otherwise (using `location_country`, `location_region`, `location_city`).
- `"unknown"` when no location fields parsed.

`compute_posting_key` is a 6-line function in `dedup.py` that reads pre-normalized fields off `NormalizedJob`. Zero re-normalization at hash time.

### 4.3 Title normalizer

Added to PR 1's `normalizers.py` to keep all canonicalizers in one place. Rules:

- Lowercase.
- Strip parenthesized/bracketed content (`"Senior Engineer (Remote, US)"` → `"senior engineer"`).
- Strip trailing `" - <location>"` / `" / <location>"` qualifiers.
- Expand abbreviations: `sr`→`senior`, `jr`→`junior`, `mgr`→`manager`, `eng`→`engineer`, `dev`→`developer`, `&`→`and`.
- Preserve seniority — `"Senior Engineer"` and `"Engineer"` produce different output.

Known asymmetry: `"Eng Manager"` ≠ `"Engineering Manager"` (the former expands `eng → engineer`, the latter doesn't expand `engineering`). Documented in code; will revisit only if real-world duplicates surface.

### 4.4 Source priority (consumed by PR 3)

Held in `ingestion-config.json`:

```jsonc
"sources": {
  "ashby":           { "priority": 1, "slugs": [...] },
  "greenhouse":      { "priority": 2, "slugs": [...] },
  "lever":           { "priority": 3, "slugs": [...] },
  "workable":        { "priority": 4, "slugs": [...] },
  "smartrecruiters": { "priority": 5, "slugs": [...] },
  "weworkremotely":  { "priority": 6, "slugs": [...] }
}
```

`_load_config` accepts both this rich shape and the legacy flat `{source: [slugs]}` shape (defaulting priority to 999). PR 2 **stores** priority in the runtime; PR 3 **uses** it for merge.

### 4.5 Merge rules (deferred to PR 3)

Field-level highest-priority-wins, with `last_seen_at desc` as tiebreak. Special cases:
- `description` — within top two priorities, pick the longer one when priority-1's length < 60% of priority-2's. Aggregators truncate.
- `posted_at` — earliest non-null (the real posting date), ignoring priority.
- `last_seen_at` — `MAX` across sightings.
- `first_seen_at` — never overwritten by merge.
- `skills`, `tags` — set-union.
- `salary_min`, `salary_max` — prefer the sighting where both are present; if only one source has salary, take it regardless of priority.

### 4.6 Feature flag + rollout

`JOBS_DEDUP_V1` env var, default off. Five-phase rollout:

| Phase | Where | Behavior | Rollback |
| --- | --- | --- | --- |
| A | PR 2 | Migration ships. Columns exist, all NULL. | Drop columns. |
| B | PR 2 | Orchestrator writes `posting_key` + `cached_jobs_sightings`. | Flip flag off. |
| C | PR 3 | Single-transaction backfill of ~3.1k existing rows. | DB restore. |
| D | PR 3 | Online merge runs on every ingest; losers deleted. | Revert PR 3. |
| E | PR 4 | `UNIQUE(posting_key)`. | Drop the unique index. |

## 5. Testing

- 109 normalizer tests (PR 1's 96 + PR 2's 13 title cases).
- 46 dedup/shadow tests (PR 2).
- 11 per-source ingestion regression tests still green.
- All in `backend/tests/`.

## 6. Risks (carried into PR 3+)

| Risk | Mitigation |
| --- | --- |
| Over-aggressive dedup collapses different teams' roles with identical title at same company. | Key includes location + remote flag. UNIQUE deferred to PR 4. PR 3 backfill logs warnings instead of silently collapsing ambiguous groups. |
| Under-aggressive dedup leaves duplicates. | `dedup_contributors_histogram` from shadow-write data tells us before PR 3 ships. |
| Losing user-visible posting when merger deletes it. | `jobs` copies fields on save — no FK to `cached_jobs`. Discover re-query after dedup still returns an equivalent row (the canonical). |
| Priority config error (wrong ranks) silently degrades quality. | Config lives outside code, logged on startup, decisions auditable via `source_contribution`. |

## 7. Alternatives rejected

- **`job_postings` + `job_source_records` split.** Too much blast radius; overlay on `cached_jobs` is sufficient.
- **MinHash / embedding fuzzy match.** Out of PR-2 scope.
- **Materialized view dedup-on-read.** Doesn't solve `last_seen_at` flapping.
- **`UNIQUE(posting_key)` from day 1.** Forces resolving collisions before migration; defer to PR 4.
- **Priority in a Supabase table.** Solo builder, no runtime-toggle need; config file is enough.
