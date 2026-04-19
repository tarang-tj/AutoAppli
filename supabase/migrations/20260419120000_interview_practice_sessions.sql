-- 20260419120000_interview_practice_sessions.sql
--
-- Persist AI mock-interview transcripts so users can revisit past sessions,
-- track practice frequency over time, and feed the weekly digest.
--
-- The `messages` column stores the full chat as a JSON array of
-- {role, content, ts} entries. Snapshotting `resume_snapshot` at session
-- creation keeps historic transcripts coherent even if the user later
-- edits or re-uploads their resume.
--
-- `job_id` is nullable + ON DELETE SET NULL so deleting a job from the
-- kanban doesn't wipe the practice history attached to it. The
-- denormalized `job_title` / `company` columns preserve human-readable
-- context in that case.

create table if not exists public.interview_practice_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  job_id          uuid references public.jobs(id) on delete set null,
  job_title       text not null,
  company         text not null,
  job_description text,
  resume_snapshot text,
  messages        jsonb not null default '[]'::jsonb,
  turn_count      integer not null default 0,
  ended           boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_ips_user_created
  on public.interview_practice_sessions (user_id, created_at desc);

create index if not exists idx_ips_job
  on public.interview_practice_sessions (job_id);

alter table public.interview_practice_sessions enable row level security;

create policy "ips_select_own" on public.interview_practice_sessions
  for select using (auth.uid() = user_id);
create policy "ips_insert_own" on public.interview_practice_sessions
  for insert with check (auth.uid() = user_id);
create policy "ips_update_own" on public.interview_practice_sessions
  for update using (auth.uid() = user_id);
create policy "ips_delete_own" on public.interview_practice_sessions
  for delete using (auth.uid() = user_id);

create or replace function public.ips_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ips_updated_at on public.interview_practice_sessions;
create trigger ips_updated_at
  before update on public.interview_practice_sessions
  for each row
  execute function public.ips_set_updated_at();

comment on table public.interview_practice_sessions is
  'AI mock-interview transcripts. messages JSONB is [{role, content, ts}].';
comment on column public.interview_practice_sessions.resume_snapshot is
  'Resume parsed_text used for this session — frozen so history stays coherent if the user later edits their resume.';
comment on column public.interview_practice_sessions.ended is
  'True once the user clicked End & debrief. Distinct from "abandoned" sessions which simply stop being updated.';

notify pgrst, 'reload schema';
