-- Review reminders: one email when cards are due, default on for signed-in
-- users, one-click unsubscribe. Sends are logged so nobody gets two a day and
-- so three ignored reminders pause the account automatically.
alter table profiles
  add column if not exists reminders_enabled boolean not null default true,
  add column if not exists reminders_paused_at timestamptz,
  add column if not exists last_reminded_at timestamptz,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
create unique index if not exists profiles_unsubscribe_token on profiles(unsubscribe_token);

create table if not exists reminder_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now(),
  due_count integer not null,
  weakest_topic text,
  resend_id text
);
create index if not exists reminder_sends_user_sent on reminder_sends(user_id, sent_at);
alter table reminder_sends enable row level security; -- no policies: service role only
