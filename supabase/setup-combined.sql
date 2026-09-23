-- Combined setup script — convenience concatenation of every file in
-- supabase/migrations/, in order, for pasting into the Supabase SQL
-- Editor in one go. Not itself a tracked migration.

-- ============================================================
-- 20260101000001_schema.sql
-- ============================================================
-- ASCEND core schema
-- Identity, business, revenue, verification, achievements, trophies,
-- challenges, seasons, leaderboard snapshots, privacy settings.

create extension if not exists "pgcrypto";

-- =========================================================================
-- SEASONS
-- =========================================================================
create table seasons (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  name text not null,
  label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index one_active_season on seasons (is_active) where is_active;

-- =========================================================================
-- PROFILES (identity) — 1:1 with auth.users
-- =========================================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  first_name text,
  last_name text,
  country text,
  bio text,
  avatar_url text,
  onboarding_step text not null default 'profile'
    check (onboarding_step in ('profile', 'business', 'bio', 'revenue', 'done')),
  revenue_verified boolean not null default false,
  is_demo boolean not null default false,
  founding_member_number int unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,30}$')
);

create index profiles_country_idx on profiles (country);
create index profiles_founding_member_idx on profiles (founding_member_number);

-- =========================================================================
-- BUSINESSES
-- =========================================================================
create table businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles (id) on delete cascade,
  name text not null,
  category text not null,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_category_idx on businesses (category);

-- =========================================================================
-- REVENUE SOURCES (connections, e.g. Stripe) — private
-- =========================================================================
create table revenue_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  provider text not null check (provider in ('stripe', 'shopify', 'paypal', 'paddle', 'manual')),
  status text not null default 'disconnected'
    check (status in ('connected', 'disconnected', 'error')),
  external_account_id text,
  is_test_mode boolean not null default true,
  connected_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- =========================================================================
-- VERIFICATIONS — private, one active record per revenue source
-- =========================================================================
create table verifications (
  id uuid primary key default gen_random_uuid(),
  revenue_source_id uuid not null references revenue_sources (id) on delete cascade,
  status text not null default 'unverified'
    check (status in ('unverified', 'verified', 'error', 'disconnected')),
  verified_at timestamptz,
  last_checked_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (revenue_source_id)
);

-- =========================================================================
-- REVENUE SNAPSHOTS — normalized monthly revenue, private
-- =========================================================================
create table revenue_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  revenue_source_id uuid references revenue_sources (id) on delete set null,
  period date not null, -- first day of month
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  currency text not null default 'EUR',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, period)
);

create index revenue_snapshots_user_period_idx on revenue_snapshots (user_id, period desc);

