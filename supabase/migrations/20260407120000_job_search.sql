-- Job search: shared listing cache + per-user search runs and result links.
-- API uses service role; RLS restricts user-scoped tables to own rows.

-- Canonical listings (deduped by URL) for analytics, reuse, and history joins.
create table if not exists public.job_listings (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  title text not null,
  company text not null,
  location text,
  snippet text,
  posted_date text,
  salary text,
  source text not null default 'unknown',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint job_listings_url_unique unique (url)
);

create index if not exists job_listings_last_seen_idx on public.job_listings (last_seen_at desc);
create index if not exists job_listings_source_idx on public.job_listings (source);

-- One row each time a user runs a search (parameters + result count).
create table if not exists public.job_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  location text not null default '',
  remote_only boolean not null default false,
  page int not null default 1,
  per_page int not null default 20,
  result_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists job_searches_user_created_idx
  on public.job_searches (user_id, created_at desc);

-- Ordered results for a search run (links to cached listings).
create table if not exists public.job_search_result_items (
  search_id uuid not null references public.job_searches (id) on delete cascade,
  listing_id uuid not null references public.job_listings (id) on delete cascade,
  sort_order int not null,
  primary key (search_id, listing_id)
);

create index if not exists job_search_result_items_search_sort_idx
  on public.job_search_result_items (search_id, sort_order);

alter table public.job_listings enable row level security;
alter table public.job_searches enable row level security;
alter table public.job_search_result_items enable row level security;

-- Listings: no policies — only backend (service role) reads/writes.

create policy "job_searches_select_own" on public.job_searches
  for select using (auth.uid() = user_id);

create policy "job_searches_insert_own" on public.job_searches
  for insert with check (auth.uid() = user_id);

create policy "job_search_result_items_select_own" on public.job_search_result_items
  for select using (
    exists (
      select 1 from public.job_searches s
      where s.id = job_search_result_items.search_id
        and s.user_id = auth.uid()
    )
  );

create policy "job_search_result_items_insert_own" on public.job_search_result_items
  for insert with check (
    exists (
      select 1 from public.job_searches s
      where s.id = job_search_result_items.search_id
        and s.user_id = auth.uid()
    )
  );
