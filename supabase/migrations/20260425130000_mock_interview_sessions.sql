-- 20260425130000_mock_interview_sessions.sql
--
-- Persisted mock interview sessions. Migrated from in-memory dict so sessions
-- survive uvicorn restarts and users can review their interview history.
--
-- `turns` stores a JSON array of {question, answer, feedback} objects.
-- `scorecard` stores the EndResponse JSON (null until /end is called).

create table if not exists public.mock_interview_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  job_description  text not null,
  role             text not null,
  num_questions    int  not null,
  question_index   int  not null default 0,
  complete         bool not null default false,
  turns            jsonb not null default '[]',
  scorecard        jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_mock_interview_sessions_user_created
  on public.mock_interview_sessions (user_id, created_at desc);

alter table public.mock_interview_sessions enable row level security;

create policy "mock_interview_sessions_select_own" on public.mock_interview_sessions
  for select using (auth.uid() = user_id);
create policy "mock_interview_sessions_insert_own" on public.mock_interview_sessions
  for insert with check (auth.uid() = user_id);
create policy "mock_interview_sessions_update_own" on public.mock_interview_sessions
  for update using (auth.uid() = user_id);
create policy "mock_interview_sessions_delete_own" on public.mock_interview_sessions
  for delete using (auth.uid() = user_id);

create or replace function public.mock_interview_sessions_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mock_interview_sessions_updated_at on public.mock_interview_sessions;
create trigger mock_interview_sessions_updated_at
  before update on public.mock_interview_sessions
  for each row
  execute function public.mock_interview_sessions_set_updated_at();

comment on table public.mock_interview_sessions is
  'AI mock interview sessions. Migrated from in-memory dict to allow history and multi-device access.';
comment on column public.mock_interview_sessions.turns is
  'JSON array of {question, answer, feedback} turn records.';
comment on column public.mock_interview_sessions.scorecard is
  'EndResponse JSON from Claude scorecard generation. Null until /end is called.';

notify pgrst, 'reload schema';
