-- Add extra profile fields for the expanded settings page.
alter table public.profiles
  add column if not exists phone text not null default '',
  add column if not exists location text not null default '',
  add column if not exists portfolio_url text not null default '',
  add column if not exists bio text not null default '';
