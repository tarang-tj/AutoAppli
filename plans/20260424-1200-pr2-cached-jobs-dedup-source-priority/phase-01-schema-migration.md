# Phase 01 — Schema migration (shadow-write only)

**Status:** Done
**Scope:** Phase A of the rollout.

## Goal

Add the shadow-write columns to `cached_jobs` and create the `cached_jobs_sightings` audit table. **No UNIQUE constraint on `posting_key`** — PR 4 adds that. **No behavioral change** from this migration alone; Phase 02 wires the writes.

## Out of scope (deferred)

- Backfill of `posting_key` on existing rows — PR 3.
- Merge / collapse logic — PR 3.
- `UNIQUE(posting_key)` — PR 4.

## Files

**New:** `supabase/migrations/20260424160000_cached_jobs_dedup.sql`

Comes after PR 1's `20260424140000_normalization_columns.sql`. No SQL collision.

## What it does

- `cached_jobs`: adds nullable `posting_key text`, `winning_source text`, `source_contribution jsonb default '{}'::jsonb`. Indexed (non-unique) on `posting_key`.
- `cached_jobs_sightings` (new): PK `(source, external_id)`, columns `posting_key`, `url`, `raw_hash`, `first_seen_at` default now, `last_seen_at` default now. Indexed on `posting_key`. RLS public-read, service-role write (parity with `cached_jobs`).
- `notify pgrst, 'reload schema'` so PostgREST sees new columns immediately.

## Success criteria

- [x] Migration applies cleanly against a fresh dev DB.
- [x] Columns + table + indexes exist.
- [x] Existing reads against `cached_jobs` unchanged (additive).

## Rollback

```sql
drop table if exists public.cached_jobs_sightings;
alter table public.cached_jobs
  drop column if exists posting_key,
  drop column if exists winning_source,
  drop column if exists source_contribution;
drop index if exists public.cached_jobs_posting_key_idx;
notify pgrst, 'reload schema';
```
