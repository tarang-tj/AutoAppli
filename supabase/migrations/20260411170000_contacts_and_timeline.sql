-- Phase 8 & 9: Contacts CRM + Application Timeline

-- ── Contacts ─────────────────────────────────────────────────────

create table if not exists contacts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  job_id          uuid references jobs(id) on delete set null,
  name            text not null,
  role            text not null default '',
  company         text not null default '',
  email           text not null default '',
  phone           text not null default '',
  linkedin_url    text not null default '',
  relationship    text not null default 'recruiter'
    check (relationship in ('recruiter','hiring_manager','referral','peer','other')),
  notes           text not null default '',
  last_contacted_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table contacts enable row level security;

create policy "Users manage own contacts"
  on contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_contacts_user_job on contacts(user_id, job_id);

-- ── Contact interactions ─────────────────────────────────────────

create table if not exists contact_interactions (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid not null references contacts(id) on delete cascade,
  interaction_type text not null default 'email'
    check (interaction_type in ('email','phone','linkedin','meeting','other')),
  summary         text not null default '',
  occurred_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

alter table contact_interactions enable row level security;

create policy "Users manage own interactions"
  on contact_interactions for all
  using (
    exists (
      select 1 from contacts c
      where c.id = contact_interactions.contact_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from contacts c
      where c.id = contact_interactions.contact_id
        and c.user_id = auth.uid()
    )
  );

-- ── Timeline events ──────────────────────────────────────────────

create table if not exists timeline_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  job_id      uuid not null references jobs(id) on delete cascade,
  event_type  text not null default 'note'
    check (event_type in ('status_change','application_sent','interview_scheduled',
      'interview_completed','outreach_sent','offer_received','note',
      'document_generated','contact_added','custom')),
  title       text not null default '',
  description text not null default '',
  occurred_at timestamptz not null default now(),
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table timeline_events enable row level security;

create policy "Users manage own timeline events"
  on timeline_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_timeline_events_job on timeline_events(user_id, job_id, occurred_at desc);
