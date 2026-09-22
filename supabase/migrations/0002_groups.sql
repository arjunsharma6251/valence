-- Study groups: a short code lets a club compare weak topics and mock scores.
-- Members only ever see aggregates (accuracy per topic, last mock), computed
-- by a security-definer function, never each other's raw attempts.

create table if not exists study_groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  name text not null check (char_length(name) between 1 and 40),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists study_group_members (
  group_id uuid not null references study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table study_groups enable row level security;
alter table study_group_members enable row level security;

-- Anyone signed in can look up a group by code (to join) and create one.
create policy "groups readable by members" on study_groups for select using (
  exists (select 1 from study_group_members m where m.group_id = id and m.user_id = auth.uid())
);
create policy "create group" on study_groups for insert with check (auth.uid() = created_by);
create policy "members see membership" on study_group_members for select using (
  exists (select 1 from study_group_members m where m.group_id = study_group_members.group_id and m.user_id = auth.uid())
);
create policy "join self" on study_group_members for insert with check (auth.uid() = user_id);
create policy "leave self" on study_group_members for delete using (auth.uid() = user_id);

-- Join by code without being able to enumerate groups.
create or replace function join_group(p_code text, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  select id into gid from study_groups where code = upper(p_code);
  if gid is null then raise exception 'no_such_group'; end if;
  insert into study_group_members(group_id, user_id, display_name) values (gid, auth.uid(), p_name)
    on conflict (group_id, user_id) do update set display_name = excluded.display_name;
  return gid;
end $$;

-- Per-member aggregates for one group the caller belongs to.
create or replace function group_summary(p_group uuid)
returns table (
  user_id uuid, display_name text, answered bigint, accuracy numeric, last_mock jsonb, weakest_topic text, weakest_accuracy numeric, last_active timestamptz
) language sql security definer set search_path = public as $$
  with me as (select 1 from study_group_members where group_id = p_group and user_id = auth.uid()),
  members as (select m.user_id, m.display_name from study_group_members m where m.group_id = p_group and exists (select 1 from me)),
  per_topic as (
    select a.user_id, a.topic_id, count(*) n, avg(case when a.correct then 1.0 else 0.0 end) acc
    from attempts a join members mm on mm.user_id = a.user_id group by a.user_id, a.topic_id having count(*) >= 3
  ),
  weakest as (select distinct on (user_id) user_id, topic_id, acc from per_topic order by user_id, acc asc),
  totals as (select a.user_id, count(*) answered, avg(case when a.correct then 1.0 else 0.0 end) accuracy, max(a.created_at) last_active from attempts a join members mm on mm.user_id = a.user_id group by a.user_id),
  mocks as (select distinct on (user_id) user_id, score from mock_sessions where submitted_at is not null order by user_id, submitted_at desc)
  select mm.user_id, mm.display_name, coalesce(t.answered, 0), round(coalesce(t.accuracy, 0) * 100, 0), mk.score, w.topic_id, round(coalesce(w.acc, 0) * 100, 0), t.last_active
  from members mm left join totals t on t.user_id = mm.user_id left join mocks mk on mk.user_id = mm.user_id left join weakest w on w.user_id = mm.user_id
  order by t.answered desc nulls last;
$$;
