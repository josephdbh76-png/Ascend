-- 1. Banners shown to chosen plans only (empty: every member).
-- 2. Season leagues: members compete with businesses of their size, each
--    league with its own challenges, ranking and rewards.

-- =========================================================================
-- 1. BANNER AUDIENCE
-- =========================================================================

alter table dashboard_banners add column if not exists audience text[] not null default '{}';
alter table dashboard_banners drop constraint if exists dashboard_banners_audience_check;
alter table dashboard_banners add constraint dashboard_banners_audience_check
  check (audience <@ array['free', 'pro', 'elite']::text[]);

-- =========================================================================
-- 2. SEASON LEAGUES
-- =========================================================================

-- League of each member for a season, kept up to date by the server. The
-- reference revenue is private: members only read their own row.
create table if not exists season_participants (
  season_id uuid not null references seasons (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  league text not null check (league in ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  base_revenue_cents bigint not null default 0,
  base_period date,
  provisional boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (season_id, user_id)
);
create index if not exists season_participants_league_idx on season_participants (season_id, league);

alter table season_participants enable row level security;
drop policy if exists "members read their own league" on season_participants;
create policy "members read their own league" on season_participants
  for select using (auth.uid() = user_id);

-- null: the challenge counts in every league.
alter table challenges add column if not exists leagues text[];
alter table challenges drop constraint if exists challenges_leagues_check;
alter table challenges add constraint challenges_leagues_check
  check (leagues is null or leagues <@ array['bronze', 'silver', 'gold', 'platinum', 'diamond']::text[]);

alter table challenges drop constraint if exists challenges_type_check;
alter table challenges add constraint challenges_type_check check (type in (
  'revenue_threshold', 'growth_threshold', 'consistency', 'coming_soon',
  'customer_threshold', 'transaction_threshold', 'follower_threshold',
  'rank_threshold', 'verification', 'profile_complete', 'base_growth'
));

-- null: the reward applies to the ranking of every league.
alter table season_rewards add column if not exists league text;
alter table season_rewards drop constraint if exists season_rewards_league_check;
alter table season_rewards add constraint season_rewards_league_check
  check (league is null or league in ('bronze', 'silver', 'gold', 'platinum', 'diamond'));

alter table season_results add column if not exists league text;

-- Rankings are per league now. Signatures change, so the old ones go first.
drop function if exists get_user_season_standing(uuid, uuid);
drop function if exists get_season_standings(uuid, int);
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
  league text
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
           max(uc.completed_at) as last_completed_at
    from user_challenges uc
    join part on part.user_id = uc.user_id
    join challenges c on c.id = uc.challenge_id
      and c.season_id = p_season_id
      and c.points > 0
      and c.is_published
      -- Only the challenges of the member's league count.
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
         r.points, r.completed_count, r.last_completed_at, (p.id = auth.uid()), r.league
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
