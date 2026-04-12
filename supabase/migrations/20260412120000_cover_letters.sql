-- Phase 13: Cover letters table
create table if not exists public.cover_letters (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_title text not null default '',
  company text not null default '',
  content text not null default '',
  tone text not null default 'professional',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.cover_letters enable row level security;

create policy "Users can manage own cover letters"
  on public.cover_letters
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index
create index if not exists idx_cover_letters_user on public.cover_letters(user_id);
