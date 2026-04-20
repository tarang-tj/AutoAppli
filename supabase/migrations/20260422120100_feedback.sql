-- Pre-Sprint-9 instrumentation — user feedback.
--
-- A one-click "send feedback" widget in the sidebar drops into this table.
-- Free-form message + optional category (bug/idea/confused/other). Authed
-- users get their user_id stamped; anon visitors can submit too (the landing
-- page widget cares). Only service role can SELECT — keeps PII isolated from
-- other testers.

create table if not exists public.feedback (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete set null,
  route       text        not null,
  category    text        not null default 'other'
                check (category in ('bug', 'idea', 'confused', 'other')),
  message     text        not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);
create index if not exists feedback_category_idx
  on public.feedback (category, created_at desc);

alter table public.feedback enable row level security;

-- Authed users can submit their own feedback.
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'feedback'
       and policyname = 'feedback_insert_authed'
  ) then
    create policy feedback_insert_authed
      on public.feedback
      for insert
      to authenticated
      with check (user_id is null or user_id = auth.uid());
  end if;
end$$;

-- Anon visitors can submit too, but must leave user_id null.
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'feedback'
       and policyname = 'feedback_insert_anon'
  ) then
    create policy feedback_insert_anon
      on public.feedback
      for insert
      to anon
      with check (user_id is null);
  end if;
end$$;
