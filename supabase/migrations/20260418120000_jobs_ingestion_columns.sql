-- 20260418120000_jobs_ingestion_columns.sql
--
-- Align the `jobs` table schema with what backend/app/services/ingestion emits
-- in NormalizedJob.to_row(). The first ingestion smoke-test (Ashby/ramp)
-- failed with:
--   PGRST204 — Could not find the 'posted_at' column of 'jobs' in the schema cache
--
-- PostgREST only reports the first missing column, so this migration defensively
-- adds every column the ingestion layer emits with IF NOT EXISTS. If a column
-- already exists (rich-job-fields migration, earlier ad-hoc work, etc.), the
-- statement is a no-op.
--
-- Also ensures the (source, external_id) unique constraint exists so the
-- ingest script's `?on_conflict=source,external_id` upsert lands as a merge
-- rather than a duplicate insert.

-- Core identity from external ATS provider (Greenhouse, Lever, Ashby, …)
alter table public.jobs add column if not exists source        text;
alter table public.jobs add column if not exists external_id   text;

-- Human-readable job attributes
alter table public.jobs add column if not exists title         text;
alter table public.jobs add column if not exists company       text;
alter table public.jobs add column if not exists url           text;
alter table public.jobs add column if not exists description   text;

-- Location + remote attributes
alter table public.jobs add column if not exists location      text;
alter table public.jobs add column if not exists remote_type   text;

-- Compensation
alter table public.jobs add column if not exists salary_min    integer;
alter table public.jobs add column if not exists salary_max    integer;

-- Structured attributes extracted by NormalizedJob
alter table public.jobs add column if not exists skills        text[] default '{}'::text[];
alter table public.jobs add column if not exists tags          text[] default '{}'::text[];

-- Provider timestamp — this is the column the failing smoke test flagged.
alter table public.jobs add column if not exists posted_at     timestamptz;

-- Supabase upsert uses `?on_conflict=source,external_id`, which requires a
-- unique index on that column pair. Create it only if missing.
do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public'
       and tablename  = 'jobs'
       and indexname  = 'jobs_source_external_id_key'
  ) then
    create unique index jobs_source_external_id_key
      on public.jobs (source, external_id)
      where source is not null and external_id is not null;
  end if;
end$$;

-- Index for "what's new" queries.
create index if not exists jobs_posted_at_idx on public.jobs (posted_at desc);

-- Force PostgREST to reload its schema cache so the new columns are visible
-- to REST clients immediately. Without this, the next upsert call could still
-- see the PGRST204 error for up to a minute.
notify pgrst, 'reload schema';
