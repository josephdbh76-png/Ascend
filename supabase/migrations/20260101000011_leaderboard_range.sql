-- The leaderboard only ever returned an exact amount or null, so a user
-- with "range" privacy showed as a bare "Verified" label instead of an
-- actual range — get_public_profile already computed one, get_leaderboard
-- never did. Adds the same range bucketing here so the UI can show it.

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
  revenue_range_min_cents bigint,
  revenue_range_max_cents bigint,
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
    case when ranked.revenue_visibility = 'range'
      then (floor(ranked.amount_cents / 1000000::numeric) * 1000000)::bigint else null end,
    case when ranked.revenue_visibility = 'range'
      then (floor(ranked.amount_cents / 1000000::numeric) * 1000000 + 1000000)::bigint else null end,
    ranked.revenue_visibility,
    ranked.growth_percent,
    (ranked.user_id = auth.uid())
  from ranked
  order by ranked.rnk asc
  limit p_limit offset p_offset;
$$;

grant execute on function get_leaderboard(text, text, int, int) to anon, authenticated;

-- Same range-bucketing fix for the "your rank" lookup.
create or replace function get_user_rank(
  p_user_id uuid,
  p_scope text default 'global',
  p_scope_value text default ''
)
returns table (
  rank bigint,
  total bigint,
  revenue_display_cents bigint,
  revenue_range_min_cents bigint,
  revenue_range_max_cents bigint,
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
    case when ranked.revenue_visibility = 'range'
      then (floor(ranked.amount_cents / 1000000::numeric) * 1000000)::bigint else null end,
    case when ranked.revenue_visibility = 'range'
      then (floor(ranked.amount_cents / 1000000::numeric) * 1000000 + 1000000)::bigint else null end,
    ranked.revenue_visibility,
    ranked.growth_percent
  from ranked
  where ranked.user_id = p_user_id;
$$;

grant execute on function get_user_rank(uuid, text, text) to anon, authenticated;
