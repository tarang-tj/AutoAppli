# AutoAppli Data Quality Design Scout Report

## 1. INGESTION FLOW — Entry Points and Data Shape

### Single Chokepoint for Cached Jobs (ATS Firehose)
**Unified entry: `backend/scripts/ingest_all.py` → all ATS sources → `cached_jobs` table**

- **Trigger**: GitHub Action `.github/workflows/ingest-cached-jobs.yml` runs daily at 09:00 UTC
- **Flow**: 
  1. `ingest_all.py` loads config from `ingestion-config.json` (lists of company slugs per source)
  2. For each source (greenhouse, lever, ashby, workable, smartrecruiters, weworkremotely), calls `source.fetch(slugs)`
  3. Each source returns `list[NormalizedJob]` (defined in `backend/app/services/ingestion/base.py`)
  4. `dedupe_jobs()` dedupes in-memory by `canonical_id` (sha1(source:external_id)[:16])
  5. Batch upserts to `cached_jobs` via PostgREST with `?on_conflict=source,external_id` (line 131)
  6. Post-run sweep: marks rows with `last_seen_at < run_start` as `inactive_at = now()`

**Data shape transformation**:
- **Input (raw JSON)**: Provider-specific (see examples below)
- **Intermediate (`NormalizedJob` dataclass)**: source, external_id, title, company, url, description, location, remote_type, salary_min/max, skills[], tags[], posted_at
- **Output (`cached_jobs` row)**: All fields from NormalizedJob plus lifecycle: first_seen_at, last_seen_at, inactive_at

**Normalization currently applied in-transit**:
- HTML stripping (all parsers use `_strip_html()` regex)
- Remote-type keyword sniffing (all parsers implement `_detect_remote()`)
- Skills extraction via `match_v2.extract_skills()` and `taxonomy.normalize_skill_list()`
- URL field passthrough (light normalization only via `normalize_job_url()` in router layer)

---

### ATS Parser Entry Points (All route via ingest_all.py)

#### Greenhouse (`backend/app/services/ingestion/greenhouse.py`)
- **Entry**: `GreenhouseSource.fetch()` fetches from `https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true`
- **Raw location string**: Greenhouse provides `job.location.name` (e.g., `"San Francisco, CA"`, `"Remote"`)
- **Company identity**: Falls back to board token if `company_name` missing (line 123: `raw.get("company_name") or token`)
- **Output location**: Passed as-is or None; remote-type detected via `_detect_remote(location, description)`

#### Lever (`backend/app/services/ingestion/lever.py`)
- **Entry**: `LeverSource.fetch()` fetches from `https://api.lever.co/v0/postings/{site}?mode=json`
- **Raw location string**: `categories.location` (e.g., `"San Francisco"`, `"Remote"`) or joins `allLocations` list (line 113: `", ".join()`)
- **Company identity**: Site slug only; Lever API does not expose display names (line 147: `company=site`)
- **Output location**: Merged multi-location as comma-separated string

#### Ashby (`backend/app/services/ingestion/ashby.py`)
- **Entry**: `AshbySource.fetch()` fetches from `https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true`
- **Raw location string**: `locationName` (e.g., `"San Francisco, CA"`, `"Remote"`); merges `secondaryLocations` if present
- **Company identity**: `organizationName` or `companyName` fallback (line 161)
- **Output location**: Primary + secondary merged; remote-type sniffed

#### Workable, SmartRecruiters, WeWorkRemotely
- Similar pattern: raw location object or string → location format function → output string
- SmartRecruiters: `_format_location()` rebuilds from `{fullLocation, city, region, country}` dict (line 77–88)

---

