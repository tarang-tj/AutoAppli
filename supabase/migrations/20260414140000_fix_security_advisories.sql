-- Fix interview_notes: drop insecure anon policies, add proper user-scoped policy
drop policy if exists "anon_delete_interviews" on public.interview_notes;
drop policy if exists "anon_insert_interviews" on public.interview_notes;
drop policy if exists "anon_update_interviews" on public.interview_notes;
drop policy if exists "anon_select_interviews" on public.interview_notes;

drop policy if exists "Users manage own interviews" on public.interview_notes;
create policy "Users manage own interviews" on public.interview_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fix function search_path for handle_new_user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Fix function search_path for jobs_set_updated_at
create or replace function public.jobs_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- Fix function search_path for update_interview_notes_updated_at
create or replace function public.update_interview_notes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;
