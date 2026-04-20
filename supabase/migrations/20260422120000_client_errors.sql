-- Pre-Sprint-9 instrumentation — client error log.
--
-- Captures unhandled exceptions and apiGet/apiPatch/apiPost failures from the
-- browser so we can see what real users hit during testing without standing
-- up Sentry/Datadog. Anyone can INSERT (anon visitors error out too), but
-- only the service role can SELECT — testers shouldn't be able to read each
-- other's stack traces. Inspect via the Supabase dashboard's Table Editor.
--
-- Lifetime: ephemeral. A future migration will add a TTL/cleanup cron once
-- we know the noise floor; for now we keep everything.

create table if not exists public.client_errors (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete set null,
  route       text        not null,
  message     text        not null,
  stack       text,
  user_agent  text,
  -- Free-form key/value bag for route-specific context (e.g. job_id, resume_id).
  context     jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists client_errors_created_at_idx
  on public.client_errors (created_at desc);
create index if not exists client_errors_user_id_idx
  on public.client_errors (user_id) where user_id is not null;

alter table public.client_errors enable row level security;

-- Authed users can log their own errors.
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'client_errors'
       and policyname = 'client_errors_insert_authed'
  ) then
    create policy client_errors_insert_authed
      on public.client_errors
      for insert
      to authenticated
      with check (user_id is null or user_id = auth.uid());
  end if;
end$$;

-- Anon visitors can log too (signed-out errors are still useful), but the
-- user_id MUST be null — we never want a forged auth.uid() landing here.
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'client_errors'
       and policyname = 'client_errors_insert_anon'
  ) then
    create policy client_errors_insert_anon
      on public.client_errors
      for insert
      to anon
      with check (user_id is null);
  end if;
end$$;

-- No SELECT policy — only the service role (Supabase dashboard) can read.
