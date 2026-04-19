-- 20260418130000_jobs_unique_index_full.sql
--
-- Fix the ON CONFLICT failure surfaced by the ingestion smoke-test:
--
--   HTTP 400: {"code":"42P10","message":"there is no unique or exclusion
--   constraint matching the ON CONFLICT specification"}
--
-- The previous migration (20260418120000_jobs_ingestion_columns.sql) created
-- `jobs_source_external_id_key` as a PARTIAL unique index:
--
--     create unique index jobs_source_external_id_key
--       on public.jobs (source, external_id)
--       where source is not null and external_id is not null;
--
-- PostgreSQL only uses a partial index to satisfy `INSERT ... ON CONFLICT`
-- when the INSERT specifies a matching arbiter predicate, which PostgREST
-- does not emit for `?on_conflict=source,external_id`. That causes 42P10.
--
-- Replacing it with a NON-partial unique index. Unique constraints in Postgres
-- treat NULLs as distinct by default, so this is still safe against legacy
-- rows that may have NULL source/external_id.

drop index if exists public.jobs_source_external_id_key;

create unique index jobs_source_external_id_key
  on public.jobs (source, external_id);

-- Reload PostgREST's schema cache so the new constraint is visible to
-- `?on_conflict=...` immediately.
notify pgrst, 'reload schema';
