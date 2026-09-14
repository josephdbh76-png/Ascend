-- Security-definer RPCs. These are the ONLY sanctioned way to read
-- cross-user revenue/ranking data: they compute ranking from the private
-- revenue_snapshots table but only ever return a dollar figure when the
-- owner's privacy_settings say it's allowed (revenue_visibility = 'exact').
-- Range/private visibility returns null for the amount — the client still
-- gets rank, growth and identity so the leaderboard stays meaningful.

create or replace function get_leaderboard(
  p_scope text default 'global',
  p_scope_value text default '',
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  country text,
  is_demo boolean,
  business_name text,
  business_category text,
  revenue_display_cents bigint,
  revenue_visibility text,
  growth_percent numeric,
  is_current_user boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with latest as (
    select distinct on (rs.user_id)
      rs.user_id, rs.amount_cents, rs.period
    from revenue_snapshots rs
    where rs.is_verified = true
    order by rs.user_id, rs.period desc
  ),
  previous as (
    select distinct on (rs.user_id)
      rs.user_id, rs.amount_cents, rs.period
    from revenue_snapshots rs
    join latest l on l.user_id = rs.user_id and rs.period < l.period
    order by rs.user_id, rs.period desc
  ),
  ranked as (
    select
      p.id as user_id,
      p.username,
      p.first_name,
      p.last_name,
      p.avatar_url,
      p.country,
      p.is_demo,
      b.name as business_name,
      b.category as business_category,
      l.amount_cents,
      case
        when prev.amount_cents is null or prev.amount_cents = 0 then null
        else round(((l.amount_cents - prev.amount_cents)::numeric / prev.amount_cents) * 100, 1)
      end as growth_percent,
      coalesce(ps.revenue_visibility, 'private') as revenue_visibility,
      rank() over (order by l.amount_cents desc) as rnk
    from latest l
    join profiles p on p.id = l.user_id and p.revenue_verified = true
    join businesses b on b.user_id = p.id
    left join previous prev on prev.user_id = l.user_id
    left join privacy_settings ps on ps.user_id = p.id
    where (p_scope = 'global')
       or (p_scope = 'country' and p.country = p_scope_value)
       or (p_scope = 'category' and b.category = p_scope_value)
  )
  select
    ranked.rnk,
    ranked.user_id,
    ranked.username,
    ranked.first_name,
    ranked.last_name,
    ranked.avatar_url,
    ranked.country,
    ranked.is_demo,
    ranked.business_name,
    ranked.business_category,
    case when ranked.revenue_visibility = 'exact' then ranked.amount_cents else null end,
    ranked.revenue_visibility,
    ranked.growth_percent,
    (ranked.user_id = auth.uid())
  from ranked
  order by ranked.rnk asc
  limit p_limit offset p_offset;
$$;

grant execute on function get_leaderboard(text, text, int, int) to anon, authenticated;

-- Rank + total for a single user in a scope, even if outside the returned page.
create or replace function get_user_rank(
  p_user_id uuid,
  p_scope text default 'global',
  p_scope_value text default ''
)
returns table (
  rank bigint,
  total bigint,
  revenue_display_cents bigint,
  revenue_visibility text,
  growth_percent numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with latest as (
    select distinct on (rs.user_id)
      rs.user_id, rs.amount_cents, rs.period
    from revenue_snapshots rs
    where rs.is_verified = true
    order by rs.user_id, rs.period desc
  ),
  previous as (
    select distinct on (rs.user_id)
      rs.user_id, rs.amount_cents, rs.period
    from revenue_snapshots rs
    join latest l on l.user_id = rs.user_id and rs.period < l.period
    order by rs.user_id, rs.period desc
  ),
  ranked as (
    select
      p.id as user_id,
      l.amount_cents,
      case
        when prev.amount_cents is null or prev.amount_cents = 0 then null
        else round(((l.amount_cents - prev.amount_cents)::numeric / prev.amount_cents) * 100, 1)
      end as growth_percent,
      coalesce(ps.revenue_visibility, 'private') as revenue_visibility,
      rank() over (order by l.amount_cents desc) as rnk,
      count(*) over () as total
    from latest l
    join profiles p on p.id = l.user_id and p.revenue_verified = true
    join businesses b on b.user_id = p.id
    left join previous prev on prev.user_id = l.user_id
    left join privacy_settings ps on ps.user_id = p.id
    where (p_scope = 'global')
       or (p_scope = 'country' and p.country = p_scope_value)
       or (p_scope = 'category' and b.category = p_scope_value)
  )
  select
    ranked.rnk,
    ranked.total,
    case when ranked.revenue_visibility = 'exact' then ranked.amount_cents else null end,
    ranked.revenue_visibility,
    ranked.growth_percent
  from ranked
  where ranked.user_id = p_user_id;
$$;

grant execute on function get_user_rank(uuid, text, text) to anon, authenticated;

-- Public profile: identity + business + privacy-safe revenue + global/country rank.
create or replace function get_public_profile(p_username text)
returns table (
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  country text,
  bio text,
  avatar_url text,
  is_demo boolean,
  founding_member_number int,
  revenue_verified boolean,
  member_since timestamptz,
  business_name text,
  business_category text,
  revenue_display_cents bigint,
  revenue_range_min_cents bigint,
  revenue_range_max_cents bigint,
  revenue_visibility text,
  growth_percent numeric,
  global_rank bigint,
  country_rank bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target profiles%rowtype;
begin
  select * into target from profiles where profiles.username = p_username;
  if not found then
    return;
  end if;

  return query
  with latest as (
    select rs.amount_cents, rs.period
    from revenue_snapshots rs
    where rs.user_id = target.id and rs.is_verified = true
    order by rs.period desc
    limit 1
  ),
  previous as (
    select rs.amount_cents
    from revenue_snapshots rs, latest l
    where rs.user_id = target.id and rs.period < l.period
    order by rs.period desc
    limit 1
  ),
  vis as (
    select coalesce(ps.revenue_visibility, 'private') as visibility
    from privacy_settings ps where ps.user_id = target.id
  )
  select
    target.id,
    target.username,
    target.first_name,
    target.last_name,
    case when coalesce((select show_country from privacy_settings where privacy_settings.user_id = target.id), true)
      then target.country else null end,
    target.bio,
    target.avatar_url,
    target.is_demo,
    target.founding_member_number,
    target.revenue_verified,
    target.created_at,
    b.name,
    b.category,
    case when (select visibility from vis) = 'exact' then (select amount_cents from latest) else null end,
    case when (select visibility from vis) = 'range' then (floor(coalesce((select amount_cents from latest), 0) / 1000000::numeric) * 1000000)::bigint else null end,
    case when (select visibility from vis) = 'range' then (floor(coalesce((select amount_cents from latest), 0) / 1000000::numeric) * 1000000 + 1000000)::bigint else null end,
    (select visibility from vis),
    case
      when (select amount_cents from previous) is null or (select amount_cents from previous) = 0 then null
      else round((((select amount_cents from latest) - (select amount_cents from previous))::numeric / (select amount_cents from previous)) * 100, 1)
    end,
    (select gl.rank from get_leaderboard('global', '', 100000, 0) gl where gl.user_id = target.id),
    (select cl.rank from get_leaderboard('country', target.country, 100000, 0) cl where cl.user_id = target.id)
  from businesses b
  where b.user_id = target.id;
end;
$$;

grant execute on function get_public_profile(text) to anon, authenticated;

-- Captures today's rank for every ranked user, across global/country/category
-- scopes, so the dashboard can compute "you moved up N places" over time.
create or replace function capture_leaderboard_snapshot(p_snapshot_date date default current_date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  active_season uuid;
  scope_pairs text[][];
  pair text[];
  rec record;
begin
  select id into active_season from seasons where is_active = true limit 1;

  scope_pairs := array(
    select array['global', '']
    union all
    select array['country', country] from (select distinct country from profiles where country is not null) c
    union all
    select array['category', category] from (select distinct category from businesses) b
  );

  foreach pair slice 1 in array scope_pairs loop
    for rec in select * from get_leaderboard(pair[1], pair[2], 100000, 0) loop
      insert into leaderboard_snapshots (
        user_id, season_id, scope, scope_value, rank, revenue_cents, growth_percent, snapshot_date
      )
      values (
        rec.user_id, active_season, pair[1], pair[2], rec.rank, rec.revenue_display_cents, rec.growth_percent, p_snapshot_date
      )
      on conflict (user_id, season_id, scope, scope_value, snapshot_date)
      do update set rank = excluded.rank, revenue_cents = excluded.revenue_cents, growth_percent = excluded.growth_percent;
    end loop;
  end loop;
end;
$$;

-- Only the trusted server job (service role) may trigger a snapshot capture.
revoke all on function capture_leaderboard_snapshot(date) from public;
grant execute on function capture_leaderboard_snapshot(date) to service_role;
