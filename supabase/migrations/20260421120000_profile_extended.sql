-- Sprint 8 — extend public.profiles to match the frontend UserProfile shape.
--
-- The base profiles table (20260407190000) only has display_name, headline,
-- linkedin_url. The frontend has long carried an extended shape (phone,
-- location, portfolio_url, bio, remote_preference) and the backend's
-- ProfilePatch quietly drops any column the table doesn't know about — which
-- silently ate every extended-shape PATCH from real users.
--
-- This migration adds those columns so that:
--   1. Supabase-direct PATCH /profile from the browser actually persists.
--   2. The Sprint 6 recommendations rail can read remote_preference for the
--      remote-fit bonus instead of always scoring without it.
--
-- All columns are nullable / default empty so existing rows keep working.

alter table public.profiles
  add column if not exists phone           text,
  add column if not exists location        text,
  add column if not exists portfolio_url   text,
  add column if not exists bio             text,
  add column if not exists remote_preference text;

-- Constrain remote_preference to the same enum the frontend ships.
-- Done as a separate statement (not a CHECK on add column) so re-running
-- the migration on a DB that already has the column doesn't fail.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
     where table_schema = 'public'
       and table_name = 'profiles'
       and constraint_name = 'profiles_remote_preference_check'
  ) then
    alter table public.profiles
      add constraint profiles_remote_preference_check
      check (
        remote_preference is null
        or remote_preference in ('remote', 'hybrid', 'onsite')
      );
  end if;
end$$;
