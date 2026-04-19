-- 20260418140000_jobs_user_id_nullable.sql
--
-- Fix the ingestion upsert failure surfaced by the smoke-test:
--
--   HTTP 400: {"code":"23502","message":"null value in column \"user_id\"
--   of relation \"jobs\" violates not-null constraint"}
--
-- Background
-- ----------
-- The `jobs` table was originally designed as a user-owned table: each row
-- represented a job that an authenticated user had saved to their kanban
-- board. That made `user_id` NOT NULL with an RLS policy of
-- `auth.uid() = user_id`.
--
-- The new ingestion pipeline (backend/scripts/ingest.py, nightly via GitHub
-- Actions) writes *publicly-sourced* postings from ATS providers (Ashby,
-- Greenhouse, Lever). These rows are not owned by any specific user — they
-- represent a shared pool of openings that we later match against users'
-- profiles.
--
-- To support both shapes in the same table, `user_id` must be nullable:
--   - NULL  → publicly-ingested posting (visible to anyone, read-only)
--   - UUID  → user-saved job (kanban, RLS-scoped to owner)
--
-- RLS policies that reference `user_id` continue to work because
-- `auth.uid() = user_id` returns NULL (treated as false) for ingested rows
-- under anon/authenticated JWTs. The ingest itself uses the service_role
-- key, which bypasses RLS entirely.

alter table public.jobs alter column user_id drop not null;

-- Reload PostgREST's schema cache so the column definition is visible
-- immediately.
notify pgrst, 'reload schema';
