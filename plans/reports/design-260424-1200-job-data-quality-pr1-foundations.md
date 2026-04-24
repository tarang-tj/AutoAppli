# Design Doc: Job Data Quality — PR 1 (Foundations)

**Project:** 3-PR series on job data quality.
**This PR:** Foundations — location + company normalization + `last_verified_at` column.
**Status:** Proposed. Not yet implemented. For user review.
**Scout report:** `plans/reports/Explore-260424-ingest-normalization-design.md`

## Goal

Make every row in `cached_jobs` carry normalized location and company fields plus a `last_verified_at` timestamp, set at ingest time. No behavior changes at the query/search layer in this PR — that lands in PR 2 and PR 3. This PR is pure data-shape upgrade.

## Why ingest-time (not query-time)

Scout confirmed a single chokepoint: `backend/scripts/ingest_all.py` is the sole writer to `cached_jobs` (all 6 ATS parsers funnel through it; the user-save path writes to `jobs`, not `cached_jobs`, and is out of scope for PR 1). That means one place to wire the normalizer and we're done — no landmines.

Ingest-time wins on: zero per-query cost, consistent rows, easy backfill (rerun cron), trivial test surface. Query-time would mean either expensive per-request parsing or a materialized view, both worse for this volume (~10k–100k active rows).

## Schema changes

New columns on `cached_jobs`:

| Column                | Type          | Notes                                               |
| --------------------- | ------------- | --------------------------------------------------- |
| `location_city`       | `text`        | Nullable. Canonical city, e.g. `"San Francisco"`.   |
| `location_region`     | `text`        | Nullable. State/province code where known (`"CA"`). |
| `location_country`    | `text`        | Nullable. ISO 3166-1 alpha-2 (`"US"`, `"GB"`, `"CA"`). |
| `location_is_remote`  | `boolean`     | Default `false`. True if the role is remote (incl. hybrid-remote-preferred). |
| `company_normalized`  | `text`        | Lowercase, suffix-stripped. `"stripe"`, not `"Stripe, Inc."`. |
| `last_verified_at`    | `timestamptz` | Bumped on every successful ingest upsert. Distinct from `last_seen_at` (which is already bumped by PostgREST on_conflict) because `last_verified_at` is set by our code with a single `NOW()` per batch — cleaner semantic than relying on the DB row update heuristic. |

Same six columns added to `jobs` table (already mirrors `cached_jobs` per migration `20260418120000_jobs_ingestion_columns.sql`).

**Indexes added (PR 1):**
- `CREATE INDEX idx_cached_jobs_company_normalized ON cached_jobs (company_normalized);`
- `CREATE INDEX idx_cached_jobs_location_country_region ON cached_jobs (location_country, location_region) WHERE location_country IS NOT NULL;`
- `CREATE INDEX idx_cached_jobs_last_verified_at ON cached_jobs (last_verified_at DESC);`

Not adding a dedup-hash column in PR 1. That belongs to PR 2.

**Existing `remote_type` column** (already present, values `'remote'|'hybrid'|'onsite'`): keep as-is. `location_is_remote` is the coarser boolean for fast filtering; `remote_type` stays for the UI three-way distinction. Normalizer populates both: `location_is_remote = remote_type in ('remote', 'hybrid')`.

## Normalizer module

New file: `backend/app/services/ingestion/normalizers.py`. Small, pure functions, unit-testable in isolation. No I/O. No geocoding API calls.

```python
from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class LocationNorm:
    city: Optional[str]
    region: Optional[str]
    country: Optional[str]
    is_remote: bool

def normalize_location(raw: str, source: str) -> LocationNorm: ...
def normalize_company(raw: str, source: str) -> str: ...
```

### `normalize_location` approach

Simple deterministic parser, no geocoding. Strategy:

1. Lowercase + strip.
2. Detect remote via keyword set: `{"remote", "anywhere", "worldwide", "fully remote", "wfh"}`. If found, `is_remote = True`; strip the keyword and continue parsing the rest.
3. Detect country suffix: match trailing `", <country>"` against a small map (`"us", "united states", "usa", "uk", "united kingdom", "canada", "germany", ...` → ISO code). ~30 entries covers 95% of US/CA student internship targets.
4. Parse `city, region` for US via the 50-state abbrev list. For non-US, leave region null unless the country has a known pattern (Canada provinces, UK regions).
5. Unparseable → return `LocationNorm(city=None, region=None, country=None, is_remote=False_or_detected)` and keep the raw string untouched in the existing `location` column.

Deliberately boring. No ML, no geocoding, no fuzzy match. If the parser can't identify a city, we leave it null rather than guess wrong. PR 3 can add fancier logic if we need it.

### `normalize_company` approach

1. Strip common suffixes: `, Inc.`, `, LLC`, `Inc`, `Corp`, `Corporation`, `Ltd`, `Limited`, `GmbH`, `PLC`, `Co.`, `Technologies`, `Technology`, etc.
2. Strip trailing punctuation.
3. Lowercase.
4. Strip internal punctuation except hyphens (`"t-mobile"` stays).
5. Collapse whitespace.

