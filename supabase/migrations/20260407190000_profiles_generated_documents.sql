-- User-facing profile (for outreach sign-off, settings UI) and saved tailored resume text.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  headline text not null default '',
  linkedin_url text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);

create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  doc_type text not null default 'tailored_resume'
    check (doc_type in ('tailored_resume', 'cover_letter')),
  title text not null default '',
  resume_id text,
  job_description_excerpt text not null default '',
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists generated_documents_user_created_idx
  on public.generated_documents (user_id, created_at desc);

alter table public.generated_documents enable row level security;

create policy "generated_documents_select_own" on public.generated_documents
  for select using (auth.uid() = user_id);

create policy "generated_documents_insert_own" on public.generated_documents
  for insert with check (auth.uid() = user_id);

create policy "generated_documents_update_own" on public.generated_documents
  for update using (auth.uid() = user_id);

create policy "generated_documents_delete_own" on public.generated_documents
  for delete using (auth.uid() = user_id);
