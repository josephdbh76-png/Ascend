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
