-- Season page: everyone's progress. The ranking gains the points earned
-- over the last 7 days, and a feed lists the latest challenges completed in
-- a league. Revenue milestones of members who don't show their exact
-- revenue are listed without the amount.

drop function if exists get_user_season_standing(uuid, uuid);
drop function if exists get_season_standings(uuid, int, text);

create function get_season_standings(p_season_id uuid, p_limit int default 100, p_league text default null)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  points bigint,
  completed_count bigint,
  last_completed_at timestamptz,
  is_current_user boolean,
  league text,
  points_week bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select starts_at, ends_at from seasons where id = p_season_id
  ),
  part as (
    select sp.user_id, sp.league
    from season_participants sp
    where sp.season_id = p_season_id
      and (p_league is null or sp.league = p_league)
  ),
  done as (
    select uc.user_id,
           part.league,
           sum(c.points)::bigint as points,
           count(*)::bigint as completed_count,
           max(uc.completed_at) as last_completed_at,
           coalesce(sum(c.points) filter (where uc.completed_at >= now() - interval '7 days'), 0)::bigint as points_week
    from user_challenges uc
    join part on part.user_id = uc.user_id
    join challenges c on c.id = uc.challenge_id
      and c.season_id = p_season_id
      and c.points > 0
      and c.is_published
      and (c.leagues is null or part.league = any (c.leagues))
    cross join s
    where uc.status = 'completed'
      and uc.completed_at >= s.starts_at
      and uc.completed_at <= s.ends_at
    group by uc.user_id, part.league
  ),
  ranked as (
    select rank() over (partition by d.league order by d.points desc, d.last_completed_at asc) as rnk, d.*
    from done d
    join profiles p on p.id = d.user_id and p.is_demo = false
  )
  select r.rnk, p.id, p.username, p.first_name, p.last_name, p.avatar_url,
         r.points, r.completed_count, r.last_completed_at, (p.id = auth.uid()), r.league, r.points_week
  from ranked r
  join profiles p on p.id = r.user_id
  order by r.league, r.rnk asc
  limit p_limit;
$$;

grant execute on function get_season_standings(uuid, int, text) to anon, authenticated;

create function get_user_season_standing(p_season_id uuid, p_user_id uuid)
returns table (rank bigint, points bigint, total bigint, league text)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select sp.league from season_participants sp
    where sp.season_id = p_season_id and sp.user_id = p_user_id
  ),
  standings as (
    select * from get_season_standings(p_season_id, 100000, (select league from mine))
  )
  select st.rank, st.points, (select count(*) from standings), st.league
  from standings st
  where st.user_id = p_user_id;
$$;

grant execute on function get_user_season_standing(uuid, uuid) to anon, authenticated;

create or replace function get_season_activity(p_season_id uuid, p_league text, p_limit int default 20)
returns table (
  completed_at timestamptz,
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  challenge_title text,
  challenge_type text,
  points int,
  hide_amount boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select uc.completed_at, p.id, p.username, p.first_name, p.last_name, p.avatar_url,
         c.title, c.type, c.points,
         (c.type = 'revenue_threshold' and coalesce(ps.revenue_visibility, 'private') <> 'exact')
  from user_challenges uc
  join season_participants sp on sp.user_id = uc.user_id and sp.season_id = p_season_id and sp.league = p_league
  join challenges c on c.id = uc.challenge_id
    and c.season_id = p_season_id
    and c.points > 0
    and c.is_published
    and (c.leagues is null or sp.league = any (c.leagues))
  join seasons s on s.id = p_season_id
  join profiles p on p.id = uc.user_id and p.is_demo = false
  left join privacy_settings ps on ps.user_id = p.id
  where uc.status = 'completed'
    and uc.completed_at >= s.starts_at
    and uc.completed_at <= s.ends_at
  order by uc.completed_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function get_season_activity(uuid, text, int) from public, anon;
grant execute on function get_season_activity(uuid, text, int) to authenticated;
