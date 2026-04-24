-- 20260424160000_cached_jobs_dedup.sql
--
-- PR 2 — Phase A — Jobs DB Phase C (cross-source dedup).
--
-- Adds the shadow-write schema for cross-source dedup on `cached_jobs`.
-- No behavioral change from this migration alone; the orchestrator in
-- backend/scripts/ingest_all.py starts populating posting_key and
-- cached_jobs_sightings once PR 2's Phase B code lands.
--
-- Builds on PR 1's `20260424140000_normalization_columns.sql` — the
-- normalized fields (location_city, location_region, location_country,
-- location_is_remote, company_normalized) feed into posting_key
-- computation at ingest time. PR 1 owns the normalizers; PR 2 just
-- hashes their output.
--
-- Intentionally NOT doing yet:
--   • UNIQUE(posting_key)   — PR 4 adds this after a week of shadow data
--                              and PR 3's backfill resolves any collisions.
--   • Backfill of existing rows — PR 3, single-transaction (~3.1k rows).
--   • Merge / collapse logic — PR 3.
--
-- See plans/20260424-1200-pr2-cached-jobs-dedup-source-priority/plan.md
-- and docs/level-up/adrs/0006-cached-jobs-dedup.md for the full rationale.

-- ── cached_jobs: shadow columns ─────────────────────────────────────

alter table public.cached_jobs
  add column if not exists posting_key         text,
  add column if not exists winning_source      text,
  add column if not exists source_contribution jsonb default '{}'::jsonb;

-- Lookup index for the future merge step. Non-unique intentionally —
-- PR 4 tightens to UNIQUE after backfill + a week of telemetry.
create index if not exists cached_jobs_posting_key_idx
  on public.cached_jobs (posting_key);

-- ── cached_jobs_sightings: per-source audit log ─────────────────────
--
-- Append-on-first, update-on-refresh. One row per (source, external_id).
-- PR 3 uses this for:
--   • The merge pass — "which sources contributed each field".
--   • The URL-fingerprint lookup — an aggregator forwarding the original
--     ATS URL binds to the same posting_key even when normalized fields
--     don't match exactly.

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

-- RLS parity with cached_jobs: public read, service-role writes only.
-- No insert/update/delete policies means anon + authenticated cannot
-- mutate the table at all; the orchestrator uses the service_role key
-- which bypasses RLS.
alter table public.cached_jobs_sightings enable row level security;

drop policy if exists cached_jobs_sightings_public_read on public.cached_jobs_sightings;
create policy cached_jobs_sightings_public_read
  on public.cached_jobs_sightings
  for select
  to anon, authenticated
  using (true);

-- Reload PostgREST's schema cache so the new columns and table are
-- visible to REST clients immediately (no up-to-60s cold cache gap).
notify pgrst, 'reload schema';
