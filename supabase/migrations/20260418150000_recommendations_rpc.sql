-- 20260418150000_recommendations_rpc.sql
--
-- Option B for ingested-job visibility: keep `user_id IS NULL` rows invisible
-- to regular client queries (existing RLS policies already enforce this),
-- and expose them only through two narrow SECURITY DEFINER functions:
--
--   list_public_jobs(limit, offset)  — enumerate candidates for client-side
--                                      scoring (computeDemoMatchScore).
--   save_recommended_job(job_id)     — atomically copy a candidate into the
--                                      caller's own kanban (user_id set to
--                                      auth.uid(), source='manual').
--
-- Why functions and not a permissive SELECT policy: keeps the exposure
-- explicit. Only code that calls list_public_jobs() sees the ingested pool;
-- a stray `select * from jobs` elsewhere in the codebase never picks up
-- ingested rows by accident.

-- -----------------------------------------------------------------
-- 1) list_public_jobs — paginated candidate enumeration
-- -----------------------------------------------------------------
create or replace function public.list_public_jobs(
  p_limit  integer default 50,
  p_offset integer default 0
)
returns table (
  id          uuid,
  title       text,
  company     text,
  url         text,
  description text,
  location    text,
  remote_type text,
  salary_min  integer,
  salary_max  integer,
  skills      text[],
  tags        text[],
  source      text,
  external_id text,
  posted_at   timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Anon users get nothing (matches the general "authenticated-only" posture).
  if auth.uid() is null then
    raise exception 'must be authenticated' using errcode = '42501';
  end if;

  return query
    select j.id, j.title, j.company, j.url, j.description,
           j.location, j.remote_type, j.salary_min, j.salary_max,
           j.skills, j.tags, j.source, j.external_id, j.posted_at
      from public.jobs j
     where j.user_id is null
       and j.title is not null
     order by j.posted_at desc nulls last
     limit  greatest(1, least(200, p_limit))
    offset  greatest(0, p_offset);
end;
$$;

revoke all on function public.list_public_jobs(integer, integer) from public;
grant execute on function public.list_public_jobs(integer, integer) to authenticated;

-- -----------------------------------------------------------------
-- 2) save_recommended_job — atomic copy into caller's kanban
-- -----------------------------------------------------------------
-- Dedup note: the (source, external_id) unique index would collide if we
-- copied the row verbatim (both the ingested row and the user's copy would
-- have the same pair). We set source='manual' and external_id=null on the
-- saved copy; Postgres treats NULLs as distinct so multiple users can save
-- the same ingested job without conflict.
--
-- Clients can't fabricate arbitrary job data via this function — every
-- column is read from the source row inside the DB.

create or replace function public.save_recommended_job(p_job_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_new_id  uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'must be authenticated' using errcode = '42501';
  end if;

  insert into public.jobs (
    user_id, title, company, url, description, location, remote_type,
    salary_min, salary_max, skills, tags, source, external_id,
    posted_at, status
  )
  select
    v_user_id,
    j.title,
    j.company,
    j.url,
    j.description,
    j.location,
    coalesce(j.remote_type, 'unknown'),
    j.salary_min,
    j.salary_max,
    coalesce(j.skills, '{}'),
    coalesce(j.tags, '{}'),
    'manual',     -- saved copies are user-owned; reset source + external_id
    null,         -- to avoid (source, external_id) unique-index collision
    j.posted_at,
    'bookmarked'
  from public.jobs j
  where j.id = p_job_id
    and j.user_id is null          -- only public/ingested rows are claimable
  returning id into v_new_id;

  if v_new_id is null then
    raise exception 'recommended job not found' using errcode = 'P0002';
  end if;

  return v_new_id;
end;
$$;

revoke all on function public.save_recommended_job(uuid) from public;
grant execute on function public.save_recommended_job(uuid) to authenticated;

-- Reload PostgREST so the RPCs show up under /rest/v1/rpc/... immediately.
notify pgrst, 'reload schema';
