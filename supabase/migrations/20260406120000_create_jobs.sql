-- Jobs persisted per user for Kanban (API uses service role + user_id filter; RLS for direct client access).

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  title text not null,
  url text,
  description text,
  status text not null default 'bookmarked'
    check (status in (
      'bookmarked', 'applied', 'interviewing', 'offer', 'rejected', 'ghosted'
    )),
  source text not null default 'manual',
  sort_order integer not null default 0,
  notes text,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_user_status_sort_idx
  on public.jobs (user_id, status, sort_order);

create index if not exists jobs_user_id_idx on public.jobs (user_id);

alter table public.jobs enable row level security;

create policy "jobs_select_own" on public.jobs
  for select using (auth.uid() = user_id);

create policy "jobs_insert_own" on public.jobs
  for insert with check (auth.uid() = user_id);

create policy "jobs_update_own" on public.jobs
  for update using (auth.uid() = user_id);

create policy "jobs_delete_own" on public.jobs
  for delete using (auth.uid() = user_id);

create or replace function public.jobs_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_updated_at on public.jobs;
create trigger jobs_updated_at
  before update on public.jobs
  for each row
  execute function public.jobs_set_updated_at();
