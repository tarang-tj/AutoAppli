-- Level-up Phase A4 — indexes for the hot query paths we've accumulated.
--
-- These address the slow scans we know about today from the dashboard,
-- discover rail, search history, timeline, and outreach inbox. Every
-- one of them is a composite index covering the (user_id, sort-key)
-- access pattern — the partial predicates keep the row counts down on
-- tables we sweep by status.

-- Dashboard Kanban / board sort — filter by user and status, newest first.
create index if not exists jobs_user_status_created_idx
  on public.jobs (user_id, status, created_at desc)
  where archived_at is null;

-- "Any job, newest first" — bulk exports, recent activity digest.
create index if not exists jobs_user_created_idx
  on public.jobs (user_id, created_at desc);

-- Search history sidebar — per user, most recent searches.
create index if not exists job_searches_user_time_idx
  on public.job_searches (user_id, created_at desc);

-- Timeline per-job scrolling view.
create index if not exists timeline_events_job_created_idx
  on public.timeline_events (job_id, created_at desc);

-- Outreach inbox — per user, newest first.
create index if not exists outreach_messages_user_created_idx
  on public.outreach_messages (user_id, created_at desc);

-- Contacts — typeahead by email / name.
create index if not exists contacts_user_name_idx
  on public.contacts (user_id, lower(name));
create index if not exists contacts_user_email_idx
  on public.contacts (user_id, lower(email));

-- Interview notes per job.
create index if not exists interview_notes_user_created_idx
  on public.interview_notes (user_id, created_at desc);

-- Salary comps per user + entry date.
create index if not exists salary_comps_user_entry_idx
  on public.salary_comps (user_id, entry_at desc);
