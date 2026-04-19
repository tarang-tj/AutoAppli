-- 20260419130000_jobs_outcome_tracking.sql
--
-- Add structured close-out tracking to jobs:
--   • closed_at      — when the application reached a terminal state
--   • closed_reason  — *why* it ended (rejected_by_company, withdrew, ...)
--   • archived       — soft-hide from the active kanban without deleting
--
-- Together these unlock accurate ghost-rate / rejection-rate analytics
-- and give users a way to clear closed roles from the board while
-- keeping the history for the analytics page.
--
-- Migration is additive only — existing rows get defaults (archived=false,
-- closed_at/closed_reason=NULL) and no application code has to change on
-- deploy. Client code can progressively start filling the new fields.

alter table public.jobs
  add column if not exists closed_at      timestamptz,
  add column if not exists closed_reason  text
    check (closed_reason in (
      'rejected_by_company',
      'withdrew',
      'no_response',
      'offer_accepted',
      'offer_declined',
      'role_closed'
    )),
  add column if not exists archived       boolean not null default false;

create index if not exists idx_jobs_closed_at on public.jobs (closed_at);
create index if not exists idx_jobs_archived  on public.jobs (archived);

comment on column public.jobs.closed_at is
  'Timestamp when the application reached a terminal state.';
comment on column public.jobs.closed_reason is
  'Why the application ended: rejected_by_company | withdrew | no_response | offer_accepted | offer_declined | role_closed.';
comment on column public.jobs.archived is
  'When true, hide from the default kanban view without deleting the row.';

notify pgrst, 'reload schema';
