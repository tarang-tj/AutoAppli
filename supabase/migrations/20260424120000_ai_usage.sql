-- AI usage log + rate-limit RPC
-- Level-up Phase B1: close the unauth'd AI credit hole

create table if not exists ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route text not null,
  model text,
  input_tokens int,
  output_tokens int,
  duration_ms int,
  status int
);

create index if not exists ai_usage_log_user_time_idx
  on ai_usage_log (user_id, created_at desc);

create index if not exists ai_usage_log_route_user_time_idx
  on ai_usage_log (route, user_id, created_at desc);

alter table ai_usage_log enable row level security;

drop policy if exists ai_usage_log_select_own on ai_usage_log;
create policy ai_usage_log_select_own
  on ai_usage_log for select
  using (user_id = auth.uid());

-- No insert policy — only service-role writes (through backend / API route).

create or replace function ai_rate_limit_check(
  p_user_id uuid,
  p_route text,
  p_max int,
  p_window_min int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
    from ai_usage_log
    where user_id = p_user_id
      and route = p_route
      and created_at > now() - (p_window_min || ' minutes')::interval;
  return v_count < p_max;
end;
$$;

grant execute on function ai_rate_limit_check(uuid, text, int, int) to anon, authenticated;

-- Global (cross-route) daily cap
create or replace function ai_rate_limit_global(
  p_user_id uuid,
  p_max int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
    from ai_usage_log
    where user_id = p_user_id
      and created_at > now() - interval '1 day';
  return v_count < p_max;
end;
$$;

grant execute on function ai_rate_limit_global(uuid, int) to anon, authenticated;