### User-Save Path (Separate from Cached Jobs)
**Entry: `POST /api/v1/jobs` → `backend/app/routers/jobs.py:create_job()`**
- Writes to `public.jobs` table (user-tied kanban), NOT `cached_jobs`
- Sources: manual save, scraper + optional full-description fetch from Indeed
- Optional on-demand scrape via `scraper_service.scrape_job_details()` if `fetch_full_description=True`
- URL normalization: `normalize_job_url()` only (minimal: ensure https://)
- NO dedup by URL across users (user cankan allows duplicates)
- **This path is isolated from ATS ingestion; no shared normalization**

---

### Live Search Fallback
**Entry: `backend/app/services/live_search_service.py:live_search()`**
- Reads `cached_jobs` via `cached_jobs_supabase.search_cached_jobs()`
- If <5 cached results, hits Indeed scraper via `scraper_service.search_jobs()`
- Dedup by URL only (line 79: `seen_urls.add(r.url)`) — flat dedup, no source ranking

---

## 2. CURRENT SCHEMA

### `cached_jobs` Table (Firehose, ATS-Fed)
**Defined**: `supabase/migrations/20260420120000_cached_jobs.sql`

Columns (all):
- `id` (uuid, pk)
- `source` (text, NOT NULL) — e.g., "greenhouse", "lever", "ashby"
- `external_id` (text, NOT NULL) — provider's internal ID (job.id or slug)
- `title`, `company`, `url`, `description` (text fields)
- `location` (text, nullable) — raw location string from provider
- `remote_type` (text, check in ('remote','hybrid','onsite'))
- `salary_min`, `salary_max` (integer, nullable)
- `skills`, `tags` (text[], default '{}')
- `posted_at` (timestamptz, nullable) — provider's publish date
- **Freshness**: `first_seen_at` (set once), `last_seen_at` (bumped on upsert), `inactive_at` (set by sweep)

Indexes:
- `(source, external_id)` UNIQUE — upsert conflict key
- `(last_seen_at DESC)` partial WHERE `inactive_at IS NULL` — "active & recent" query
- `(company)` LOWER — company filter/typeahead
- `(posted_at DESC)` — newest postings sort
- GIN on `skills[]`, `tags[]` — faceting

RLS: Public read (anon + authenticated); no insert/update/delete for non-service-role.

---

### `jobs` Table (User Kanban, Manual + Scraped)
**Defined**: `supabase/migrations/20260406120000_create_jobs.sql` + ingestion columns via `20260418120000_jobs_ingestion_columns.sql`

Columns (merged):
- `id` (uuid, pk), `user_id` (uuid, NOT NULL) — user ownership
- `company`, `title`, `url`, `description`, `status` (kanban column)
- `source` (text, default 'manual')
- `location`, `remote_type`, `salary_min`, `salary_max` — parity with cached_jobs
- `skills[]`, `tags[]` (text arrays)
- `posted_at` (timestamptz) — from ingestion
- `sort_order` (integer) — kanban drag-drop order per status
- `notes`, `applied_at`, `created_at`, `updated_at`
- **No freshness columns like `last_seen_at` or `inactive_at`** — user-tied rows are never swept

Indexes:
- `(source, external_id)` UNIQUE WHERE both NOT NULL — allows null source (manual entries)
- `(user_id, status, sort_order)` — kanban load
- `(posted_at DESC)` — "what's new"

RLS: User owns their rows; select/insert/update/delete only on own user_id.

---

### Relationship
- `cached_jobs`: firehose from ATS, read by Discover + recommendations
- `jobs`: subset of firehose OR manual saves, one per user, with kanban state
- **No foreign key** between them; user saves a cached_job by copying fields into jobs with their user_id

---

## 3. NORMALIZATION SURFACE — Current State

### Location Examples (from test fixtures)
Raw inputs by source:
- **Greenhouse**: `"San Francisco, CA"`, `"Remote"`
- **Lever**: `"San Francisco"`, `"Remote - US"`, `"Remote"` (merged from allLocations array)
- **Ashby**: `"San Francisco, CA"`, `"Remote"`, with optional secondary locations
- **SmartRecruiters**: `{fullLocation: "...", city: "...", region: "...", country: "..."}` → rebuilt as `"City, Region, Country"`

**Problem**: No canonical form. `"San Francisco, CA"` vs `"SF, California"` vs `"San Francisco"` would not dedupe.
**Current processing**: Just passed as-is to `cached_jobs.location` column (nullable text).
**Remote detection**: Keyword sniff (all parsers do this identically) → `remote_type` = "remote" | "hybrid" | "onsite"

---

### Company Examples
Raw inputs:
- **Greenhouse**: `job.company_name` if present, else board token (e.g., `"Stripe, Inc."` or fallback to `"stripe"`)
- **Lever**: Site slug only (e.g., `"netflix"`) — API does not expose company display name
- **Ashby**: `job.organizationName` or `job.companyName` — may be `"Ramp"` or `"Ramp Inc"`
- **SmartRecruiters**: Passed company slug from config (e.g., `"Bosch"`)

**Problem**: Casing/suffix variation. No company canonical form. Dedup would require exact match.
**Current processing**: Passed as-is to `cached_jobs.company` column.

---

### URL Deduplication
Currently:
- **Cached jobs**: Upsert by `(source, external_id)` unique index — dedup **per-source only**
  - A Lever job with external_id="abc" and a Greenhouse job with external_id="abc" both survive (different sources)
  - But the same Greenhouse external_id appearing twice in one run is deduped in-memory by `dedupe_jobs()` before upsert
- **Live search**: Dedup by URL only (`seen_urls.add(r.url)`) — flat, no source ranking
- **User jobs**: No dedup; user cankan allows duplicate URLs if source differs

**No cross-source dedup today**: If LinkedIn and Greenhouse both list an identical job with different IDs, both rows exist in `cached_jobs`.

**URL normalization**: Only `normalize_job_url()` adds https:// prefix; no query-param stripping or hash.

---

## 4. RECOMMENDATION INPUTS

### **Where Should Normalization Live?**

**Recommendation: Ingest-time (at the writer), with a single shared module.**

**Rationale**:
1. **All writers already pass through `ingest_all.py`**: There is a single chokepoint for the 6 ATS sources. This is the ideal place to normalize.
2. **User-save path is isolated**: The `POST /api/v1/jobs` router writes to `jobs` table, not `cached_jobs`. It already normalizes URL minimally and does not dedup. Normalization there is orthogonal to ATS.
3. **Query-time normalization costs**: Location normalization (city/state parsing, geocoding) is expensive; repeat per query = high cost. Hashing location once at ingest = no per-query cost.
4. **Backfill simplicity**: If you normalize at ingest, a backfill migration only needs to re-run `ingest_all.py` with a flag. No manual SQL transformation.
5. **Consistency**: Every row in `cached_jobs` gets the same normalizer path; no divergence between old + new rows.

**Landmines (check for direct writers)**:
- `cached_jobs_supabase.py` is read-only; good.
- `jobs_supabase.py` only reads/writes user rows (has `user_id`); not an issue for cached_jobs.
- No direct raw-SQL inserts found in codebase; ingest_all.py is the sole writer to `cached_jobs`.

**Where to put the normalizer code**:
```
backend/app/services/ingestion/normalizers.py  (NEW)
├── normalize_location(raw_location: str, source: str) → (canonical_location: str, city: str, state: str, country: str)
├── normalize_company(raw_company: str, source: str) → canonical_company: str
├── hash_job_identity(source: str, external_id: str, url: str) → dedup_hash: str
```

Integrate in `backend/app/services/ingestion/__init__.py` and call from each parser's `_normalize()` method before returning `NormalizedJob`.

---

## 5. DATA VOLUME & CADENCE

### Row Count
- **Estimated**: 10k–100k active rows in `cached_jobs` (from live_search_service.py line 9 docstring)
- Based on config: 6 sources × ~2–10 company slugs each = ~50 company boards ingested per run
- Assuming 50–200 jobs per board on average = 2.5k–10k rows per nightly run

### Ingestion Cadence
- **Cron**: Daily at 09:00 UTC (see `ingest-cached-jobs.yml` line 25)
- **Manual trigger**: Available via `gh workflow run` (see lines 19–21)
- **Batch size**: 200 rows per PostgREST upsert (line 63 in ingest_all.py)

### Backfill Feasibility
- **Non-event** if you write a one-time migration script that calls `ingest_all.py --source <name>` for each source
- Table is ~10k rows; standard ALTER TABLE ADD COLUMN + UPDATE all rows would take seconds
- **Alternatively**: Re-run the cron with normalization code already in place; old rows get normalized on next upsert

---

## 6. Test Fixtures & Validation

**Good news**: Location fixtures exist in test files; use these for normalizer validation:

```
backend/tests/test_ingestion_greenhouse.py:
  "location": {"name": "San Francisco, CA"}
  "location": {"name": "Remote"}

backend/tests/test_ingestion_lever.py:
  "location": "San Francisco"
  "allLocations": ["San Francisco", "Remote - US"]
  "location": "Remote"

backend/tests/test_ingestion_ashby.py:
  "locationName": "San Francisco, CA"
  "locationName": "Remote"
```

**Test strategy**:
1. Create `backend/tests/test_ingestion_normalizers.py`
2. Add before/after location strings (from fixtures + real data)
3. Validate normalizer output: city, state, country fields populate correctly
4. Test source priority ranking: if same job appears in multiple sources, prefer company ATS > aggregator

---

## STATUS & SUMMARY

**DONE** — Ingestion flow fully mapped. Single chokepoint (`ingest_all.py`) feeds ATS → `cached_jobs`. User-save path isolated. Schema has the right columns for normalization (location, company, posted_at, freshness trio: first_seen_at / last_seen_at / inactive_at). No direct SQL writers found.

**KEY INSIGHTS**:
- Normalize at ingest-time in `backend/app/services/ingestion/normalizers.py`
- Integration point: Each parser's `_normalize()` method calls the shared module
- Backfill: Re-run nightly cron; no manual SQL needed
- URL dedup today is (source, external_id) only; your PR#2 (hash-based with source priority) will require schema change (`dedup_hash` column) + unique index

**NEXT STEPS FOR YOUR 3-PR PLAN**:
1. PR#1: Add `last_verified_at` column, location normalizer → (city, state, country)
2. PR#2: Add `dedup_hash` column, compute in normalizer, re-index on `(dedup_hash, source)` for priority ranking
3. PR#3: Add JD quality signal columns + freshness-signal logic in query layer (cached_jobs_supabase.py)
