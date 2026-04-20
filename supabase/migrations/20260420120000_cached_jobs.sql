-- 20260420120000_cached_jobs.sql
--
-- Job DB Phase B — shared "ingestion firehose" table.
--
-- Why a separate table from `public.jobs`:
--   `public.jobs` carries user-tied rows (kanban entries, manually saved
--   listings) plus columns the user maintains themselves — outcome,
--   archived_at, applied_at, etc. The ingestion pipeline writes a much
--   higher volume of rows that no specific user owns; mixing them into
--   `jobs` complicates RLS, blows up indexes, and forces every per-user
--   query to filter on `user_id IS NOT NULL`.
--
--   `cached_jobs` is the upstream firehose. The Discover page and
--   recommendation engine read from it; when a user saves a row to their
--   kanban it copies into `jobs` with the user's `user_id`.
--
-- Lifecycle columns:
--   first_seen_at  — set once on insert, never updated.
--   last_seen_at   — bumped to now() on every upsert that touches the row.
--   inactive_at    — set by the orchestrator's sweep pass after a run
--                    finishes, for any row whose `last_seen_at` predates the
--                    run start. A subsequent run that re-finds the row
--                    clears `inactive_at` back to NULL.

create table if not exists public.cached_jobs (
  id            uuid primary key default gen_random_uuid(),

  -- Provider identity (matches NormalizedJob)
  source        text not null,
  external_id   text not null,

  -- Display fields
  title         text not null,
  company       text not null,
  url           text not null,
  description   text default '',

  -- Location & remote
  location      text,
  remote_type   text check (remote_type in ('remote','hybrid','onsite')),

  -- Compensation (rarely populated by ingestion; reserved for parity)
  salary_min    integer,
  salary_max    integer,

  -- Structured fields extracted by the ingestion layer
  skills        text[] default '{}'::text[],
  tags          text[] default '{}'::text[],

  -- Timestamps
  posted_at     timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  inactive_at   timestamptz,

  unique (source, external_id)
);

-- "Active jobs newer than X" — the dominant Discover query.
create index if not exists cached_jobs_active_recent_idx
  on public.cached_jobs (last_seen_at desc)
  where inactive_at is null;

-- Provider-side post date for "newest postings" sort.
create index if not exists cached_jobs_posted_at_idx
  on public.cached_jobs (posted_at desc);

-- Skill / tag faceting — GIN supports `WHERE skills @> ARRAY['python']`.
create index if not exists cached_jobs_skills_gin_idx
  on public.cached_jobs using gin (skills);

create index if not exists cached_jobs_tags_gin_idx
  on public.cached_jobs using gin (tags);

-- Company filter / typeahead.
create index if not exists cached_jobs_company_idx
  on public.cached_jobs (lower(company));

-- The sweep pass runs `UPDATE ... WHERE inactive_at IS NULL AND last_seen_at < $run_start`
-- on every cron tick. A partial index keeps the dead row count out of the scan.
create index if not exists cached_jobs_sweep_idx
  on public.cached_jobs (last_seen_at)
  where inactive_at is null;

-- Row-level security: anyone (anon + authenticated) can read; only the
-- service role (bypasses RLS) can write. The Discover page reads via the
-- anon key from the browser; the cron writes with the service-role key.
alter table public.cached_jobs enable row level security;

drop policy if exists cached_jobs_public_read on public.cached_jobs;
create policy cached_jobs_public_read
  on public.cached_jobs
  for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policies — that means anon and authenticated
-- callers cannot mutate the table at all. The service-role key bypasses
-- RLS entirely, so the orchestrator continues to work.

-- Force PostgREST to reload its schema cache so the new table is visible
-- to REST clients immediately.
notify pgrst, 'reload schema';
