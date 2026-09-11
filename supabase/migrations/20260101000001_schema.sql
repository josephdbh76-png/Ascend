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