-- =========================================================================
-- PRIVACY SETTINGS
-- =========================================================================
create table privacy_settings (
  user_id uuid primary key references profiles (id) on delete cascade,
  revenue_visibility text not null default 'private'
    check (revenue_visibility in ('exact', 'range', 'private')),
  show_country boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- ACHIEVEMENTS (catalog + earned)
-- =========================================================================
create table achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  achievement_id text not null references achievements (id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

-- =========================================================================
-- TROPHIES (catalog + earned)
-- =========================================================================
create table trophies (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  created_at timestamptz not null default now()
);

create table user_trophies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  trophy_id text not null references trophies (id) on delete cascade,
  season_id uuid references seasons (id) on delete set null,
  earned_at timestamptz not null default now()
);

-- =========================================================================
-- CHALLENGES (catalog, season-scoped + progress)
-- =========================================================================
create table challenges (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons (id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null,
  type text not null check (type in ('revenue_threshold', 'growth_threshold', 'consistency', 'coming_soon')),
  target numeric not null,
  reward_achievement_id text references achievements (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  challenge_id uuid not null references challenges (id) on delete cascade,
  progress numeric not null default 0,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

-- =========================================================================
-- LEADERBOARD SNAPSHOTS — periodic rank captures, used for movement deltas
-- =========================================================================
create table leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  season_id uuid references seasons (id) on delete cascade,
  scope text not null check (scope in ('global', 'country', 'category')),
  -- '' for the global scope; Postgres unique constraints treat NULL as
  -- distinct-from-NULL, which would defeat the ON CONFLICT dedup below.
  scope_value text not null default '',
  rank int not null,
  -- Null when the user's privacy setting is "private" — rank and growth
  -- are still meaningful without ever exposing the underlying amount.
  revenue_cents bigint,
  growth_percent numeric,
  snapshot_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, season_id, scope, scope_value, snapshot_date)
);

create index leaderboard_snapshots_lookup_idx
  on leaderboard_snapshots (season_id, scope, scope_value, snapshot_date);

-- =========================================================================
-- updated_at triggers
-- =========================================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger businesses_set_updated_at before update on businesses
  for each row execute function set_updated_at();
create trigger revenue_sources_set_updated_at before update on revenue_sources
  for each row execute function set_updated_at();
create trigger verifications_set_updated_at before update on verifications
  for each row execute function set_updated_at();
create trigger privacy_settings_set_updated_at before update on privacy_settings
  for each row execute function set_updated_at();
create trigger user_challenges_set_updated_at before update on user_challenges
  for each row execute function set_updated_at();

-- =========================================================================
-- New user bootstrap: create profile row + default privacy settings
-- Triggered from application code after auth.users insert (see auth
-- service), but we also guard with a trigger so no user is ever left
-- without a privacy_settings row.
-- =========================================================================
create or replace function ensure_privacy_settings()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into privacy_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profiles_ensure_privacy_settings after insert on profiles
  for each row execute function ensure_privacy_settings();

-- =========================================================================
-- Founding member numbering (first N profiles, configurable via app)
-- =========================================================================
create or replace function assign_founding_member_number()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  next_number int;
  member_limit int := 500;
begin
  select coalesce(max(founding_member_number), 0) + 1 into next_number from profiles;
  if next_number <= member_limit then
    new.founding_member_number := next_number;
  end if;
  return new;
end;
$$;

create trigger profiles_assign_founding_number before insert on profiles
  for each row execute function assign_founding_member_number();

-- ============================================================
-- 20260101000002_rls.sql
-- ============================================================
-- Row Level Security policies.
-- Principle: users can only ever write their own rows. Public identity
-- data (profile, business, achievements, trophies) is readable by anyone.
-- Financial data (revenue_sources, verifications, revenue_snapshots) is
-- readable only by its owner — public display goes through the
-- security-definer RPCs in 20260101000004_functions.sql instead, which
-- apply privacy_settings before returning anything.

alter table profiles enable row level security;
alter table businesses enable row level security;
alter table revenue_sources enable row level security;
alter table verifications enable row level security;
alter table revenue_snapshots enable row level security;
alter table privacy_settings enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table trophies enable row level security;
alter table user_trophies enable row level security;
alter table challenges enable row level security;
alter table user_challenges enable row level security;
alter table seasons enable row level security;
alter table leaderboard_snapshots enable row level security;

-- PROFILES: public read, owner write
create policy "profiles are publicly readable" on profiles
  for select using (true);
create policy "users can insert their own profile" on profiles
  for insert with check (auth.uid() = id);
create policy "users can update their own profile" on profiles
  for update using (auth.uid() = id);

-- BUSINESSES: public read, owner write
create policy "businesses are publicly readable" on businesses
  for select using (true);
create policy "users can manage their own business" on businesses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- REVENUE SOURCES: owner only
create policy "users can view their own revenue sources" on revenue_sources
  for select using (auth.uid() = user_id);
create policy "users can manage their own revenue sources" on revenue_sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- VERIFICATIONS: owner only (joined through revenue_sources)
create policy "users can view their own verifications" on verifications
  for select using (
    exists (
      select 1 from revenue_sources rs
      where rs.id = verifications.revenue_source_id and rs.user_id = auth.uid()
    )
  );

-- REVENUE SNAPSHOTS: owner only
create policy "users can view their own revenue snapshots" on revenue_snapshots
  for select using (auth.uid() = user_id);

-- PRIVACY SETTINGS: owner only
create policy "users can view their own privacy settings" on privacy_settings
  for select using (auth.uid() = user_id);
create policy "users can update their own privacy settings" on privacy_settings
  for update using (auth.uid() = user_id);

-- ACHIEVEMENTS / TROPHIES catalogs: public read
create policy "achievements are publicly readable" on achievements
  for select using (true);
create policy "trophies are publicly readable" on trophies
  for select using (true);

-- USER ACHIEVEMENTS / TROPHIES: public read (collectible, shown on profile)
create policy "user achievements are publicly readable" on user_achievements
  for select using (true);
create policy "user trophies are publicly readable" on user_trophies
  for select using (true);

-- SEASONS: public read
create policy "seasons are publicly readable" on seasons
  for select using (true);

-- CHALLENGES: public read
create policy "challenges are publicly readable" on challenges
  for select using (true);

-- USER CHALLENGES: owner only
create policy "users can view their own challenge progress" on user_challenges
  for select using (auth.uid() = user_id);

-- LEADERBOARD SNAPSHOTS: public read (rank is not sensitive on its own;
-- revenue_cents is written null unless the owner's privacy_settings allow
-- exact display — see capture_leaderboard_snapshot).
create policy "leaderboard snapshots are publicly readable" on leaderboard_snapshots
  for select using (true);

-- ============================================================
-- 20260101000003_functions.sql
-- ============================================================
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

-- ============================================================
-- 20260101000004_seed_catalog.sql
-- ============================================================
-- Static product catalog: achievements, trophies, the current season and
-- its challenges. This is real product configuration, not demo data.

insert into achievements (id, name, description, icon, rarity, criteria) values
  ('first-verified-revenue', 'First Verified Revenue', 'Connected and verified your first revenue source.', 'check-circle', 'common', '{"type":"verification"}'),
  ('revenue-1k', '€1K Month', 'Reached €1,000 in monthly revenue.', 'trending-up', 'common', '{"type":"revenue_threshold","cents":100000}'),
  ('revenue-5k', '€5K Month', 'Reached €5,000 in monthly revenue.', 'trending-up', 'common', '{"type":"revenue_threshold","cents":500000}'),
  ('revenue-10k', '€10K Month', 'Reached €10,000 in monthly revenue.', 'trending-up', 'rare', '{"type":"revenue_threshold","cents":1000000}'),
  ('revenue-25k', '€25K Month', 'Reached €25,000 in monthly revenue.', 'trending-up', 'rare', '{"type":"revenue_threshold","cents":2500000}'),
  ('revenue-50k', '€50K Month', 'Reached €50,000 in monthly revenue.', 'trending-up', 'epic', '{"type":"revenue_threshold","cents":5000000}'),
  ('revenue-100k', '€100K Month', 'Reached €100,000 in monthly revenue.', 'trending-up', 'legendary', '{"type":"revenue_threshold","cents":10000000}'),
  ('top-100', 'Top 100', 'Ranked in the global top 100.', 'medal', 'rare', '{"type":"rank_threshold","rank":100}'),
  ('top-50', 'Top 50', 'Ranked in the global top 50.', 'medal', 'epic', '{"type":"rank_threshold","rank":50}'),
  ('top-10', 'Top 10', 'Ranked in the global top 10.', 'medal', 'legendary', '{"type":"rank_threshold","rank":10}'),
  ('founding-member', 'Founding Member', 'Joined ASCEND during the founding cohort.', 'gem', 'epic', '{"type":"founding_member"}');

insert into trophies (id, name, description, icon) values
  ('global-1', 'Global #1', 'Ranked #1 worldwide on ASCEND.', 'crown'),
  ('category-champion', 'Category Champion', 'Ranked #1 in your business category.', 'shield'),
  ('founder-of-the-month', 'Founder of the Month', 'Highest growth of the month.', 'star'),
  ('growth-champion', 'Growth Champion', 'Fastest-growing founder of the season.', 'flame'),
  ('revenue-100k-trophy', '€100K Month', 'Crossed €100,000 in monthly revenue.', 'trophy'),
  ('founding-member-trophy', 'Founding Member', 'One of ASCEND''s first 500 members.', 'gem');

insert into seasons (number, name, label, starts_at, ends_at, is_active) values
  (1, 'ASCEND SEASON 01', 'September 2026', '2026-09-01T00:00:00Z', '2026-11-30T23:59:59Z', true);

insert into challenges (season_id, slug, title, description, type, target, reward_achievement_id, starts_at, ends_at)
select
  s.id, v.slug, v.title, v.description, v.type, v.target, v.reward_achievement_id, s.starts_at, s.ends_at
from seasons s
cross join (values
  ('first-10k-month', 'First €10K Month', 'Reach €10,000 in monthly revenue for the first time.', 'revenue_threshold', 1000000, 'revenue-10k'),
  ('growth-30', '+30% Growth', 'Grow your monthly revenue by 30% or more.', 'growth_threshold', 30, null),
  ('consistency-30', '30-Day Consistency', 'Keep your revenue source connected and verified for 30 days straight.', 'consistency', 30, null),
  ('international-customer', 'First International Customer', 'Coming soon.', 'coming_soon', 1, null),
  ('launch-something-new', 'Launch Something New', 'Coming soon.', 'coming_soon', 1, null)
) as v(slug, title, description, type, target, reward_achievement_id)
where s.is_active = true;

-- ============================================================
-- 20260101000005_fr_localization.sql
-- ============================================================
-- Localizes the product catalog to French. Written as UPDATEs (not a
-- rewrite of 20260101000004_seed_catalog.sql) so this applies cleanly
-- whether or not that seed has already run against a given database.

update achievements set name = 'Premiers revenus vérifiés', description = 'Tu as connecté et vérifié ta première source de revenus.' where id = 'first-verified-revenue';
update achievements set name = '1K mensuels', description = 'Tu as atteint 1 000 € de revenus mensuels.' where id = 'revenue-1k';
update achievements set name = '5K mensuels', description = 'Tu as atteint 5 000 € de revenus mensuels.' where id = 'revenue-5k';
update achievements set name = '10K mensuels', description = 'Tu as atteint 10 000 € de revenus mensuels.' where id = 'revenue-10k';
update achievements set name = '25K mensuels', description = 'Tu as atteint 25 000 € de revenus mensuels.' where id = 'revenue-25k';
update achievements set name = '50K mensuels', description = 'Tu as atteint 50 000 € de revenus mensuels.' where id = 'revenue-50k';
update achievements set name = '100K mensuels', description = 'Tu as atteint 100 000 € de revenus mensuels.' where id = 'revenue-100k';
update achievements set name = 'Top 100', description = 'Tu es classé dans le top 100 mondial.' where id = 'top-100';
update achievements set name = 'Top 50', description = 'Tu es classé dans le top 50 mondial.' where id = 'top-50';
update achievements set name = 'Top 10', description = 'Tu es classé dans le top 10 mondial.' where id = 'top-10';
update achievements set name = 'Membre fondateur', description = 'Tu as rejoint ASCEND parmi la cohorte fondatrice.' where id = 'founding-member';

update trophies set name = '#1 mondial', description = 'Classé #1 mondial sur ASCEND.' where id = 'global-1';
update trophies set name = 'Champion de catégorie', description = 'Classé #1 dans ta catégorie d''activité.' where id = 'category-champion';
update trophies set name = 'Fondateur du mois', description = 'Plus forte croissance du mois.' where id = 'founder-of-the-month';
update trophies set name = 'Growth Champion', description = 'Croissance la plus rapide de la saison.' where id = 'growth-champion';
update trophies set name = '100K mensuels', description = 'Tu as franchi 100 000 € de revenus mensuels.' where id = 'revenue-100k-trophy';
update trophies set name = 'Membre fondateur', description = 'Un des 500 premiers membres d''ASCEND.' where id = 'founding-member-trophy';

update seasons set name = 'ASCEND SAISON 01', label = 'Septembre 2026' where number = 1;

update challenges set title = 'Premier 10K', description = 'Atteins 10 000 € de revenus mensuels pour la première fois.' where slug = 'first-10k-month';
update challenges set title = '+30 % de croissance', description = 'Fais croître tes revenus mensuels d''au moins 30 %.' where slug = 'growth-30';
update challenges set title = '30 jours de régularité', description = 'Garde ta source de revenus connectée et vérifiée pendant 30 jours d''affilée.' where slug = 'consistency-30';
update challenges set title = 'Premier client international', description = 'Bientôt disponible — suis ton premier client hors de ton pays.' where slug = 'international-customer';
update challenges set title = 'Nouveau lancement', description = 'Bientôt disponible — enregistre le lancement d''un nouveau produit ou d''une fonctionnalité.' where slug = 'launch-something-new';

-- ============================================================
-- 20260101000006_notifications.sql
-- ============================================================
-- Notifications: achievement unlocks, rank movement, challenges, milestones,
-- verification events. Always generated server-side from a real event —
-- never fabricated client-side.

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null check (
    type in ('achievement_unlocked', 'rank_increased', 'challenge_started', 'milestone_reached', 'verification_completed')
  ),
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on notifications (user_id, created_at desc);

alter table notifications enable row level security;

create policy "users can view their own notifications" on notifications
  for select using (auth.uid() = user_id);

-- A user may only ever create a notification for themselves, and only as a
-- side effect of their own action (e.g. their own Stripe sync unlocking an
-- achievement) — never for another user. Harmless even if imitated: it
-- can't grant anything, only add a row to their own notification feed.
create policy "users can insert their own notifications" on notifications
  for insert with check (auth.uid() = user_id);

create policy "users can mark their own notifications as read" on notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Rank-movement notifications are produced in bulk, for every user, by the
-- trusted snapshot job — only the service role may do that directly.
grant insert on notifications to service_role;

-- Extend the snapshot job to notify a user the first time their global
-- rank improves versus the last captured snapshot.
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
  previous_rank int;
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
      if pair[1] = 'global' then
        select ls.rank into previous_rank
        from leaderboard_snapshots ls
        where ls.user_id = rec.user_id and ls.scope = 'global' and ls.scope_value = ''
        order by ls.snapshot_date desc
        limit 1;

        if previous_rank is not null and rec.rank < previous_rank then
          insert into notifications (user_id, type, title, body, metadata)
          values (
            rec.user_id,
            'rank_increased',
            'Tu progresses au classement',
            'Tu es passé de la position #' || previous_rank || ' à #' || rec.rank || '.',
            jsonb_build_object('previous_rank', previous_rank, 'new_rank', rec.rank)
          );
        end if;
      end if;

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

revoke all on function capture_leaderboard_snapshot(date) from public;
grant execute on function capture_leaderboard_snapshot(date) to service_role;

-- ============================================================
-- 20260101000007_titles.sql
-- ============================================================
-- Collectible profile titles. "Earned" titles mirror achievements (free,
-- unlocked by meeting a requirement). "Exclusive" titles are extremely
-- limited paid collectibles (e.g. 1 of 1) — ownership of those can ONLY be
-- granted through purchase_exclusive_title() below, never through a direct
-- client insert, so scarcity is enforced by the database itself.

create table titles (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary', 'exclusive')),
  type text not null check (type in ('earned', 'purchasable')),
  price_cents int,
  supply int,
  remaining_supply int,
  requirement jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table user_titles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  title_id text not null references titles (id) on delete cascade,
  acquired_at timestamptz not null default now(),
  acquisition_type text not null check (acquisition_type in ('earned', 'purchased')),
  is_active boolean not null default false,
  unique (user_id, title_id)
);

-- Only one active (displayed-on-profile) title per user.
create unique index user_titles_one_active_per_user on user_titles (user_id) where is_active;

alter table titles enable row level security;
alter table user_titles enable row level security;

create policy "titles catalog is publicly readable" on titles
  for select using (true);

create policy "user titles are publicly readable" on user_titles
  for select using (true);

-- Earned titles can be self-claimed once the client-side UI believes the
-- requirement is met (defense in depth only — the real grant happens
-- server-side via title.service.ts during achievement/rank evaluation).
-- Purchasable/exclusive titles are excluded entirely: no client, however
-- authenticated, can insert ownership of one directly.
create policy "users can claim their own earned titles" on user_titles
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from titles t where t.id = title_id and t.type = 'earned')
  );

