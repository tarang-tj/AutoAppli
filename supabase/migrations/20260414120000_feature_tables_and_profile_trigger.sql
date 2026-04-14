-- Auto-create profile row when a new user signs up via Google OAuth or email
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Cover letters table
create table if not exists public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_title text not null default '',
  company text not null default '',
  tone text not null default 'professional',
  content text not null default '',
  job_description text not null default '',
  resume_text text not null default '',
  instructions text not null default '',
  created_at timestamptz not null default now()
);
alter table public.cover_letters enable row level security;
drop policy if exists "Users manage own cover letters" on public.cover_letters;
create policy "Users manage own cover letters" on public.cover_letters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reminders table
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  reminder_type text not null default 'custom',
  title text not null default '',
  body text not null default '',
  due_at timestamptz,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.reminders enable row level security;
drop policy if exists "Users manage own reminders" on public.reminders;
create policy "Users manage own reminders" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CRM contacts table
create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  name text not null default '',
  role text not null default '',
  company text not null default '',
  email text not null default '',
  phone text not null default '',
  linkedin_url text not null default '',
  relationship text not null default 'recruiter',
  notes text not null default '',
  last_contacted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.crm_contacts enable row level security;
drop policy if exists "Users manage own contacts" on public.crm_contacts;
create policy "Users manage own contacts" on public.crm_contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Timeline events table
create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  event_type text not null default 'note',
  title text not null default '',
  description text not null default '',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.timeline_events enable row level security;
drop policy if exists "Users manage own timeline" on public.timeline_events;
create policy "Users manage own timeline" on public.timeline_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Compensations table
create table if not exists public.compensations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  company text not null default '',
  role text not null default '',
  base_salary numeric,
  bonus numeric,
  equity text not null default '',
  benefits text not null default '',
  currency text not null default 'USD',
  notes text not null default '',
  created_at timestamptz not null default now()
);
alter table public.compensations enable row level security;
drop policy if exists "Users manage own compensations" on public.compensations;
create policy "Users manage own compensations" on public.compensations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Doc templates table
create table if not exists public.doc_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  category text not null default 'general',
  content text not null default '',
  variables jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.doc_templates enable row level security;
drop policy if exists "Users manage own templates" on public.doc_templates;
create policy "Users manage own templates" on public.doc_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Automation rules table
create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  trigger_type text not null default 'manual',
  trigger_config jsonb not null default '{}',
  action_type text not null default 'send_reminder',
  action_config jsonb not null default '{}',
  is_active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.automation_rules enable row level security;
drop policy if exists "Users manage own automations" on public.automation_rules;
create policy "Users manage own automations" on public.automation_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Add missing columns to outreach_messages
alter table public.outreach_messages add column if not exists message_purpose text not null default 'outreach';
alter table public.outreach_messages add column if not exists job_title text not null default '';
alter table public.outreach_messages add column if not exists company text not null default '';
alter table public.outreach_messages add column if not exists job_description text not null default '';
