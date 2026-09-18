-- Benchmark stats: turns "you make €X" into "you make €X and here's exactly
-- how that compares to other verified businesses" — the core of the
-- reputation/benchmark layer. Deterministic percentile math over real
-- verified revenue, no fabricated numbers, no AI.
--
-- percent_rank() is exactly "fraction of the cohort this user is ahead of"
-- (0 for the lowest, 1 for the highest) — reused instead of hand-rolling
-- percentile math. Comparisons are scoped by business category, because a
-- €20k SaaS and a €20k agency aren't the same thing (see get_leaderboard's
-- existing category scope, which this mirrors). Global figures are also
-- returned so the UI can fall back gracefully when a category's cohort is
-- still too small to be meaningful.
--
-- Window functions must be computed over the FULL cohort before filtering
-- down to p_user_id's row — SQL applies WHERE before window functions, so
-- filtering first would collapse the partition to one row and make every
-- percentile trivially 0. Each *_ranked CTE below carries the whole
-- partition; only the final SELECT picks out the target user's row.
--
-- Aggregate-only: an individual's exact revenue is never exposed by this
-- function, regardless of their own privacy_settings — only counts and
-- percentiles derived across the whole cohort, the same trust boundary
-- capture_leaderboard_snapshot already relies on internally.

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
  cohort as (
    select
      p.id as user_id,
      b.category,
      l.amount_cents,
      case
        when prev.amount_cents is null or prev.amount_cents = 0 then null
        else ((l.amount_cents - prev.amount_cents)::numeric / prev.amount_cents) * 100
      end as growth_percent
    from latest l
    join profiles p on p.id = l.user_id and p.revenue_verified = true
    join businesses b on b.user_id = p.id
    left join previous prev on prev.user_id = l.user_id
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