create policy "users can change which of their titles is active" on user_titles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Atomically grants an exclusive title and decrements its remaining supply.
-- Fails (returns false) once supply is exhausted — this is the only path
-- that can ever create ownership of a purchasable title, so scarcity can
-- never be bypassed from the client.
create or replace function purchase_exclusive_title(p_title_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update titles
  set remaining_supply = remaining_supply - 1
  where id = p_title_id
    and type = 'purchasable'
    and remaining_supply is not null
    and remaining_supply > 0;

  get diagnostics updated_rows = row_count;
  if updated_rows = 0 then
    return false;
  end if;

  insert into user_titles (user_id, title_id, acquisition_type)
  values (auth.uid(), p_title_id, 'purchased')
  on conflict (user_id, title_id) do nothing;

  return true;
end;
$$;

grant execute on function purchase_exclusive_title(text) to authenticated;

insert into titles (id, name, description, icon, rarity, type, requirement) values
  ('founding-member', 'Membre fondateur', 'Un des 500 premiers membres d''ASCEND.', 'gem', 'epic', 'earned', '{"type":"founding_member"}'),
  ('top-100', 'Top 100', 'Classé dans le top 100 mondial.', 'medal', 'rare', 'earned', '{"type":"rank_threshold","rank":100}'),
  ('top-50', 'Top 50', 'Classé dans le top 50 mondial.', 'medal', 'epic', 'earned', '{"type":"rank_threshold","rank":50}'),
  ('top-10', 'Top 10', 'Classé dans le top 10 mondial.', 'medal', 'legendary', 'earned', '{"type":"rank_threshold","rank":10}'),
  ('growth-machine', 'Growth Machine', 'Croissance mensuelle de plus de 30 %.', 'flame', 'epic', 'earned', '{"type":"growth_threshold","percent":30}'),
  ('100k-club', '100K Club', 'A franchi 100 000 € de revenus mensuels.', 'trophy', 'legendary', 'earned', '{"type":"revenue_threshold","cents":10000000}'),
  ('the-builder', 'The Builder', 'A vérifié sa première source de revenus.', 'hammer', 'common', 'earned', '{"type":"verification"}'),
  ('the-operator', 'The Operator', '30 jours de revenus vérifiés sans interruption.', 'settings', 'rare', 'earned', '{"type":"consistency","days":30}');

insert into titles (id, name, description, icon, rarity, type, price_cents, supply, remaining_supply, requirement) values
  ('the-business-man', 'The Business Man', 'Un titre unique. Une seule personne au monde le portera.', 'crown', 'exclusive', 'purchasable', 50000, 1, 1, '{}');

-- ============================================================
-- 20260101000008_subscriptions.sql
-- ============================================================
-- Subscription tier is tracked independently of authentication: a user is
-- always either authenticated or not, and separately always on some plan
-- (free by default). This table is what settings/pricing read from — it is
-- never inferred from whether the user is merely logged in.

create table subscriptions (
  user_id uuid primary key references profiles (id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro', 'elite')),
  status text not null default 'active' check (status in ('active', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy "users can view their own subscription" on subscriptions
  for select using (auth.uid() = user_id);

create trigger subscriptions_set_updated_at before update on subscriptions
  for each row execute function set_updated_at();

-- Every new profile starts on the free tier, same pattern as privacy_settings.
create or replace function ensure_subscription()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profiles_ensure_subscription after insert on profiles
  for each row execute function ensure_subscription();

-- ============================================================
-- 20260101000009_founder_title.sql
-- ============================================================
-- Adds "The Fondator" to the title catalog — an exclusive, manually
-- granted title reserved for ASCEND's own creator. Not tied to an
-- automatic requirement (no computable "founded the platform" event),
-- so it is never auto-granted by title.service.ts; ownership is assigned
-- directly, once, to a specific account.

insert into titles (id, name, description, icon, rarity, type, requirement) values
  ('the-fondator', 'The Fondator', 'A construit ASCEND depuis le tout premier jour.', 'crown', 'exclusive', 'earned', '{"type":"manual"}');

-- ============================================================
-- 20260101000010_fix_ambiguous_column.sql
-- ============================================================
-- Fixes "column reference \"user_id\" is ambiguous" in get_public_profile.
-- The show_country subquery's unqualified `user_id` collided with the
-- outer query's `businesses b` table, which also has a user_id column —
-- Postgres refuses to guess which one was meant. Qualifying it with the
-- subquery's own table name resolves it.

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

-- ============================================================
-- 20260101000011_leaderboard_range.sql
-- ============================================================
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

-- ============================================================
-- 20260101000012_affordable_titles.sql
-- ============================================================
-- Two purchasable titles below "The Business Man" (1 of 1, 500€) in both
-- price and rarity, so there's an accessible tier between free/earned
-- titles and the flagship exclusive one. No real payment is wired up yet
-- (see purchase_exclusive_title), so these stay "Bientôt disponible" in
-- the UI until Stripe Checkout exists for one-off purchases.

insert into titles (id, name, description, icon, rarity, type, price_cents, supply, remaining_supply, requirement) values
  ('the-insider', 'The Insider', 'Un cercle restreint de fondateurs ASCEND.', 'gem', 'epic', 'purchasable', 5000, 50, 50, '{}'),
  ('the-ambitious', 'The Ambitious', 'Affiche ton ambition sur ton profil ASCEND.', 'medal', 'rare', 'purchasable', 1500, 200, 200, '{}');

-- ============================================================
-- 20260101000013_founding_member_supply.sql
-- ============================================================
-- Gives the "Membre fondateur" title real, database-tracked scarcity.
-- assign_founding_member_number() already caps founding numbers at 500,
-- but nothing decremented titles.remaining_supply for it, so the
-- "X / 500 exemplaires" UI (built for purchasable titles) never reflected
-- the real countdown. This backfills the current count and keeps it live
-- going forward via a trigger on user_titles, mirroring the pattern
-- purchase_exclusive_title() already uses for paid titles.

update titles
set supply = 500,
    remaining_supply = greatest(500 - (select count(*) from profiles where founding_member_number is not null), 0)
where id = 'founding-member';

create or replace function decrement_founding_member_supply()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.title_id = 'founding-member' then
    update titles
    set remaining_supply = greatest(remaining_supply - 1, 0)
    where id = 'founding-member' and remaining_supply is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists user_titles_decrement_founding_supply on user_titles;
create trigger user_titles_decrement_founding_supply after insert on user_titles
  for each row execute function decrement_founding_member_supply();

-- ============================================================
-- 20260101000014_billing_and_themes.sql
-- ============================================================
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

-- ============================================================
-- 20260101000015_admin_roles.sql
-- ============================================================
-- Platform admins: full-trust operators who can manage any user's
-- subscription tier and promote/demote other admins. A boolean is enough
-- since every admin has identical rights (no hierarchy) — see the app's
-- admin server actions for the actual authorization checks, which always
-- go through the service-role client (subscriptions has no RLS policy
-- letting one user write another's row, by design).

alter table profiles add column is_admin boolean not null default false;

-- ============================================================
-- 20260101000016_network.sql
-- ============================================================
-- Foundations for a real Réseau: a city to search/filter by, and a
-- follow graph (Instagram-style — follower/followee, no approval needed
-- to follow someone, mirroring how the future messaging "you can message
-- freely once you follow each other" rule will read this same table).

alter table profiles add column city text;

create table follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  followee_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_idx on follows (followee_id);

alter table follows enable row level security;

create policy "follows are publicly readable" on follows
  for select using (true);

create policy "users can manage their own follows" on follows
  for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- ============================================================
-- 20260101000017_messaging.sql
-- ============================================================
-- Instagram-style messaging: a conversation starts "pending" and the
-- requester gets exactly one message before the recipient has replied
-- or explicitly accepted — unless the two already follow each other
-- mutually, in which case it's a normal conversation from the start.
-- The one-message cap itself is enforced in message.service.ts (it
-- needs to read the follows table), not here; RLS only enforces that
-- you can only act within conversations you're a participant of.

create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles (id) on delete cascade,
  user_b uuid not null references profiles (id) on delete cascade,
  requested_by uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create index conversations_user_a_idx on conversations (user_a);
create index conversations_user_b_idx on conversations (user_b);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_conversation_idx on messages (conversation_id, created_at);

alter table conversations enable row level security;
alter table messages enable row level security;

create policy "participants can view their conversations" on conversations
  for select using (auth.uid() = user_a or auth.uid() = user_b);

create policy "participants can create a conversation" on conversations
  for insert with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "participants can update their conversations" on conversations
  for update using (auth.uid() = user_a or auth.uid() = user_b);

create policy "participants can view messages in their conversations" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "participants can send messages in their conversations" on messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "participants can mark messages as read" on messages
  for update using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create trigger conversations_set_updated_at before update on conversations
  for each row execute function set_updated_at();

-- ============================================================
-- 20260101000018_notification_types.sql
-- ============================================================
-- Adds notification types for two events that previously produced no
-- notification at all: gaining a follower, and receiving a message.

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (
    type in (
      'achievement_unlocked', 'rank_increased', 'challenge_started',
      'milestone_reached', 'verification_completed', 'new_follower', 'new_message'
    )
  );

-- ============================================================
-- 20260101000019_title_purchases.sql
-- ============================================================
-- Wires purchasable titles up to real Stripe payments, and fixes the
-- founding-member counter never moving.

-- 1. Real payments for purchasable titles ------------------------------
-- purchase_exclusive_title() let ANY authenticated user claim a title for
-- free by calling the RPC directly (nothing enforced payment — it relied
-- entirely on the client-side button being disabled). Now that titles are
-- genuinely for sale, that's an actual free-claim exploit, so it's revoked.
-- grant_purchased_title() replaces it: callable only by the service role,
-- only from the Stripe webhook after a real Checkout Session has been
-- paid. It's idempotent (a webhook can be delivered more than once) — a
-- user who already owns the title short-circuits to success without
-- decrementing supply again.

revoke execute on function purchase_exclusive_title(text) from authenticated;

alter table titles add column stripe_price_id text;

create or replace function grant_purchased_title(p_user_id uuid, p_title_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows int;
begin
  if exists (select 1 from user_titles where user_id = p_user_id and title_id = p_title_id) then
    return true;
  end if;

  update titles
  set remaining_supply = remaining_supply - 1
  where id = p_title_id
    and type = 'purchasable'
    and remaining_supply is not null
    and remaining_supply > 0;

  get diagnostics updated_rows = row_count;
  if updated_rows = 0 then
    return false;
  end if;

  insert into user_titles (user_id, title_id, acquisition_type)
  values (p_user_id, p_title_id, 'purchased')
  on conflict (user_id, title_id) do nothing;

  return true;
end;
$$;

revoke all on function grant_purchased_title(uuid, text) from public, authenticated, anon;
grant execute on function grant_purchased_title(uuid, text) to service_role;

-- 2. Fix the founding-member counter ------------------------------------
-- remaining_supply for 'founding-member' was only ever decremented when
-- the ACHIEVEMENT/title itself got granted (via a trigger on user_titles
-- insert) — but that only happens during a Stripe revenue sync. The real
-- 500-slot cap is actually consumed at SIGNUP time, by
-- assign_founding_member_number(). The two never matched, so the counter
-- froze at 498 as soon as it was seeded, no matter how many people joined.
-- Fix: decrement directly in assign_founding_member_number() instead, and
-- drop the old (now redundant, and wrongly-timed) trigger.

drop trigger if exists user_titles_decrement_founding_supply on user_titles;
drop function if exists decrement_founding_member_supply();

create or replace function assign_founding_member_number()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  next_number int;
  member_limit int := 500;
begin
  select coalesce(max(founding_member_number), 0) + 1 into next_number from profiles;
  if next_number <= member_limit then
    new.founding_member_number := next_number;
    update titles
    set remaining_supply = greatest(remaining_supply - 1, 0)
    where id = 'founding-member' and remaining_supply is not null;
  end if;
  return new;
end;
$$;

-- One-time resync to the true current count (recomputes from scratch
-- rather than trusting whatever the frozen counter drifted to).
update titles
set remaining_supply = greatest(500 - (select count(*) from profiles where founding_member_number is not null), 0)
where id = 'founding-member';

-- ============================================================
-- 20260101000020_remove_fondator_title.sql
-- ============================================================
-- Removes "The Fondator" as a collectible title — the only thing that
-- should show a founder's real signup order is "Membre fondateur" (with
-- its number). The "creator of ASCEND" fact is now tracked as its own
-- flag rather than piggybacking on a title, decoupling it from the
-- title/collectible system and from admin permissions (which now rely
-- solely on profiles.is_admin, set directly per person).

delete from user_titles where title_id = 'the-fondator';
delete from titles where id = 'the-fondator';

alter table profiles add column is_cofounder boolean not null default false;

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
  accent_theme text,
  is_cofounder boolean
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
    target.accent_theme,
    target.is_cofounder
  from businesses b
  where b.user_id = target.id;
end;
$$;

grant execute on function get_public_profile(text) to anon, authenticated;

-- ============================================================
-- 20260101000021_verification_fixes.sql
-- ============================================================
-- Fixes two bugs found while debugging a false "Vérifié" badge:
--
-- 1. `verifications` only ever had a SELECT policy — no INSERT or UPDATE
--    policy existed, so every write from stripe.service.ts (running as the
--    authenticated user, not the service role) was silently rejected by
--    RLS. Supabase's upsert()/update() don't throw on a rejected write
--    unless the caller checks `.error`, which this code never did, so the
--    table has been empty for every user since the feature was built —
--    getVerificationStatus() always fell back to "unverified" regardless
--    of what actually happened during a sync.
--
-- 2. profiles.revenue_verified was set to true whenever the Stripe API
--    call succeeded, even with zero charges returned — "the request didn't
--    error" isn't the same as "revenue was verified". Fixed in
--    stripe.service.ts; this migration only covers the RLS gap and
--    resets any profile that got marked verified with no backing data.

create policy "users can create verifications for their own sources" on verifications
  for insert with check (
    exists (
      select 1 from revenue_sources rs
      where rs.id = verifications.revenue_source_id and rs.user_id = auth.uid()
    )
  );

create policy "users can update verifications for their own sources" on verifications
  for update using (
    exists (
      select 1 from revenue_sources rs
      where rs.id = verifications.revenue_source_id and rs.user_id = auth.uid()
    )
  );

-- Clear the false-positive: verified with no revenue_snapshots at all.
update profiles
set revenue_verified = false
where revenue_verified = true
  and id not in (select distinct user_id from revenue_snapshots);

-- ============================================================
-- 20260101000022_test_title.sql
-- ============================================================
-- A cheap (1€), unlimited-supply purchasable title — lets a real end-to-end
-- purchase be tested (checkout → webhook → grant_purchased_title) for
-- one euro instead of risking a real purchase on one of the higher-priced,
-- limited-supply titles.

insert into titles (id, name, description, icon, rarity, type, price_cents, supply, remaining_supply, requirement) values
  ('the-spark', 'The Spark', 'Le premier pas sur ASCEND.', 'flame', 'common', 'purchasable', 100, null, null, '{}');

-- ============================================================
-- 20260101000023_fix_unlimited_title_purchase.sql
-- ============================================================
-- grant_purchased_title() required remaining_supply to be non-null before
-- granting anything — which silently rejected every purchase of an
-- unlimited-supply title (remaining_supply is null by design, e.g. "The
-- Spark"). The webhook still returned 200 to Stripe (payment genuinely
-- succeeded), so the failure was invisible: no error anywhere, just no
-- title. Fixed to treat "unlimited" as always eligible, only touching
-- remaining_supply when the title actually has a finite one.

create or replace function grant_purchased_title(p_user_id uuid, p_title_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_eligible boolean;
begin
  if exists (select 1 from user_titles where user_id = p_user_id and title_id = p_title_id) then
    return true;
  end if;

  select (type = 'purchasable' and (remaining_supply is null or remaining_supply > 0))
    into is_eligible
  from titles
  where id = p_title_id;

  if is_eligible is not true then
    return false;
  end if;

  update titles
  set remaining_supply = remaining_supply - 1
  where id = p_title_id
    and remaining_supply is not null
    and remaining_supply > 0;

  insert into user_titles (user_id, title_id, acquisition_type)
  values (p_user_id, p_title_id, 'purchased')
  on conflict (user_id, title_id) do nothing;

  return true;
end;
$$;

-- ============================================================
-- 20260101000024_more_rls_gaps.sql
-- ============================================================
-- Same missing-INSERT/UPDATE-policy bug as verifications, found by actually
-- exercising a real sync end to end: revenue_snapshots, user_achievements
-- and user_challenges only ever had SELECT policies. Every write from the
-- sync path (upsertMonthlyRevenue, evaluateRevenueAchievements,
-- evaluateRankAchievements, evaluateChallengeProgress) runs as the
-- authenticated user, not the service role, and would have been rejected
-- by RLS the moment it got past the earlier bugs already fixed this
-- session — revenue_snapshots is the one that actually surfaced, because
-- unlike the others it checks its error and throws instead of swallowing
-- it silently.

create policy "users can create their own revenue snapshots" on revenue_snapshots
  for insert with check (auth.uid() = user_id);

create policy "users can update their own revenue snapshots" on revenue_snapshots
  for update using (auth.uid() = user_id);

create policy "users can create their own achievement records" on user_achievements
  for insert with check (auth.uid() = user_id);

create policy "users can update their own achievement records" on user_achievements
  for update using (auth.uid() = user_id);

create policy "users can create their own challenge progress" on user_challenges
  for insert with check (auth.uid() = user_id);

create policy "users can update their own challenge progress" on user_challenges
  for update using (auth.uid() = user_id);

-- ============================================================
-- 20260101000025_beginner_challenges.sql
-- ============================================================
-- Every existing challenge assumed real revenue was already flowing
-- (first 10K€, +30% growth...) — nothing recognized an entrepreneur who
-- hasn't sold anything yet. Adds a beginner ladder: first sale, then
-- 100€/500€/1000€, for every currently active season.

insert into challenges (season_id, slug, title, description, type, target, reward_achievement_id, starts_at, ends_at)
select
  s.id, v.slug, v.title, v.description, v.type, v.target, v.reward_achievement_id, s.starts_at, s.ends_at
from seasons s
cross join (values
  ('first-sale', 'Première vente', 'Réalise ta toute première vente vérifiée sur ASCEND.', 'revenue_threshold', 1, null),
  ('first-100', 'Premiers 100 €', 'Atteins 100 € de revenus mensuels vérifiés.', 'revenue_threshold', 10000, null),
  ('first-500', 'Premiers 500 €', 'Atteins 500 € de revenus mensuels vérifiés.', 'revenue_threshold', 50000, null),
  ('first-1000', 'Premiers 1 000 €', 'Atteins 1 000 € de revenus mensuels vérifiés.', 'revenue_threshold', 100000, null)
) as v(slug, title, description, type, target, reward_achievement_id)
where s.is_active = true;

-- ============================================================
-- 20260101000026_opportunities.sql
-- ============================================================
-- Real Opportunités: a searchable marketplace (cofondateur, dev, partenaire,
-- growth, freelance, investisseur...) with a dedicated application flow
-- (not the messaging system — a real accept/decline/viewed status per
-- candidature). Anyone can publish; browsing the catalog stays an Elite
-- perk, enforced in the app layer (mirrors how Réseau search is already
-- gated: RLS here stays permissive so an author can always see and manage
-- their own posts regardless of tier).

alter table profiles add column skills text[] not null default '{}';

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  type text not null check (type in ('cofounder', 'developer', 'partner', 'growth', 'freelance', 'investor', 'other')),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 20 and 3000),
  category text, -- business category this opportunity relates to; null = any
  compensation_type text not null check (compensation_type in ('equity', 'paid', 'both', 'unpaid')),
  location_type text not null check (location_type in ('remote', 'onsite', 'hybrid')),
  city text,
  country text,
  skills text[] not null default '{}',
  target_stage text not null default 'any' check (target_stage in ('any', 'pre_revenue', 'early', 'growth', 'scale')),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index opportunities_status_idx on opportunities (status, created_at desc);
create index opportunities_author_idx on opportunities (author_id);

create table opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities (id) on delete cascade,
  applicant_id uuid not null references profiles (id) on delete cascade,
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending', 'viewed', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, applicant_id)
);

create index opportunity_applications_opportunity_idx on opportunity_applications (opportunity_id);
create index opportunity_applications_applicant_idx on opportunity_applications (applicant_id);

alter table opportunities enable row level security;
alter table opportunity_applications enable row level security;

create policy "opportunities are publicly readable" on opportunities
  for select using (true);

create policy "members can publish opportunities" on opportunities
  for insert with check (auth.uid() = author_id);

create policy "authors can update their own opportunities" on opportunities
  for update using (auth.uid() = author_id);

create policy "applicants and authors can view relevant applications" on opportunity_applications
  for select using (
    auth.uid() = applicant_id
    or exists (select 1 from opportunities o where o.id = opportunity_id and o.author_id = auth.uid())
  );

-- Applying is an Elite perk (mirrors the Découvrir catalog itself being
-- Elite-gated in the UI) — enforced here too so it can't be bypassed by
-- calling the API directly.
create policy "elite members can apply to opportunities" on opportunity_applications
  for insert with check (
    auth.uid() = applicant_id
    and exists (select 1 from subscriptions s where s.user_id = auth.uid() and s.tier = 'elite' and s.status = 'active')
  );

create policy "authors can update applications to their opportunities" on opportunity_applications
  for update using (
    exists (select 1 from opportunities o where o.id = opportunity_id and o.author_id = auth.uid())
  );

create trigger opportunities_set_updated_at before update on opportunities
  for each row execute function set_updated_at();

create trigger opportunity_applications_set_updated_at before update on opportunity_applications
  for each row execute function set_updated_at();

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (
    type in (
      'achievement_unlocked', 'rank_increased', 'challenge_started',
      'milestone_reached', 'verification_completed', 'new_follower', 'new_message',
      'new_application', 'application_status_changed'
    )
  );

-- ============================================================
-- 20260101000027_auto_activate_first_title.sql
-- ============================================================
-- A title nobody ever manually activates never shows up anywhere (profile,
-- leaderboard, network) — most members never think to flip that switch in
-- Titres. grant_purchased_title() now auto-activates a purchase when the
-- buyer has no active title yet (mirrors the same fix already made to the
-- earned-title path in title.service.ts). Also backfills every existing
-- member who owns a title but has none active, activating their oldest one.

create or replace function grant_purchased_title(p_user_id uuid, p_title_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_eligible boolean;
  has_active boolean;
begin
  if exists (select 1 from user_titles where user_id = p_user_id and title_id = p_title_id) then
    return true;
  end if;

  select (type = 'purchasable' and (remaining_supply is null or remaining_supply > 0))
    into is_eligible
  from titles
  where id = p_title_id;

  if is_eligible is not true then
    return false;
  end if;

  update titles
  set remaining_supply = remaining_supply - 1
  where id = p_title_id
    and remaining_supply is not null
    and remaining_supply > 0;

  select exists(select 1 from user_titles where user_id = p_user_id and is_active = true) into has_active;

  insert into user_titles (user_id, title_id, acquisition_type, is_active)
  values (p_user_id, p_title_id, 'purchased', not has_active)
  on conflict (user_id, title_id) do nothing;

  return true;
end;
$$;

with first_title as (
  select distinct on (user_id) user_id, id
  from user_titles
  order by user_id, acquired_at asc
)
update user_titles ut
set is_active = true
from first_title ft
where ut.id = ft.id
  and not exists (
    select 1 from user_titles ut2 where ut2.user_id = ft.user_id and ut2.is_active = true
  );

-- ============================================================
-- 20260101000028_siret_verification.sql
-- ============================================================
-- Business identity verification via the free, public French government
-- registry (recherche-entreprises.api.gouv.fr) — no API key, no cost.
-- Independent of revenue verification: a member can be SIRET-verified,
-- revenue-verified, both, or neither.

alter table businesses add column siret text check (siret ~ '^[0-9]{14}$');
alter table businesses add column legal_name text;
alter table businesses add column siret_verified_at timestamptz;

-- ============================================================
-- 20260101000029_siret_public_profile.sql
-- ============================================================
-- Surfaces SIRET verification (legal_name set once verified) on public
-- profiles, so the "Entreprise vérifiée" badge is visible to other
-- members, not just to the owner in Réglages.

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
    target.accent_theme,
    target.is_cofounder,
    b.legal_name
  from businesses b
  where b.user_id = target.id;
end;
$$;

grant execute on function get_public_profile(text) to anon, authenticated;

-- ============================================================
-- 20260101000030_manual_revenue.sql
-- ============================================================
-- Lets a member without Stripe (or any other unsupported processor) still
-- participate: a monthly self-reported revenue amount, optionally backed
-- by an uploaded proof document, stored as a 'manual' revenue_sources row
-- (a provider the schema already allowed for, but nothing implemented).
-- Kept out of is_verified/revenue_verified on purpose — self-reported
-- numbers stay labeled "Déclaré", distinct from Stripe's "Vérifié",
-- everywhere the app shows that distinction. Whether to fold declared
-- revenue into the public leaderboard is a bigger call left for later.

alter table revenue_snapshots add column proof_path text;

insert into storage.buckets (id, name, public)
values ('revenue-proofs', 'revenue-proofs', false)
on conflict (id) do nothing;

create policy "users can upload their own revenue proofs" on storage.objects
  for insert with check (bucket_id = 'revenue-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can view their own revenue proofs" on storage.objects
  for select using (bucket_id = 'revenue-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can replace their own revenue proofs" on storage.objects
  for update using (bucket_id = 'revenue-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own revenue proofs" on storage.objects
  for delete using (bucket_id = 'revenue-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 20260101000031_revenue_business_metrics.sql
-- ============================================================
-- Stripe's charges.list already returns amount AND customer per charge —
-- the sync loop was only summing amounts and throwing the rest away. No
-- new API calls needed to also track unique customers and transaction
-- count per month, which is what the dashboard needs for "clients" and
-- "panier moyen" beyond the raw revenue figure.

alter table revenue_snapshots add column transaction_count int;
alter table revenue_snapshots add column customer_count int;

-- ============================================================
-- 20260101000032_revenue_review.sql
-- ============================================================
-- Manual revenue declarations now require proof (enforced in the app
-- layer) and go through an admin review queue rather than sitting
-- self-reported forever. Approved declarations are promoted to real
-- verified status (same as Stripe) since a human has now confirmed them —
-- rejected ones stay excluded and the member is told why.

alter table revenue_snapshots add column review_status text check (review_status in ('pending', 'approved', 'rejected'));
alter table revenue_snapshots add column reviewed_at timestamptz;
alter table revenue_snapshots add column reviewed_by uuid references profiles (id);
alter table revenue_snapshots add column rejection_reason text;

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (
    type in (
      'achievement_unlocked', 'rank_increased', 'challenge_started',
      'milestone_reached', 'verification_completed', 'new_follower', 'new_message',
      'new_application', 'application_status_changed', 'revenue_review_completed'
    )
  );

-- ============================================================
-- 20260101000033_opportunities_elite_only_publish.sql
-- ============================================================
-- Publishing an opportunity was open to every member — only the Découvrir
-- catalog was Elite-gated, which let a free member post an ad nobody but
-- Elite members could ever see, and gave them no reason to upgrade. The
-- whole feature is marketed as an Elite perk ("Fil d'opportunités"), so
-- publishing is now gated the same way applying already is.

drop policy "members can publish opportunities" on opportunities;

create policy "elite members can publish opportunities" on opportunities
  for insert with check (
    auth.uid() = author_id
    and exists (select 1 from subscriptions s where s.user_id = auth.uid() and s.tier = 'elite' and s.status = 'active')
  );

-- ============================================================
-- 20260101000034_revenue_declarations.sql
-- ============================================================
-- The previous design stored one manual declaration per (user_id, period)
-- directly on revenue_snapshots — submitting a second contract for the
-- same month silently overwrote the first instead of adding to it. Real
-- entrepreneurs often have several income sources (several contracts,
-- several clients) to declare for the same month.
--
-- revenue_declarations now holds one row per individual declaration, each
-- reviewed independently. The user_id/period aggregate in revenue_snapshots
-- becomes a computed sum of the *approved* declarations for that period —
-- recomputed by the app every time a declaration is submitted or reviewed
-- (see recomputeManualSnapshot in revenue.service.ts) — so a pending or
-- rejected entry never inflates what counts as "Vérifié".

create table revenue_declarations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  period date not null,
  label text,
  amount_cents bigint not null check (amount_cents > 0),
  proof_path text not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles (id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index revenue_declarations_user_period_idx on revenue_declarations (user_id, period desc);
create index revenue_declarations_pending_idx on revenue_declarations (review_status) where review_status = 'pending';

alter table revenue_declarations enable row level security;

create policy "users can view their own revenue declarations" on revenue_declarations
  for select using (auth.uid() = user_id);

create policy "users can create their own revenue declarations" on revenue_declarations
  for insert with check (auth.uid() = user_id);

create trigger revenue_declarations_set_updated_at before update on revenue_declarations
  for each row execute function set_updated_at();

-- Carry forward any declaration made under the old single-entry design
-- before dropping the columns it lived in, so it isn't silently lost.
insert into revenue_declarations (user_id, period, amount_cents, proof_path, review_status, reviewed_at, reviewed_by, rejection_reason, created_at)
select user_id, period, amount_cents, proof_path, review_status, reviewed_at, reviewed_by, rejection_reason, created_at
from revenue_snapshots
where review_status is not null and proof_path is not null;

-- A pending declaration was never meant to count as revenue under the new
-- model (only approved ones do, via recomputeManualSnapshot) — the old
-- design showed it right away, which the row above corrects going forward.
delete from revenue_snapshots where review_status = 'pending';

-- The per-snapshot review columns from the previous single-entry design
-- are superseded by revenue_declarations above.
alter table revenue_snapshots drop column review_status;
alter table revenue_snapshots drop column reviewed_at;
alter table revenue_snapshots drop column reviewed_by;
alter table revenue_snapshots drop column rejection_reason;
alter table revenue_snapshots drop column proof_path;

-- ============================================================
-- 20260101000035_annual_billing_trial.sql
-- ============================================================
-- Annual billing (2 mois offerts sur Pro, 3 mois offerts sur Elite) and a
-- 14-day Elite trial, restricted to members who have never had a paid
-- subscription. trial_used is permanent — it's never reset back to false,
-- even after cancelling, so it can't be farmed by downgrading and
-- re-subscribing.

alter table subscriptions add column billing_interval text check (billing_interval in ('month', 'year'));
alter table subscriptions add column trial_used boolean not null default false;
alter table subscriptions add column trial_ends_at timestamptz;

-- ============================================================
-- 20260101000036_onboarding_tour.sql
-- ============================================================
-- Tracks whether a member has seen the animated product tour, so it shows
-- exactly once (dismissible early) rather than on every dashboard visit.
-- DB-backed rather than localStorage so it persists across devices.

alter table profiles add column has_seen_tutorial boolean not null default false;


-- ============================================================
-- 20260101000037_benchmark_stats.sql
-- ============================================================
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

-- ============================================================
-- 20260101000038_shopify_integration.sql
-- ============================================================
-- Shopify as a second automated, verified revenue source — the schema
-- already anticipated this (revenue_sources.provider allows 'shopify'),
-- but connecting one requires storing an OAuth access token, which Stripe
-- never needed (Stripe Connect Standard lets the platform call a connected
-- account using its own secret key; Shopify has no such thing — every
-- shop's Admin API calls need that shop's own token).
--
-- That token is meaningfully more sensitive than the financial figures
-- already in revenue_sources/revenue_snapshots, which owners are allowed
-- to read directly (see 20260101000002_rls.sql). A leaked Shopify access
-- token is a live credential against the owner's real store, so it lives
-- in its own table with RLS enabled and *no policies at all* — nobody but
-- the service role (which bypasses RLS) can ever read or write it. All
-- application code touching this table must use the admin client.

create table provider_credentials (
  id uuid primary key default gen_random_uuid(),
  revenue_source_id uuid not null unique references revenue_sources (id) on delete cascade,
  access_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table provider_credentials enable row level security;

create trigger provider_credentials_set_updated_at before update on provider_credentials
  for each row execute function set_updated_at();

-- ============================================================
-- 20260101000039_shopify_client_credentials.sql
-- ============================================================
-- Shopify's Dev Dashboard apps (the only install path that works without
-- either a Shopify Plus organization or a full App Store review) no longer
-- expose a long-lived Admin API access token in the UI at all — since
-- January 2026, they issue tokens via the OAuth "client credentials
-- grant": exchange the app's client_id + client_secret for a fresh access
-- token (good for 24h) whenever one is needed, rather than storing one
-- token forever. provider_credentials must hold the exchangeable pair
-- instead of a token — this table has never held a real row yet (no
-- Shopify connection has ever succeeded in production), so this is a
-- plain column swap, not a data migration.

alter table provider_credentials rename column access_token to client_secret;
alter table provider_credentials add column client_id text not null default '';
alter table provider_credentials alter column client_id drop default;

-- ============================================================
-- 20260101000040_opportunity_attachments.sql
-- ============================================================
-- Optional attachments on an opportunity application — a portfolio, a
-- cover letter, a work sample — alongside the plain-text message. One
-- application can carry several files, each reviewed independently of the
-- message itself. Mirrors the revenue-proofs storage pattern: a private
-- bucket, RLS scoped to the uploader's own folder for writes, and the
-- opportunity's author reads via a server-generated signed URL (checked in
-- application code, the same way admin revenue-proof review already
-- works) rather than a broader storage policy.

create table opportunity_application_attachments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references opportunity_applications (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size bigint not null,
  content_type text not null,
  created_at timestamptz not null default now()
);

create index opportunity_application_attachments_application_idx
  on opportunity_application_attachments (application_id);

alter table opportunity_application_attachments enable row level security;

create policy "applicants can add attachments to their own applications" on opportunity_application_attachments
  for insert with check (
    exists (
      select 1 from opportunity_applications a
      where a.id = application_id and a.applicant_id = auth.uid()
    )
  );

create policy "applicants and the opportunity author can view attachments" on opportunity_application_attachments
  for select using (
    exists (
      select 1 from opportunity_applications a
      join opportunities o on o.id = a.opportunity_id
      where a.id = application_id and (a.applicant_id = auth.uid() or o.author_id = auth.uid())
    )
  );

insert into storage.buckets (id, name, public)
values ('opportunity-attachments', 'opportunity-attachments', false)
on conflict (id) do nothing;

create policy "applicants can upload their own opportunity attachments" on storage.objects
  for insert with check (bucket_id = 'opportunity-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "applicants can view their own opportunity attachments" on storage.objects
  for select using (bucket_id = 'opportunity-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "applicants can delete their own opportunity attachments" on storage.objects
  for delete using (bucket_id = 'opportunity-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 20260101000041_email_campaigns.sql
-- ============================================================
-- Manual email campaigns, composed and sent from the admin panel — RGPD
-- requires explicit opt-in for marketing email (never a default-on
-- checkbox), so marketing_consent defaults to false: every existing and
-- new member is unsubscribed until they actively turn it on in Réglages.
-- unsubscribe_token is the stable, unguessable id a one-click unsubscribe
-- link (reachable with no session — an email client never carries our
-- cookies) uses to identify who's opting out, without needing them to log
-- in first.

alter table profiles add column marketing_consent boolean not null default false;
alter table profiles add column unsubscribe_token uuid not null default gen_random_uuid();

create unique index profiles_unsubscribe_token_idx on profiles (unsubscribe_token);

-- A log of what was sent, to whom (as a filter, not a raw address list),
-- and by which admin — never fabricated, always the real outcome of a
-- real send.
create table email_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  audience text not null,
  recipient_count int not null default 0,
  sent_by uuid not null references profiles (id),
  sent_at timestamptz not null default now()
);

alter table email_campaigns enable row level security;

-- Admin-only in application code (isCurrentUserAdmin() is checked before
-- every call) — RLS still blocks any non-admin from reading history or
-- forging a campaign log entry directly, as a second layer.
create policy "admins can view campaign history" on email_campaigns
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

grant insert on email_campaigns to service_role;

-- ============================================================
-- 20260101000042_transactional_emails_and_templates.sql
-- ============================================================
-- Two additions on top of the manual campaign tool:
--
-- 1. Automatic transactional emails (welcome, new follower, new message,
--    application received/accepted/declined, revenue verified) — these are
--    a direct result of the member's own account activity, not marketing,
--    so they don't need the marketing_consent opt-in. They get their own
--    opt-out instead, defaulting to on (the expected behavior — a member
--    who didn't ask to stop hearing about their own account activity
--    shouldn't be silently cut off).
--
-- 2. Reusable email templates for the admin campaign composer, so a
--    campaign's subject/body can be saved and loaded again later instead
--    of retyped from scratch every time.

alter table profiles add column email_notifications_enabled boolean not null default true;

create table email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body text not null,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table email_templates enable row level security;

-- Admin-only in application code; RLS is the second layer, same pattern as
-- email_campaigns.
create policy "admins can manage email templates" on email_templates
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create trigger email_templates_set_updated_at before update on email_templates
  for each row execute function set_updated_at();

-- Profile view tracking, powering the "X personnes ont vu ton profil"
-- curiosity loop and the weekly digest. One row per (viewer, viewed
-- profile, day) — repeated visits the same day don't inflate the count,
-- and only signed-in members are tracked (no IP-based tracking of
-- anonymous visitors).
create table profile_views (
  id uuid primary key default gen_random_uuid(),
  viewed_user_id uuid not null references profiles (id) on delete cascade,
  viewer_id uuid not null references profiles (id) on delete cascade,
  viewed_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (viewed_user_id, viewer_id, viewed_on)
);

create index profile_views_viewed_user_idx on profile_views (viewed_user_id, viewed_on desc);

alter table profile_views enable row level security;

create policy "users can view counts of their own profile views" on profile_views
  for select using (auth.uid() = viewed_user_id);

create policy "users can record their own profile visits" on profile_views
  for insert with check (auth.uid() = viewer_id and viewer_id <> viewed_user_id);

-- Every revenue sync (Stripe, Shopify, approved manual declarations) used
-- to write straight into revenue_snapshots, uniquely keyed on
-- (user_id, period) — so whichever source synced most recently for a
-- given month completely overwrote whatever another source had already
-- verified for that same month, instead of adding to it. This table lets
-- each source keep its own row per period; revenue_snapshots (read by the
-- leaderboard, dashboard, challenges, milestones — unchanged) becomes the
-- SUM across every source for that user+period instead of "last sync
-- wins".
create table revenue_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  revenue_source_id uuid not null references revenue_sources (id) on delete cascade,
  period date not null,
  amount_cents bigint not null,
  currency text not null default 'EUR',
  is_verified boolean not null default true,
  transaction_count int,
  customer_count int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (revenue_source_id, period)
);

create index revenue_source_snapshots_user_period_idx on revenue_source_snapshots (user_id, period desc);

alter table revenue_source_snapshots enable row level security;

create policy "users can view their own revenue source snapshots" on revenue_source_snapshots
  for select using (auth.uid() = user_id);

create policy "users can create their own revenue source snapshots" on revenue_source_snapshots
  for insert with check (auth.uid() = user_id);

create policy "users can update their own revenue source snapshots" on revenue_source_snapshots
  for update using (auth.uid() = user_id);

create trigger revenue_source_snapshots_set_updated_at before update on revenue_source_snapshots
  for each row execute function set_updated_at();

-- Backfill: every existing revenue_snapshots row already carries the
-- revenue_source_id of whichever source last wrote it, so this is a
-- direct 1:1 copy — there's no way to recover a different source's
-- figure for a month it already got overwritten on, only to stop losing
-- data going forward.
insert into revenue_source_snapshots (user_id, revenue_source_id, period, amount_cents, currency, is_verified, transaction_count, customer_count)
select user_id, revenue_source_id, period, amount_cents, currency, is_verified, transaction_count, customer_count
from revenue_snapshots
on conflict (revenue_source_id, period) do nothing;

-- Referral program: every member's own username doubles as their
-- referral code (ascend.app/signup?ref=username) — no separate code to
-- generate, remember or display. referred_by is set once, at signup,
-- and never changes; the referrals table tracks the reward lifecycle
-- separately so a referral can be looked up, listed and rewarded
-- exactly once regardless of what happens to the referred profile later.
alter table profiles add column referred_by uuid references profiles (id) on delete set null;

-- A free month of Pro is granted in-app (not through a real Stripe
-- subscription/coupon) — getSubscription() reports "pro" for a free-tier
-- member while this is in the future, so every existing hasProAccess()
-- check upgrades automatically with no other code changes.
alter table profiles add column pro_credit_until timestamptz;

create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles (id) on delete cascade,
  referred_id uuid not null references profiles (id) on delete cascade,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (referred_id)
);

create index referrals_referrer_idx on referrals (referrer_id);

alter table referrals enable row level security;

create policy "users can view referrals they made" on referrals
  for select using (auth.uid() = referrer_id);

-- Set once, by the referred member themselves, right at signup — never
-- editable afterward (no update policy) so a referral can't be
-- reassigned after the fact.
create policy "a new member can record who referred them" on referrals
  for insert with check (auth.uid() = referred_id);

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (
    type in (
      'achievement_unlocked', 'rank_increased', 'challenge_started',
      'milestone_reached', 'verification_completed', 'new_follower', 'new_message',
      'new_application', 'application_status_changed', 'revenue_review_completed',
      'referral_rewarded'
    )
  );

-- Basic abuse protection for login/signup — no policies at all, since
-- only the service role ever touches this (matches the same
-- zero-policy-table pattern used for provider_credentials): a plain
-- log of attempts, checked and pruned by checkRateLimit().
create table rate_limit_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_attempts_lookup_idx on rate_limit_attempts (identifier, action, created_at desc);

alter table rate_limit_attempts enable row level security;

-- Bank account verification via a PSD2 account-information aggregator
-- (Enable Banking — GoCardless Bank Account Data stopped accepting new
-- signups before this shipped) — the first of what should become a
-- general "connect an app" model, alongside Stripe/Shopify/manual.
--
-- Unlike Stripe/Shopify, a bank account mixes personal transfers,
-- refunds and loans in with real business income, so incoming
-- transactions are synced but never auto-counted as revenue — a member
-- must explicitly tag which ones are their revenue (bank_transactions.
-- is_revenue), same spirit as Finary's own manual categorization.

alter table revenue_sources drop constraint revenue_sources_provider_check;
alter table revenue_sources add constraint revenue_sources_provider_check
  check (provider in ('stripe', 'shopify', 'paypal', 'paddle', 'manual', 'bank'));

-- One row per bank connection. authorization_id is the aggregator's id
-- for the initial PSD2 redirect; session_id is issued once the member
-- finishes authenticating with their bank and account_ids fills in at
-- the same time. expires_at tracks the ~90-day PSD2 re-consent window
-- (a European rule, not aggregator-specific).
create table bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  revenue_source_id uuid not null references revenue_sources (id) on delete cascade,
  authorization_id text not null,
  session_id text,
  institution_name text not null,
  institution_country text not null,
  account_ids text[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (revenue_source_id)
);

alter table bank_connections enable row level security;

create policy "users can view their own bank connections" on bank_connections
  for select using (auth.uid() = user_id);

create policy "users can create their own bank connections" on bank_connections
  for insert with check (auth.uid() = user_id);

create policy "users can update their own bank connections" on bank_connections
  for update using (auth.uid() = user_id);

create trigger bank_connections_set_updated_at before update on bank_connections
  for each row execute function set_updated_at();

-- Raw incoming (credit) transactions. Resyncing only ever adds new rows
-- (unique on revenue_source_id + the bank's own transaction id) — it
-- never touches is_revenue on a transaction that's already been synced
-- before, so a member's tagging choices are never silently reset.
create table bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  revenue_source_id uuid not null references revenue_sources (id) on delete cascade,
  external_id text not null,
  account_id text not null,
  booking_date date not null,
  amount_cents bigint not null,
  currency text not null default 'EUR',
  counterparty text,
  description text,
  is_revenue boolean not null default false,
  created_at timestamptz not null default now(),
  unique (revenue_source_id, external_id)
);

create index bank_transactions_source_date_idx on bank_transactions (revenue_source_id, booking_date desc);

alter table bank_transactions enable row level security;

create policy "users can view their own bank transactions" on bank_transactions
  for select using (auth.uid() = user_id);

create policy "users can create their own bank transactions" on bank_transactions
  for insert with check (auth.uid() = user_id);

create policy "users can tag their own bank transactions as revenue" on bank_transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PayPal was already allowed by the original provider check (a
-- placeholder from day one that never had a real integration behind
-- it) — only Lemon Squeezy needs to be added now that both are real.
alter table revenue_sources drop constraint revenue_sources_provider_check;
alter table revenue_sources add constraint revenue_sources_provider_check
  check (provider in ('stripe', 'shopify', 'paypal', 'paddle', 'manual', 'bank', 'lemonsqueezy'));

-- Influencer marketing: each influencer gets a Stripe promotion code that
-- gives their audience 10% off for as long as they stay subscribed. When a
-- new subscriber's first payment used that code, the influencer earns a
-- one-time commission (a percentage of what the customer actually paid,
-- after their discount) — tracked here and paid out manually by an admin,
-- there is no automated payout yet.

create table influencers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  code text not null unique,
  stripe_coupon_id text not null,
  stripe_promotion_code_id text not null unique,
  commission_rate numeric not null default 0.20,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now()
);

-- One row per first payment that used an influencer's code — the unique
-- constraint on stripe_subscription_id is what makes the commission
-- strictly one-time even if Stripe redelivers the completion webhook.
create table influencer_commissions (
  id uuid primary key default gen_random_uuid(),
  influencer_id uuid not null references influencers (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_checkout_session_id text not null,
  amount_cents integer not null,
  currency text not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index influencer_commissions_influencer_id_idx on influencer_commissions (influencer_id);

alter table influencers enable row level security;
alter table influencer_commissions enable row level security;

-- Admin-only in application code (isCurrentUserAdmin() is checked before
-- every call) — RLS still blocks any non-admin from reading this data or
-- forging a commission row directly, as a second layer. All writes go
-- through the service-role admin client from server actions and the
-- Stripe webhook, never through a user-scoped client.
create policy "admins can view influencers" on influencers
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "admins can view influencer commissions" on influencer_commissions
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

grant insert, update on influencers to service_role;
grant insert, update on influencer_commissions to service_role;

-- Two independent layers of control over automated emails: an
-- admin-wide kill switch per email type (this table — absence of a row
-- means "enabled", so new email types work by default without a
-- migration), and a per-member granular opt-out (profiles column below,
-- same absence-means-enabled convention) layered on top of the existing
-- blanket email_notifications_enabled master switch.
create table automated_email_settings (
  email_key text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table automated_email_settings enable row level security;

create policy "admins can view automated email settings" on automated_email_settings
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

grant insert, update on automated_email_settings to service_role;

alter table profiles add column notification_email_prefs jsonb not null default '{}'::jsonb;

-- "Bons plans" — admin-curated deals from influencers (mostly training/
-- course sales), Elite-only. ASCEND never processes the payment for these
-- (that would mean collecting money on behalf of a third party's own
-- product) — each deal links out to the influencer's own checkout, same
-- spirit as the discount codes already used for ASCEND subscriptions.
create table deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  influencer_name text not null,
  original_price_cents integer not null,
  deal_price_cents integer not null,
  external_url text not null,
  cover_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table deals enable row level security;

-- Elite-gating happens in application code (same pattern as the
-- Opportunities "Découvrir" catalog) — RLS here only needs to keep
-- inactive/draft deals hidden from everyone but admins.
create policy "members can view active deals" on deals
  for select using (is_active = true);

create policy "admins can view all deals" on deals
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

grant insert, update, delete on deals to service_role;

-- The discount percentage and lifetime-vs-once duration were hardcoded
-- (10% forever) when the influencer program shipped — now configurable
-- per influencer, since different creators warrant different deals.
alter table influencers add column discount_percent numeric not null default 10;
alter table influencers add column duration text not null default 'forever' check (duration in ('forever', 'once'));

-- Peer-to-peer resale market for owned titles, with real payouts via
-- Stripe Connect (Express accounts) — a seller must complete Connect
-- onboarding (identity verification included) before they can list
-- anything. Only writes go through service-role service functions after
-- server-side validation (ownership, no duplicate active listing,
-- tradeable flag); RLS below only governs direct reads.

create table seller_accounts (
  user_id uuid primary key references profiles (id) on delete cascade,
  stripe_account_id text not null unique,
  payouts_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table seller_accounts enable row level security;

create policy "members can view their own seller account" on seller_accounts
  for select using (auth.uid() = user_id);

grant insert, update on seller_accounts to service_role;

-- Only the limited-supply purchasable titles are resellable — collectible
-- scarcity is where FOMO actually makes sense; "earned" achievement
-- badges (top-10, founding-member, ...) stay non-transferable so nobody
-- can sell their way into a rank/date-based badge they didn't earn.
alter table titles add column tradeable boolean not null default false;
update titles set tradeable = true where type = 'purchasable';

create table title_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles (id) on delete cascade,
  user_title_id uuid not null references user_titles (id) on delete cascade,
  title_id text not null references titles (id) on delete cascade,
  price_cents integer not null check (price_cents > 0),
  status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  buyer_id uuid references profiles (id),
  commission_cents integer,
  stripe_checkout_session_id text,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  sold_at timestamptz
);

-- Only one active listing per owned title instance at a time.
create unique index title_listings_one_active_per_user_title
  on title_listings (user_title_id) where status = 'active';
create index title_listings_status_idx on title_listings (status, created_at desc);

alter table title_listings enable row level security;

create policy "anyone can view active listings" on title_listings
  for select using (status = 'active');
create policy "sellers can view their own listings" on title_listings
  for select using (auth.uid() = seller_id);
create policy "buyers can view listings they bought" on title_listings
  for select using (auth.uid() = buyer_id);

grant insert, update on title_listings to service_role;

-- Two public buckets (read access bypasses RLS entirely for a public
-- bucket — these policies only govern who can write): one self-service
-- per-member (avatars), one admin-only for anything shown platform-wide
-- (deal cover images, dashboard banners).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "users can upload their own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can replace their own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own avatar" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

insert into storage.buckets (id, name, public)
values ('admin-media', 'admin-media', true)
on conflict (id) do nothing;

-- Uploaded exclusively through server actions that already check
-- isCurrentUserAdmin() with the service-role client — no direct-client
-- write policy needed here, service_role bypasses RLS by default.

-- "Bons plans du moment" / actualités carousel on the dashboard home —
-- empty table means the dashboard shows nothing different, exactly as
-- today.
create table dashboard_banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text not null,
  subtitle text,
  link_url text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table dashboard_banners enable row level security;

create policy "members can view active banners" on dashboard_banners
  for select using (is_active = true);

create policy "admins can view all banners" on dashboard_banners
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

grant insert, update, delete on dashboard_banners to service_role;
