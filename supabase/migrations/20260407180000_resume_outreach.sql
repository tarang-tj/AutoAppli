-- Base resume uploads (parsed text) and generated outreach drafts per user.
-- API uses service role + user_id filter; RLS for direct client access.

create table if not exists public.user_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  parsed_text text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_resumes_user_created_idx
  on public.user_resumes (user_id, created_at);

create index if not exists user_resumes_user_id_idx on public.user_resumes (user_id);

alter table public.user_resumes enable row level security;

create policy "user_resumes_select_own" on public.user_resumes
  for select using (auth.uid() = user_id);

create policy "user_resumes_insert_own" on public.user_resumes
  for insert with check (auth.uid() = user_id);

create policy "user_resumes_update_own" on public.user_resumes
  for update using (auth.uid() = user_id);

create policy "user_resumes_delete_own" on public.user_resumes
  for delete using (auth.uid() = user_id);

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message_type text not null
    check (message_type in ('email', 'linkedin')),
  recipient_name text not null default '',
  recipient_role text,
  subject text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists outreach_messages_user_created_idx
  on public.outreach_messages (user_id, created_at desc);

alter table public.outreach_messages enable row level security;

create policy "outreach_messages_select_own" on public.outreach_messages
  for select using (auth.uid() = user_id);

create policy "outreach_messages_insert_own" on public.outreach_messages
  for insert with check (auth.uid() = user_id);

create policy "outreach_messages_update_own" on public.outreach_messages
  for update using (auth.uid() = user_id);

create policy "outreach_messages_delete_own" on public.outreach_messages
  for delete using (auth.uid() = user_id);
