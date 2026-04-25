-- 20260425120000_stories.sql
--
-- STAR-format story library. Students write stories once and reuse them
-- across every interview. Migrated from localStorage (autoappli_stories_v1)
-- so the library follows the user across devices.
--
-- `tags` is a text[] column (subset of the 10 allowed StoryTag values).
-- Validation of tag values is left to the application layer; the DB stores
-- them as plain text to allow future tag additions without migrations.

create table if not exists public.stories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  tags        text[] not null default '{}',
  situation   text not null default '',
  task        text not null default '',
  action      text not null default '',
  result      text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_stories_user_id
  on public.stories (user_id);

alter table public.stories enable row level security;

create policy "stories_select_own" on public.stories
  for select using (auth.uid() = user_id);
create policy "stories_insert_own" on public.stories
  for insert with check (auth.uid() = user_id);
create policy "stories_update_own" on public.stories
  for update using (auth.uid() = user_id);
create policy "stories_delete_own" on public.stories
  for delete using (auth.uid() = user_id);

create or replace function public.stories_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists stories_updated_at on public.stories;
create trigger stories_updated_at
  before update on public.stories
  for each row
  execute function public.stories_set_updated_at();

comment on table public.stories is
  'STAR-format interview stories. Migrated from localStorage autoappli_stories_v1.';
comment on column public.stories.tags is
  'Array of StoryTag values (leadership, conflict, technical, …). Validated at app layer.';

notify pgrst, 'reload schema';
