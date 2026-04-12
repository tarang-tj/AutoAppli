-- Interview prep notes — one row per interview round per job.
create table if not exists interview_notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  job_id        uuid not null references jobs(id) on delete cascade,
  round_name    text not null default 'General',
  scheduled_at  timestamptz,
  interviewer_name text not null default '',
  notes         text not null default '',
  prep_material jsonb,
  status        text not null default 'upcoming' check (status in ('upcoming','completed','cancelled')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- RLS
alter table interview_notes enable row level security;

create policy "Users manage own interview notes"
  on interview_notes for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for quick lookups by job
create index if not exists idx_interview_notes_job on interview_notes(user_id, job_id);
