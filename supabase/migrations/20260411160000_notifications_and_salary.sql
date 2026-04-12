-- Phase 6 & 7: Notifications/Reminders + Salary/Compensation tracking

-- ── Reminders ────────────────────────────────────────────────────

create table if not exists reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  job_id      uuid references jobs(id) on delete set null,
  reminder_type text not null default 'custom'
    check (reminder_type in ('interview_upcoming','follow_up_application','follow_up_interview','offer_deadline','custom')),
  title       text not null default '',
  message     text not null default '',
  due_at      timestamptz,
  is_read     boolean not null default false,
  is_dismissed boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table reminders enable row level security;

create policy "Users manage own reminders"
  on reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_reminders_user on reminders(user_id, is_dismissed);

-- ── Compensation ─────────────────────────────────────────────────

create table if not exists compensations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  job_id          uuid references jobs(id) on delete set null,
  base_salary     numeric(12,2) not null default 0,
  bonus           numeric(12,2) not null default 0,
  equity_value    numeric(12,2) not null default 0,
  signing_bonus   numeric(12,2) not null default 0,
  benefits_value  numeric(12,2) not null default 0,
  total_compensation numeric(12,2) not null default 0,
  currency        text not null default 'USD',
  pay_period      text not null default 'annual'
    check (pay_period in ('annual','monthly','hourly')),
  notes           text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table compensations enable row level security;

create policy "Users manage own compensations"
  on compensations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_compensations_user_job on compensations(user_id, job_id);
