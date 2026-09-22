-- Valence schema. Questions/explanations/FRQ content is bundled in the app
-- (see /content); these tables hold per-user data, contributor edits, and
-- grading bookkeeping. Apply with the Supabase SQL editor or `supabase db push`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  grade_year text,
  target text check (target in ('local','national')),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------- attempts
create table if not exists attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  topic_id text not null,
  chosen text not null check (chosen in ('A','B','C','D')),
  correct boolean not null,
  ms_taken integer not null default 0,
  context text not null check (context in ('practice','mock','review')),
  created_at timestamptz not null
);
create index if not exists attempts_user_created on attempts(user_id, created_at);
create index if not exists attempts_question on attempts(question_id);
alter table attempts enable row level security;
create policy "own attempts" on attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Empirical difficulty per question, readable by everyone. Refresh with:
--   refresh materialized view concurrently question_stats;
create materialized view if not exists question_stats as
  select question_id, count(*) as attempts, avg(case when correct then 1.0 else 0.0 end) as percent_correct
  from attempts group by question_id;
create unique index if not exists question_stats_pk on question_stats(question_id);

-- ---------------------------------------------------------------- srs
create table if not exists srs_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  interval integer not null,
  ease real not null,
  reps integer not null,
  due_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, question_id)
);
alter table srs_cards enable row level security;
create policy "own cards" on srs_cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- mocks
create table if not exists mock_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null check (level in ('local','national')),
  question_ids jsonb not null,
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null,
  duration_s integer not null,
  paused_at timestamptz,
  pauses_used integer not null default 0,
  submitted_at timestamptz,
  score jsonb
);
alter table mock_sessions enable row level security;
create policy "own mocks" on mock_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- flags
create table if not exists flags (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  anon_id text,
  question_id text not null,
  reason text not null,
  note text not null default '',
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table flags enable row level security;
create policy "anyone can flag" on flags for insert with check (true);
create policy "own flags" on flags for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------- explanation edits (contributor editor)
create table if not exists explanation_edits (
  id uuid primary key default gen_random_uuid(),
  question_id text not null,
  body_md text not null,
  distractor_notes jsonb not null,
  concept_ref text not null default '',
  verified boolean not null default false,
  author text not null,
  author_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists explanation_edits_q on explanation_edits(question_id, updated_at desc);
alter table explanation_edits enable row level security;
create policy "edits are public" on explanation_edits for select using (true);
-- Inserts happen through the service role or the API route's allowlist check:
create policy "signed-in insert" on explanation_edits for insert with check (auth.uid() = author_id);

-- ---------------------------------------------------------------- FRQ grading
create table if not exists frq_submissions (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  anon_id text,
  frq_id text not null,
  answers jsonb not null,
  grade jsonb,
  model text,
  cost_cents numeric(8,3) not null default 0,
  cache_key text,
  created_at timestamptz not null default now()
);
create index if not exists frq_submissions_user_day on frq_submissions(user_id, created_at);
create index if not exists frq_submissions_anon_day on frq_submissions(anon_id, created_at);
create index if not exists frq_submissions_cache on frq_submissions(cache_key);
alter table frq_submissions enable row level security;
create policy "own submissions" on frq_submissions for select using (auth.uid() = user_id);
create policy "own submissions upsert" on frq_submissions for insert with check (auth.uid() = user_id);

-- Grading bookkeeping (server only via service role): daily caps and monthly spend.
create table if not exists grading_ledger (
  id bigserial primary key,
  subject text not null,          -- user id, anon id, or ip
  frq_id text not null,
  cost_cents numeric(8,3) not null,
  created_at timestamptz not null default now()
);
create index if not exists grading_ledger_subject on grading_ledger(subject, created_at);
create index if not exists grading_ledger_created on grading_ledger(created_at);
alter table grading_ledger enable row level security; -- no policies: service role only

-- ---------------------------------------------------------------- success metrics (one query)
-- Weekly active users, users with 5+ sessions, Part II graded, mocks completed.
-- Sessions come from PostHog; the SQL below covers the product tables.
create or replace view metrics_summary as
select
  (select count(distinct user_id) from attempts where created_at > now() - interval '7 days') as weekly_active_signed_in,
  (select count(*) from frq_submissions where grade is not null) as frq_graded,
  (select count(*) from mock_sessions where submitted_at is not null) as mocks_completed,
  (select count(*) from explanation_edits where verified) as explanations_verified,
  (select coalesce(sum(cost_cents),0)/100.0 from grading_ledger where created_at > date_trunc('month', now())) as llm_spend_this_month_usd;
