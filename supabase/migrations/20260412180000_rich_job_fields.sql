-- ============================================================
-- Migration: Rich Job Fields
-- Adds salary, location, remote type, job type, experience
-- level, skills, priority, deadline, company logo, and
-- application email to the jobs table.
-- ============================================================

-- ── New columns ──────────────────────────────────────────────

alter table public.jobs
  add column if not exists salary_min      integer,
  add column if not exists salary_max      integer,
  add column if not exists salary_currency text not null default 'USD',
  add column if not exists location        text,
  add column if not exists remote_type     text not null default 'unknown'
    check (remote_type in ('remote', 'hybrid', 'onsite', 'unknown')),
  add column if not exists job_type        text not null default 'full_time'
    check (job_type in ('full_time', 'part_time', 'contract', 'internship', 'freelance')),
  add column if not exists experience_level text not null default 'mid'
    check (experience_level in ('intern', 'entry', 'mid', 'senior', 'lead', 'director', 'vp', 'c_level')),
  add column if not exists skills          text[] not null default '{}',
  add column if not exists company_logo_url text,
  add column if not exists deadline        timestamptz,
  add column if not exists priority        integer not null default 0
    check (priority between 0 and 5),
  add column if not exists application_email text,
  add column if not exists company_website  text,
  add column if not exists department       text,
  add column if not exists recruiter_name   text,
  add column if not exists recruiter_email  text,
  add column if not exists referral_source  text,
  add column if not exists excitement       integer not null default 0
    check (excitement between 0 and 5),
  add column if not exists fit_score        integer not null default 0
    check (fit_score between 0 and 100),
  add column if not exists next_step        text,
  add column if not exists next_step_date   timestamptz,
  add column if not exists tags             text[] not null default '{}';

-- ── Indexes for common queries ───────────────────────────────

create index if not exists idx_jobs_remote_type     on public.jobs (remote_type);
create index if not exists idx_jobs_job_type        on public.jobs (job_type);
create index if not exists idx_jobs_experience      on public.jobs (experience_level);
create index if not exists idx_jobs_priority        on public.jobs (priority);
create index if not exists idx_jobs_deadline        on public.jobs (deadline);
create index if not exists idx_jobs_salary_range    on public.jobs (salary_min, salary_max);
create index if not exists idx_jobs_location        on public.jobs (location);
create index if not exists idx_jobs_skills          on public.jobs using gin (skills);
create index if not exists idx_jobs_tags            on public.jobs using gin (tags);

-- ── Comment the table for clarity ────────────────────────────

comment on column public.jobs.salary_min       is 'Minimum annual salary (in salary_currency)';
comment on column public.jobs.salary_max       is 'Maximum annual salary (in salary_currency)';
comment on column public.jobs.salary_currency  is 'ISO 4217 currency code (default USD)';
comment on column public.jobs.remote_type      is 'remote | hybrid | onsite | unknown';
comment on column public.jobs.job_type         is 'full_time | part_time | contract | internship | freelance';
comment on column public.jobs.experience_level is 'intern | entry | mid | senior | lead | director | vp | c_level';
comment on column public.jobs.skills           is 'Array of skill tags, e.g. {Python, SQL, React}';
comment on column public.jobs.priority         is '0 = no priority, 1-5 star rating';
comment on column public.jobs.excitement       is '0 = unrated, 1-5 how excited you are';
comment on column public.jobs.fit_score        is '0-100 self-assessed fit score';
comment on column public.jobs.tags             is 'User-defined tags, e.g. {dream_job, referral, FAANG}';
comment on column public.jobs.next_step        is 'Next action item for this application';
comment on column public.jobs.next_step_date   is 'When the next step is due';
