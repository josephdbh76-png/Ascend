-- Wires the subscriptions table up to real Stripe Billing (Checkout +
-- webhook-driven sync), and adds a paid profile customization perk
-- (accent theme) so PRO has something concrete to unlock.

alter table subscriptions
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column current_period_end timestamptz;

alter table subscriptions drop constraint subscriptions_status_check;
alter table subscriptions add constraint subscriptions_status_check
  check (status in ('active', 'past_due', 'canceled'));

create unique index subscriptions_stripe_customer_id_idx on subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;
create unique index subscriptions_stripe_subscription_id_idx on subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table profiles
  add column accent_theme text not null default 'gold'
  check (accent_theme in ('gold', 'emerald', 'violet', 'crimson', 'sky'));

-- get_public_profile needs accent_theme in its output so the public profile
-- page can render it; changing OUT columns requires dropping the function
-- first (CREATE OR REPLACE can't change a function's return shape).
drop function if exists get_public_profile(text);

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
  accent_theme text
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
    (select cl.rank from get_leaderboard('country', target.country, 100000, 0) cl where cl.user_id = target.id),
    target.accent_theme
  from businesses b
  where b.user_id = target.id;
end;
$$;

grant execute on function get_public_profile(text) to anon, authenticated;
