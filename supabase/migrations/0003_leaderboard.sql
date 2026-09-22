-- Opt-in weekly leaderboard. Only users who set a display name and flip
-- `public` appear; anonymous visitors can read the aggregates.

alter table profiles add column if not exists display_name text check (char_length(display_name) between 1 and 24);
alter table profiles add column if not exists public boolean not null default false;

create or replace function leaderboard_week()
returns table (user_id uuid, display_name text, answered bigint, accuracy numeric, best_mock jsonb, rank bigint)
language sql security definer set search_path = public stable as $$
  with wk as (
    select a.user_id, count(*) answered, avg(case when a.correct then 1.0 else 0.0 end) acc
    from attempts a join profiles p on p.id = a.user_id
    where p.public and p.display_name is not null and a.created_at > date_trunc('week', now())
    group by a.user_id
  ),
  mk as (
    select distinct on (m.user_id) m.user_id, m.score
    from mock_sessions m join profiles p on p.id = m.user_id
    where p.public and m.submitted_at is not null and m.submitted_at > date_trunc('week', now())
    order by m.user_id, (m.score->>'correct')::int desc
  )
  select w.user_id, p.display_name, w.answered, round(w.acc * 100, 0), mk.score,
         rank() over (order by w.answered desc, w.acc desc)
  from wk w join profiles p on p.id = w.user_id left join mk on mk.user_id = w.user_id
  order by w.answered desc, w.acc desc
  limit 50;
$$;
grant execute on function leaderboard_week() to anon, authenticated;
