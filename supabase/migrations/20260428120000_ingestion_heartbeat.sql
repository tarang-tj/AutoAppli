-- 20260428120000_ingestion_heartbeat.sql
--
-- Ingestion cron observability — single-row heartbeat table.
--
-- Why not derive freshness purely from cached_jobs.last_seen_at?
--   MAX(last_seen_at) can't distinguish "cron ran but found nothing new"
--   from "cron didn't run at all". A dedicated heartbeat row captures
--   the cron's intent regardless of whether it upserted any job rows.
--
-- There is exactly ONE row in this table (id = 'singleton').
-- The cron upserts it at the end of every non-dry-run.

create table if not exists public.ingestion_heartbeat (
  id           text primary key default 'singleton',
  last_run_at  timestamptz not null
);

-- Seed the single row with a sentinel far in the past so the health
-- endpoint can return a meaningful "never ran" state immediately after
-- a fresh deploy without the row being absent.
insert into public.ingestion_heartbeat (id, last_run_at)
values ('singleton', '2000-01-01T00:00:00Z')
on conflict (id) do nothing;

-- Row-level security: authenticated users (and service role) may read;
-- only the service role (bypasses RLS) may write.
alter table public.ingestion_heartbeat enable row level security;

drop policy if exists ingestion_heartbeat_read on public.ingestion_heartbeat;
create policy ingestion_heartbeat_read
  on public.ingestion_heartbeat
  for select
  to anon, authenticated
  using (true);

notify pgrst, 'reload schema';
