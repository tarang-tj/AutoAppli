-- Search accuracy + ingestion support
-- 1. Add source / external_id columns to jobs so we can upsert from external
--    job boards (Greenhouse today; Lever / RemoteOK later) without creating
--    duplicate rows. The unique index matches PostgREST
--    `?on_conflict=source,external_id` used by backend/scripts/ingest.py.
-- 2. Add a saved_searches table so users can persist their Smart Filters
--    queries across devices. The frontend still falls back to localStorage
--    when Supabase is unavailable (demo mode).

-- ── jobs: ingestion columns ────────────────────────────────────────────────
alter table if exists public.jobs
  add column if not exists source text,
  add column if not exists external_id text;

create unique index if not exists jobs_source_external_id_key
  on public.jobs (source, external_id)
  where source is not null and external_id is not null;

create index if not exists jobs_source_idx
  on public.jobs (source)
  where source is not null;

comment on column public.jobs.source is
  'Origin of the job record: greenhouse, lever, remoteok, manual, etc. Null for user-entered rows before ingestion rollout.';
comment on column public.jobs.external_id is
  'Stable identifier from the source system (e.g. Greenhouse job id). Used with source for idempotent upserts.';

-- ── saved_searches ─────────────────────────────────────────────────────────
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists saved_searches_user_idx
  on public.saved_searches (user_id, updated_at desc);

alter table public.saved_searches enable row level security;

drop policy if exists "saved_searches: owner select" on public.saved_searches;
create policy "saved_searches: owner select"
  on public.saved_searches for select
  using (auth.uid() = user_id);

drop policy if exists "saved_searches: owner insert" on public.saved_searches;
create policy "saved_searches: owner insert"
  on public.saved_searches for insert
  with check (auth.uid() = user_id);

drop policy if exists "saved_searches: owner update" on public.saved_searches;
create policy "saved_searches: owner update"
  on public.saved_searches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "saved_searches: owner delete" on public.saved_searches;
create policy "saved_searches: owner delete"
  on public.saved_searches for delete
  using (auth.uid() = user_id);

-- Keep updated_at fresh on edits. Re-uses the same trigger function style as
-- earlier migrations (create or replace so re-runs are idempotent).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saved_searches_set_updated_at on public.saved_searches;
create trigger saved_searches_set_updated_at
  before update on public.saved_searches
  for each row execute function public.set_updated_at();

comment on table public.saved_searches is
  'Per-user saved Smart Filters queries. filters JSON mirrors SavedSearchFilters in frontend/src/lib/match/saved-searches.ts.';
