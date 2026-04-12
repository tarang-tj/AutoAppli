-- Automation rules
create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default '',
  trigger text not null default 'manual' check (trigger in ('application_sent', 'interview_scheduled', 'no_response_days', 'offer_received', 'manual')),
  action text not null default 'move_to_status' check (action in ('move_to_status', 'add_reminder', 'add_tag')),
  action_config jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.automation_rules enable row level security;

create policy "Users manage own automation rules" on public.automation_rules
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