`"Stripe, Inc."` → `"stripe"`. `"Ramp Inc"` → `"ramp"`. `"T-Mobile"` → `"t-mobile"`. `"Meta Platforms"` → `"meta platforms"` (don't strip "Platforms" — too common a real noun).

Source-specific fallbacks (already in scout report):
- Lever exposes no company name; use the board slug titlecased as the raw input, then normalize.
- Greenhouse: prefer `job.company_name`, fallback to URL slug.

## Integration points

One function call per parser. Each `*_parser.py` in `backend/app/services/ingestion/` already has a `_normalize()` or equivalent that builds a `NormalizedJob` dataclass. Add three fields to that dataclass (`location_norm: LocationNorm`, `company_normalized: str`, no `last_verified_at` in the dataclass — that's set at write-time).

`ingest_all.py` sets `last_verified_at = datetime.now(timezone.utc)` once per run and includes it in the batch upsert payload.

## Backfill

Single-pass script: `backend/scripts/backfill_normalization.py`. Iterates existing `cached_jobs` rows in batches of 500, runs the normalizer on each, updates in place. Safe to run repeatedly (idempotent). Run once post-migration.

For the volume scout estimated (10k–100k rows), this runs in under a minute. Not a DB event.

## Testing

1. **Unit tests** for `normalize_location` and `normalize_company` — pure functions, one test file, golden input/output pairs drawn from the real fixtures in `test_ingestion_greenhouse.py`, `test_ingestion_lever.py`, `test_ingestion_ashby.py`. Target: 50+ cases covering US city/state, remote, non-US, edge cases (empty, whitespace, comma-heavy).
2. **Integration test** against the `ingest_all.py` batch path: feed a synthetic provider response, assert resulting `cached_jobs` row has the new fields populated.
3. **Backfill test** on a local Supabase branch: migrate, backfill, spot-check 10 rows.

No new CI job needed — the existing `test-backend.yml` picks up any `test_*.py` added to `backend/tests/`.

## Files to touch (PR 1)

New:
- `backend/app/services/ingestion/normalizers.py`
- `backend/tests/test_ingestion_normalizers.py`
- `backend/scripts/backfill_normalization.py`
- `supabase/migrations/<timestamp>_add_normalization_columns.sql`

Modified:
- Each of the 6 parsers under `backend/app/services/ingestion/*.py` (one `_normalize()` call each).
- `backend/scripts/ingest_all.py` (set `last_verified_at`, include new fields in upsert payload).

Not touched (explicit):
- Frontend. PR 1 does not change any display.
- `live_search_service.py`. PR 1 does not change query behavior.
- `routers/jobs.py` (user-save path). Out of scope; PR 2 or 3 if we decide user-save should also normalize.
- `jobs` table schema **not** being mirrored in this PR. Reason: new columns on `cached_jobs` only for PR 1 keeps scope tight. PR 2 mirrors to `jobs` when dedup lands, since dedup ops span both tables. (Reconsider if review thinks this makes PR 2 too big.)

## Rollout sequence

1. Apply migration (pure additive, all columns nullable or defaulted — zero-downtime).
2. Deploy backend with normalizer code live.
3. Wait for next scheduled ingest (daily 09:00 UTC) to populate forward.
4. Run backfill script once against existing rows.
5. Verify via `SELECT count(*) WHERE company_normalized IS NOT NULL` etc.

## Success criteria

- [ ] New columns present on `cached_jobs` after migration.
- [ ] After one ingest cycle + backfill, ≥95% of rows have non-null `company_normalized`, `last_verified_at`, and `location_is_remote`.
- [ ] ≥70% of non-remote rows have non-null `location_city` and `location_country`. (Remaining 30% is the long tail — foreign cities, weird formatting — which the dumb parser will skip. PR 3 can chase that tail.)
- [ ] Unit tests pass. 50+ cases.
- [ ] Backfill script runs to completion on local Supabase branch in under 2 minutes for 100k rows.

## What's explicitly NOT in PR 1

- Dedup hashing (PR 2).
- Source-priority ranking for dedup (PR 2).
- Freshness thresholds / JD quality scoring (PR 3).
- Query-layer changes in `live_search_service` (PR 2).
- Frontend display of normalized fields.
- Any changes to the Chrome extension or user-save path.

## Open questions for review

1. **`jobs` table mirroring** — should the new columns mirror to `jobs` now, or wait for PR 2? Current plan defers to PR 2. Counter-argument: one migration is easier than two, and PR 2's migration will need to touch `jobs` anyway. **Recommendation: mirror now to keep `jobs` and `cached_jobs` schemas aligned; it's 3 extra DDL statements.** Need a call.
2. **Backfill cadence** — one-shot script vs a recurring "normalize the stragglers" cron? Recommendation: one-shot is fine; any future ingest writes are normalized in place.
3. **Remote detection heuristic** — is the keyword set sufficient, or do we need sentence-level parsing ("mostly remote, some travel to SF quarterly")? Recommendation: keep it dumb. Users who want rich remote filtering can use the existing `remote_type` column which has better signal from the JD body.
4. **Normalizer determinism guarantee** — do we want a `version` field so future normalizer changes can re-backfill only affected rows? Recommendation: yes, add a `normalized_version int default 1` column on `cached_jobs` in the same migration. Cheap insurance.

## Estimated effort

- Migration + SQL: 30 min
- Normalizer module + 50 unit tests: 2–3 hours
- Parser integration (6 files, one line each): 30 min
- `ingest_all.py` wiring: 20 min
- Backfill script: 45 min
- Integration test: 45 min
- Local validation + Supabase branch test: 1 hour

Total: ~6 hours focused work. One PR.
