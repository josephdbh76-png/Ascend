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
