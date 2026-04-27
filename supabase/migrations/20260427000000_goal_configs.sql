-- 20260427000000_goal_configs.sql
--
-- Weekly goal configuration per user. Migrated from localStorage
-- (autoappli_goals_v1) so goal settings follow the user across devices.
--
-- One row per user (user_id is the primary key).
-- weekly_target: how many applications the user wants to submit per week.
-- start_date: the Monday the user began tracking (used for streak calc).

create table if not exists public.goal_configs (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  weekly_target int not null default 10 check (weekly_target > 0 and weekly_target <= 200),
  start_date    date not null,
  updated_at    timestamptz not null default now()
);

alter table public.goal_configs enable row level security;

create policy "goal_configs_select_own" on public.goal_configs
  for select using (auth.uid() = user_id);
create policy "goal_configs_insert_own" on public.goal_configs
  for insert with check (auth.uid() = user_id);
create policy "goal_configs_update_own" on public.goal_configs
  for update using (auth.uid() = user_id);
create policy "goal_configs_delete_own" on public.goal_configs
  for delete using (auth.uid() = user_id);

create or replace function public.goal_configs_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists goal_configs_updated_at on public.goal_configs;
create trigger goal_configs_updated_at
  before update on public.goal_configs
  for each row
  execute function public.goal_configs_set_updated_at();

comment on table public.goal_configs is
  'Per-user weekly application target. Migrated from localStorage autoappli_goals_v1.';

notify pgrst, 'reload schema';
