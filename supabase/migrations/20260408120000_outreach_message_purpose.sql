-- Classify saved outreach rows (cold outreach vs post-interview thank-you).

alter table public.outreach_messages
  add column if not exists message_purpose text not null default 'outreach';

alter table public.outreach_messages
  drop constraint if exists outreach_messages_message_purpose_check;

alter table public.outreach_messages
  add constraint outreach_messages_message_purpose_check
  check (message_purpose in ('outreach', 'thank_you'));

create index if not exists outreach_messages_user_purpose_created_idx
  on public.outreach_messages (user_id, message_purpose, created_at desc);

-- Best-effort backfill for thank-yous created before this column existed.
update public.outreach_messages
set message_purpose = 'thank_you'
where message_purpose = 'outreach'
  and (
    recipient_name = 'Interview thank-you'
    or lower(coalesce(subject, '')) like '%thank you%'
  );
