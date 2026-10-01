-- Rankings, growth and benchmarks used each member's latest month with
-- data, even when that month had only started: on the 1st, a few hours of
-- sales replaced a full month (growth around -99 %, ranks reshuffled).
-- They now use the last COMPLETE month, the same period for everyone. The
-- month in progress only counts for members who have no complete month yet.
-- A member whose latest figure is older than two months (source
-- disconnected, declarations stopped) leaves the ranking until it's fresh.

-- New sources connected with the member's own key.
alter table revenue_sources drop constraint if exists revenue_sources_provider_check;
alter table revenue_sources add constraint revenue_sources_provider_check
  check (provider in (
    'stripe', 'shopify', 'paypal', 'paddle', 'manual', 'bank', 'lemonsqueezy',
    'qonto', 'mollie', 'gumroad', 'whop', 'woocommerce'
  ));

create or replace function member_reference_revenue(p_user_id uuid default null)
returns table (user_id uuid, period date, amount_cents bigint, previous_amount_cents bigint)
language sql
stable
security definer
set search_path = public
as $$
  with verified as (
    select rs.user_id, rs.period, rs.amount_cents::bigint as amount_cents
    from revenue_snapshots rs
    where rs.is_verified = true
      and (p_user_id is null or rs.user_id = p_user_id)
  ),
  ref as (
    select distinct on (v.user_id) v.user_id, v.period, v.amount_cents
    from verified v
    where v.period >= (date_trunc('month', now()) - interval '2 months')::date
    order by v.user_id, (v.period < date_trunc('month', now())::date) desc, v.period desc
  )
  select
    r.user_id,
    r.period,
    r.amount_cents,
    (select v2.amount_cents from verified v2 where v2.user_id = r.user_id and v2.period < r.period order by v2.period desc limit 1)
  from ref r;
$$;

revoke execute on function member_reference_revenue(uuid) from public, anon, authenticated;
grant execute on function member_reference_revenue(uuid) to service_role;

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
  with ref as (
    select * from member_reference_revenue(null)
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
      r.amount_cents,
      case
        when r.previous_amount_cents is null or r.previous_amount_cents = 0 then null
        else round(((r.amount_cents - r.previous_amount_cents)::numeric / r.previous_amount_cents) * 100, 1)
      end as growth_percent,
      coalesce(ps.revenue_visibility, 'private') as revenue_visibility,
      rank() over (order by r.amount_cents desc) as rnk
    from ref r
    join profiles p on p.id = r.user_id and p.revenue_verified = true
    join businesses b on b.user_id = p.id
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
  with ref as (
    select * from member_reference_revenue(null)
  ),
  ranked as (
    select
      p.id as user_id,
      r.amount_cents,
      case
        when r.previous_amount_cents is null or r.previous_amount_cents = 0 then null
        else round(((r.amount_cents - r.previous_amount_cents)::numeric / r.previous_amount_cents) * 100, 1)
      end as growth_percent,
      coalesce(ps.revenue_visibility, 'private') as revenue_visibility,
      rank() over (order by r.amount_cents desc) as rnk,
      count(*) over () as total
    from ref r
    join profiles p on p.id = r.user_id and p.revenue_verified = true
    join businesses b on b.user_id = p.id
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
  country_rank bigint,
  accent_theme text,
  is_cofounder boolean,
  legal_name text
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
  with ref as (
    select r.amount_cents, r.previous_amount_cents
    from member_reference_revenue(target.id) r
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
    case when (select visibility from vis) = 'exact' then (select amount_cents from ref) else null end,
    case when (select visibility from vis) = 'range' then (floor(coalesce((select amount_cents from ref), 0) / 1000000::numeric) * 1000000)::bigint else null end,
    case when (select visibility from vis) = 'range' then (floor(coalesce((select amount_cents from ref), 0) / 1000000::numeric) * 1000000 + 1000000)::bigint else null end,
    (select visibility from vis),
    case
      when (select previous_amount_cents from ref) is null or (select previous_amount_cents from ref) = 0 then null
      else round((((select amount_cents from ref) - (select previous_amount_cents from ref))::numeric / (select previous_amount_cents from ref)) * 100, 1)
    end,
    (select gl.rank from get_leaderboard('global', '', 100000, 0) gl where gl.user_id = target.id),
    (select cl.rank from get_leaderboard('country', target.country, 100000, 0) cl where cl.user_id = target.id),
    target.accent_theme,
    target.is_cofounder,
    b.legal_name
  from businesses b
  where b.user_id = target.id;
end;
$$;

grant execute on function get_public_profile(text) to anon, authenticated;

create or replace function get_benchmark_stats(p_user_id uuid)
returns table (
  category text,
  category_sample_size bigint,
  category_revenue_percentile numeric,
  category_growth_percentile numeric,
  category_median_revenue_cents bigint,
  global_sample_size bigint,
  global_revenue_percentile numeric,
  global_growth_percentile numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with ref as (
    select * from member_reference_revenue(null)
  ),
  cohort as (
    select
      p.id as user_id,
      b.category,
      r.amount_cents,
      case
        when r.previous_amount_cents is null or r.previous_amount_cents = 0 then null
        else ((r.amount_cents - r.previous_amount_cents)::numeric / r.previous_amount_cents) * 100
      end as growth_percent
    from ref r
    join profiles p on p.id = r.user_id and p.revenue_verified = true
    join businesses b on b.user_id = p.id
  ),
  target_category as (
    select category from cohort where user_id = p_user_id
  ),
  cat_revenue_ranked as (
    select c.user_id, percent_rank() over (order by c.amount_cents)::numeric as pct, count(*) over () as n
    from cohort c join target_category t on c.category = t.category
  ),
  cat_growth_ranked as (
    select c.user_id, percent_rank() over (order by c.growth_percent)::numeric as pct
    from cohort c join target_category t on c.category = t.category
    where c.growth_percent is not null
  ),
  cat_median as (
    select percentile_cont(0.5) within group (order by c.amount_cents) as med
    from cohort c join target_category t on c.category = t.category
  ),
  global_revenue_ranked as (
    select c.user_id, percent_rank() over (order by c.amount_cents)::numeric as pct, count(*) over () as n
    from cohort c
  ),
  global_growth_ranked as (
    select c.user_id, percent_rank() over (order by c.growth_percent)::numeric as pct
    from cohort c
    where c.growth_percent is not null
  )
  select
    (select category from target_category),
    (select n from cat_revenue_ranked limit 1),
    (select pct from cat_revenue_ranked where user_id = p_user_id),
    (select pct from cat_growth_ranked where user_id = p_user_id),
    (select med::bigint from cat_median),
    (select n from global_revenue_ranked limit 1),
    (select pct from global_revenue_ranked where user_id = p_user_id),
    (select pct from global_growth_ranked where user_id = p_user_id)
  where exists (select 1 from target_category);
$$;

grant execute on function get_benchmark_stats(uuid) to authenticated;
