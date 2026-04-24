-- 20260424140000_normalization_columns.sql
--
-- Job Data Quality — PR 1 (Foundations).
--
-- Adds normalized location + company fields and a `last_verified_at` freshness
-- timestamp to both `cached_jobs` (ingestion firehose) and `jobs` (user
-- kanban). Populated at ingest time by backend/app/services/ingestion/normalizers.py.
--
-- Design doc: plans/reports/design-260424-1200-job-data-quality-pr1-foundations.md
--
-- All additions are nullable or defaulted, so this migration is zero-downtime
-- and safe to apply before the backend code that populates them is deployed.
-- Existing rows stay untouched; a separate backfill script populates them
-- post-deploy (backend/scripts/backfill_normalization.py).
--
-- Rationale for mirroring both tables now (vs only cached_jobs):
--   PR 2 will add dedup across both tables and will need the same columns on
--   `jobs`. One migration here is cheaper than splitting across two PRs, and
--   keeps the schema consistent so downstream query code doesn't need
--   conditional handling.
--
-- Column semantics:
--   location_city        — canonical city (e.g. "San Francisco"). Null if
--                          unparseable from the raw `location` string.
--   location_region      — state/province code where known (ISO/USPS-style,
--                          e.g. "CA", "ON"). Null otherwise.
--   location_country     — ISO 3166-1 alpha-2 (e.g. "US", "CA", "GB"). Null
--                          if unparseable.
--   location_is_remote   — coarse boolean for fast remote/non-remote filter.
--                          True for remote and hybrid-remote-preferred roles.
--                          Complements the existing `remote_type` text column
--                          which carries the finer three-way distinction.
--   company_normalized   — lowercase, suffix-stripped canonical form of
--                          `company`. "Stripe, Inc." -> "stripe".
--   last_verified_at     — bumped by the ingest script on every successful
--                          upsert. Distinct from `last_seen_at` which is the
--                          raw firehose heartbeat; `last_verified_at` is
--                          meaningful freshness (PR 3 uses it for decay).
--   normalized_version   — integer version of the normalizer that produced
--                          this row. Lets future normalizer upgrades
--                          selectively re-backfill only affected rows.

-- --------------------------------------------------------------------------
-- cached_jobs (firehose) — primary target
-- --------------------------------------------------------------------------

alter table public.cached_jobs add column if not exists location_city       text;
alter table public.cached_jobs add column if not exists location_region     text;
alter table public.cached_jobs add column if not exists location_country    text;
alter table public.cached_jobs add column if not exists location_is_remote  boolean not null default false;
alter table public.cached_jobs add column if not exists company_normalized  text;
alter table public.cached_jobs add column if not exists last_verified_at    timestamptz;
alter table public.cached_jobs add column if not exists normalized_version  integer not null default 1;

-- --------------------------------------------------------------------------
-- jobs (user kanban) — mirror the same shape
-- --------------------------------------------------------------------------

alter table public.jobs add column if not exists location_city       text;
alter table public.jobs add column if not exists location_region     text;
alter table public.jobs add column if not exists location_country    text;
alter table public.jobs add column if not exists location_is_remote  boolean not null default false;
alter table public.jobs add column if not exists company_normalized  text;
alter table public.jobs add column if not exists last_verified_at    timestamptz;
alter table public.jobs add column if not exists normalized_version  integer not null default 1;

-- --------------------------------------------------------------------------
-- Indexes on cached_jobs
-- --------------------------------------------------------------------------

-- Company filter / typeahead on normalized names. The existing
-- `cached_jobs_company_idx` on `lower(company)` stays — it's still the path
-- used by any legacy query that hasn't moved to `company_normalized` yet.
create index if not exists cached_jobs_company_normalized_idx
  on public.cached_jobs (company_normalized)
  where company_normalized is not null;

-- Country-first country+region filter (drop-in for "US jobs" / "US, CA"
-- queries). Partial because most non-US rows will have null country in the
-- early weeks after backfill; the partial predicate keeps the index tight.
create index if not exists cached_jobs_location_country_region_idx
  on public.cached_jobs (location_country, location_region)
  where location_country is not null;

-- Boolean remote filter. Default-false, so the vast majority of rows share a
-- value; partial index on `true` keeps it small and fast for the common
-- "remote only" query.
create index if not exists cached_jobs_is_remote_idx
  on public.cached_jobs (location_is_remote)
  where location_is_remote = true;

-- Freshness sort. PR 3 will read this heavily.
create index if not exists cached_jobs_last_verified_at_idx
  on public.cached_jobs (last_verified_at desc)
  where last_verified_at is not null;

-- --------------------------------------------------------------------------
-- Indexes on jobs (user kanban is far smaller, but mirror for parity)
-- --------------------------------------------------------------------------

create index if not exists jobs_company_normalized_idx
  on public.jobs (company_normalized)
  where company_normalized is not null;

create index if not exists jobs_location_country_region_idx
  on public.jobs (location_country, location_region)
  where location_country is not null;

-- --------------------------------------------------------------------------
-- Reload PostgREST schema cache so REST clients see the new columns
-- --------------------------------------------------------------------------

notify pgrst, 'reload schema';
