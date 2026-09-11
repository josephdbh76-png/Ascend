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
