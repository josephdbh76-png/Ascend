-- =========================================================================
-- 1. SEASONS: points from season challenges, a season ranking, rewards.
-- =========================================================================

alter table seasons add column if not exists description text;
alter table seasons add column if not exists rewards_distributed_at timestamptz;

alter table challenges add column if not exists points int not null default 0;
alter table challenges add column if not exists is_published boolean not null default true;
alter table challenges add column if not exists reward_title_id text references titles (id) on delete set null;
alter table challenges drop constraint if exists challenges_points_check;
alter table challenges add constraint challenges_points_check check (points >= 0);
alter table challenges drop constraint if exists challenges_type_check;
alter table challenges add constraint challenges_type_check check (type in (
  'revenue_threshold', 'growth_threshold', 'consistency', 'coming_soon',
  'customer_threshold', 'transaction_threshold', 'follower_threshold',
  'rank_threshold', 'verification', 'profile_complete'
));

create table if not exists season_rewards (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons (id) on delete cascade,
  rank_from int not null check (rank_from >= 1),
  rank_to int not null,
  kind text not null check (kind in ('title', 'trophy', 'physical')),
  title_id text references titles (id) on delete set null,
  trophy_id text references trophies (id) on delete set null,
  label text not null,
  created_at timestamptz not null default now(),
  check (rank_to >= rank_from)
);
create index if not exists season_rewards_season_idx on season_rewards (season_id);

alter table season_rewards enable row level security;
drop policy if exists "season rewards are publicly readable" on season_rewards;
create policy "season rewards are publicly readable" on season_rewards for select using (true);

create table if not exists season_results (
  season_id uuid not null references seasons (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  rank int not null,
  points int not null,
  rewards text[] not null default '{}',
  physical_status text not null default 'none' check (physical_status in ('none', 'to_send', 'sent')),
  created_at timestamptz not null default now(),
  primary key (season_id, user_id)
);

alter table season_results enable row level security;
drop policy if exists "season results are publicly readable" on season_results;
create policy "season results are publicly readable" on season_results for select using (true);

-- Season ranking: sum of points of the season's challenges completed during
-- the season. Ties go to whoever got there first. Demo accounts excluded.
create or replace function get_season_standings(p_season_id uuid, p_limit int default 100)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  points bigint,
  completed_count bigint,
  last_completed_at timestamptz,
  is_current_user boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select starts_at, ends_at from seasons where id = p_season_id
  ),
  done as (
    select uc.user_id,
           sum(c.points)::bigint as points,
           count(*)::bigint as completed_count,
           max(uc.completed_at) as last_completed_at
    from user_challenges uc
    join challenges c on c.id = uc.challenge_id and c.season_id = p_season_id and c.points > 0
    cross join s
    where uc.status = 'completed'
      and uc.completed_at >= s.starts_at
      and uc.completed_at <= s.ends_at
    group by uc.user_id
  ),
  ranked as (
    select rank() over (order by d.points desc, d.last_completed_at asc) as rnk, d.*
    from done d
    join profiles p on p.id = d.user_id and p.is_demo = false
  )
  select r.rnk, p.id, p.username, p.first_name, p.last_name, p.avatar_url,
         r.points, r.completed_count, r.last_completed_at, (p.id = auth.uid())
  from ranked r
  join profiles p on p.id = r.user_id
  order by r.rnk asc
  limit p_limit;
$$;

grant execute on function get_season_standings(uuid, int) to anon, authenticated;

create or replace function get_user_season_standing(p_season_id uuid, p_user_id uuid)
returns table (rank bigint, points bigint, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  with standings as (
    select * from get_season_standings(p_season_id, 100000)
  )
  select st.rank, st.points, (select count(*) from standings)
  from standings st
  where st.user_id = p_user_id;
$$;

grant execute on function get_user_season_standing(uuid, uuid) to anon, authenticated;

-- Season rewards and training reviews are notified with their own types.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (
    type in (
      'achievement_unlocked', 'rank_increased', 'challenge_started',
      'milestone_reached', 'verification_completed', 'new_follower', 'new_message',
      'new_application', 'application_status_changed', 'revenue_review_completed',
      'referral_rewarded', 'payment_refunded', 'season_reward', 'training_review_completed'
    )
  );

-- =========================================================================
-- 2. BUSINESSES: own wording for the activity, and several activities.
--    `businesses` stays the main activity (one per member, used by the
--    category leaderboard); the others live in extra_businesses.
-- =========================================================================

alter table businesses add column if not exists custom_category text;
alter table businesses add column if not exists description text;
alter table businesses drop constraint if exists businesses_custom_category_length;
alter table businesses add constraint businesses_custom_category_length check (char_length(custom_category) <= 60);
alter table businesses drop constraint if exists businesses_description_length;
alter table businesses add constraint businesses_description_length check (char_length(description) <= 280);

create table if not exists extra_businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  category text not null,
  custom_category text check (char_length(custom_category) <= 60),
  description text check (char_length(description) <= 280),
  website text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists extra_businesses_user_idx on extra_businesses (user_id, position);

alter table extra_businesses enable row level security;
drop policy if exists "extra businesses are publicly readable" on extra_businesses;
create policy "extra businesses are publicly readable" on extra_businesses for select using (true);
drop policy if exists "users can manage their own extra businesses" on extra_businesses;
create policy "users can manage their own extra businesses" on extra_businesses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists extra_businesses_set_updated_at on extra_businesses;
create trigger extra_businesses_set_updated_at before update on extra_businesses
  for each row execute function set_updated_at();

-- Links are rendered on public profiles: plain web addresses only.
alter table extra_businesses drop constraint if exists extra_businesses_website_http;
alter table extra_businesses add constraint extra_businesses_website_http
  check (website is null or (website ~* '^https?://' and char_length(website) <= 200));

-- The table is writable through the API, so the cap lives here too.
create or replace function extra_businesses_enforce_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('extra_businesses:' || new.user_id::text));
  if (select count(*) from extra_businesses where user_id = new.user_id) >= 5 then
    raise exception 'extra_businesses_limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists extra_businesses_limit on extra_businesses;
create trigger extra_businesses_limit before insert on extra_businesses
  for each row execute function extra_businesses_enforce_limit();

-- =========================================================================
-- 3. METRICS FEED for Excel: secret links, stored hashed, service role only.
-- =========================================================================

create table if not exists metrics_access_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
alter table metrics_access_tokens enable row level security;

-- =========================================================================
-- 4. CATALOG: new titles, trophies, achievements and Season 01 content.
-- =========================================================================

insert into titles (id, name, description, icon, rarity, type, requirement, tradeable) values
  ('season-champion-01', 'Champion · Saison 01', 'Premier du classement de la Saison 01.', 'crown', 'legendary', 'earned', '{"type":"season_reward"}', false),
  ('season-podium-01', 'Podium · Saison 01', 'Sur le podium de la Saison 01.', 'medal', 'epic', 'earned', '{"type":"season_reward"}', false),
  ('season-top10-01', 'Top 10 · Saison 01', 'Dans le top 10 de la Saison 01.', 'trophy', 'rare', 'earned', '{"type":"season_reward"}', false),
  ('the-connector', 'The Connector', 'Suivi par au moins 10 membres.', 'users', 'rare', 'earned', '{"type":"follower_threshold","count":10}', false),
  ('the-closer', 'The Closer', 'Au moins 50 clients sur un mois vérifié.', 'target', 'epic', 'earned', '{"type":"customer_threshold","count":50}', false),
  ('the-rocket', 'The Rocket', '+50 % de revenus en un mois.', 'rocket', 'epic', 'earned', '{"type":"growth_threshold","percent":50}', false),
  ('the-veteran', 'The Veteran', '90 jours de revenus vérifiés.', 'shield', 'rare', 'earned', '{"type":"consistency","days":90}', false)
on conflict (id) do nothing;

insert into trophies (id, name, description, icon) values
  ('season-champion', 'Champion de saison', 'Premier du classement d''une saison ASCEND.', 'crown'),
  ('season-podium', 'Podium de saison', 'Sur le podium d''une saison ASCEND.', 'medal'),
  ('season-top10', 'Top 10 de saison', 'Dans le top 10 d''une saison ASCEND.', 'trophy')
on conflict (id) do nothing;

insert into achievements (id, name, description, icon, rarity, criteria) values
  ('first-follower', 'Premier abonné', 'Un premier membre suit ta progression.', 'users', 'common', '{"type":"follower_threshold","count":1}'),
  ('profile-complete', 'Profil complet', 'Photo, bio, compétences et description d''activité renseignées.', 'user-check', 'common', '{"type":"profile_complete"}'),
  ('customers-10', '10 clients', 'Au moins 10 clients sur un mois vérifié.', 'users', 'common', '{"type":"customer_threshold","count":10}'),
  ('customers-100', '100 clients', 'Au moins 100 clients sur un mois vérifié.', 'users', 'epic', '{"type":"customer_threshold","count":100}'),
  ('growth-50', '+50 % en un mois', 'Revenus en hausse d''au moins 50 % sur un mois.', 'trending-up', 'epic', '{"type":"growth_threshold","percent":50}'),
  ('consistency-90', '90 jours vérifiés', 'Revenus vérifiés depuis au moins 90 jours.', 'calendar', 'rare', '{"type":"consistency","days":90}')
on conflict (id) do nothing;

update seasons
set description = 'Chaque défi réussi pendant la saison rapporte des points. Les mieux classés à la fin de la saison remportent des titres et des trophées exclusifs.'
where number = 1 and description is null;

-- Points for the existing Season 01 challenges; unfinished "coming soon" ones hidden.
update challenges set points = 10 where slug in ('first-sale', 'first-100');
update challenges set points = 15 where slug = 'first-500';
update challenges set points = 20 where slug = 'first-1000';
update challenges set points = 60 where slug = 'first-10k-month';
update challenges set points = 40 where slug = 'growth-30';
update challenges set points = 30 where slug = 'consistency-30';
update challenges set is_published = false where type = 'coming_soon';

insert into challenges (season_id, slug, title, description, type, target, points, starts_at, ends_at)
select s.id, v.slug, v.title, v.description, v.type, v.target, v.points, s.starts_at, s.ends_at
from seasons s
cross join (values
  ('profile-complete-s01', 'Profil complet', 'Ajoute ta photo, ta bio, tes compétences et la description de ton activité.', 'profile_complete', 100, 10),
  ('verified-s01', 'Revenus vérifiés', 'Connecte une source de revenus et fais vérifier ton activité.', 'verification', 1, 15),
  ('growth-10-s01', '+10 % de croissance', 'Fais progresser tes revenus mensuels d''au moins 10 %.', 'growth_threshold', 10, 20),
  ('revenue-5k-s01', '5 000 € mensuels', 'Atteins 5 000 € de revenus mensuels vérifiés.', 'revenue_threshold', 500000, 35),
  ('customers-10-s01', '10 clients dans le mois', 'Sers au moins 10 clients sur un mois vérifié.', 'customer_threshold', 10, 20),
  ('customers-50-s01', '50 clients dans le mois', 'Sers au moins 50 clients sur un mois vérifié.', 'customer_threshold', 50, 40),
  ('transactions-100-s01', '100 ventes dans le mois', 'Réalise au moins 100 ventes sur un mois vérifié.', 'transaction_threshold', 100, 30),
  ('followers-5-s01', '5 abonnés', 'Fais-toi suivre par au moins 5 membres.', 'follower_threshold', 5, 10),
  ('top-10-s01', 'Top 10 mondial', 'Entre dans le top 10 du classement mondial.', 'rank_threshold', 10, 50)
) as v(slug, title, description, type, target, points)
where s.number = 1
on conflict (slug) do nothing;

insert into season_rewards (season_id, rank_from, rank_to, kind, title_id, trophy_id, label)
select s.id, v.rank_from, v.rank_to, v.kind, v.title_id, v.trophy_id, v.label
from seasons s
cross join (values
  (1, 1, 'title', 'season-champion-01', null, 'Titre « Champion · Saison 01 »'),
  (1, 1, 'trophy', null, 'season-champion', 'Trophée « Champion de saison »'),
  (2, 3, 'title', 'season-podium-01', null, 'Titre « Podium · Saison 01 »'),
  (2, 3, 'trophy', null, 'season-podium', 'Trophée « Podium de saison »'),
  (4, 10, 'title', 'season-top10-01', null, 'Titre « Top 10 · Saison 01 »')
) as v(rank_from, rank_to, kind, title_id, trophy_id, label)
where s.number = 1
  and not exists (select 1 from season_rewards r where r.season_id = s.id);

-- =========================================================================
-- 6. TRAININGS: formations offered by members (or by ASCEND for a partner),
--    reviewed by the team before going live, with weekly view counts.
--    Every write goes through the server (validation + moderation): there
--    is no member write policy on these tables.
-- =========================================================================

create table if not exists trainings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles (id) on delete cascade,
  creator_name text check (char_length(creator_name) <= 80),
  title text not null check (char_length(title) between 3 and 120),
  summary text not null check (char_length(summary) between 10 and 200),
  description text not null check (char_length(description) between 20 and 2000),
  theme text not null,
  format text not null check (format in ('online', 'live', 'coaching', 'in_person')),
  duration_label text check (char_length(duration_label) <= 40),
  price_cents integer not null check (price_cents between 0 and 10000000),
  member_price_cents integer check (member_price_cents >= 0),
  promo_code text check (char_length(promo_code) <= 40),
  audience text not null default 'members' check (audience in ('members', 'elite')),
  external_url text not null check (external_url ~* '^https?://' and char_length(external_url) <= 500),
  cover_image_url text,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'archived')),
  rejection_reason text check (char_length(rejection_reason) <= 300),
  is_pinned boolean not null default false,
  legacy_deal_id uuid unique,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trainings_member_price_below check (member_price_cents is null or member_price_cents < price_cents),
  constraint trainings_has_creator check (owner_id is not null or creator_name is not null)
);
create index if not exists trainings_status_idx on trainings (status, published_at desc);
create index if not exists trainings_owner_idx on trainings (owner_id);

alter table trainings enable row level security;
drop policy if exists "published trainings are public" on trainings;
create policy "published trainings are public" on trainings for select using (status = 'published');
drop policy if exists "owners can read their own trainings" on trainings;
create policy "owners can read their own trainings" on trainings for select using (auth.uid() = owner_id);

drop trigger if exists trainings_set_updated_at on trainings;
create trigger trainings_set_updated_at before update on trainings
  for each row execute function set_updated_at();

-- One view (or click) per visitor, training and day. viewer_key is the
-- member id, or a salted daily hash for logged-out visitors.
create table if not exists training_events (
  id bigint generated always as identity primary key,
  training_id uuid not null references trainings (id) on delete cascade,
  viewer_key text not null check (char_length(viewer_key) <= 80),
  kind text not null check (kind in ('view', 'click')),
  event_day date not null default ((now() at time zone 'utc')::date),
  created_at timestamptz not null default now(),
  unique (training_id, viewer_key, kind, event_day)
);
create index if not exists training_events_recent_idx on training_events (created_at desc, training_id);
alter table training_events enable row level security;

create or replace function get_training_stats(p_since timestamptz)
returns table (training_id uuid, views bigint, clicks bigint)
language sql
stable
security definer
set search_path = public
as $$
  select e.training_id,
         count(*) filter (where e.kind = 'view') as views,
         count(*) filter (where e.kind = 'click') as clicks
  from training_events e
  where e.created_at >= p_since
  group by e.training_id;
$$;
revoke execute on function get_training_stats(timestamptz) from public, anon, authenticated;
grant execute on function get_training_stats(timestamptz) to service_role;

-- Covers uploaded by members, through the server only.
insert into storage.buckets (id, name, public)
values ('training-covers', 'training-covers', true)
on conflict (id) do nothing;

-- The former "bons plans" become trainings reserved to Elite members.
insert into trainings (
  creator_name, title, summary, description, theme, format, price_cents, member_price_cents,
  audience, external_url, cover_image_url, status, published_at, legacy_deal_id, created_at
)
select
  left(d.influencer_name, 80),
  left(d.title, 120),
  left(case when char_length(d.description) >= 10 then d.description else d.title || ' : offre membres.' end, 200),
  left(case when char_length(d.description) >= 20 then d.description else d.description || ' Offre réservée aux membres Elite.' end, 2000),
  'other',
  'online',
  d.original_price_cents,
  case when d.deal_price_cents < d.original_price_cents then d.deal_price_cents end,
  'elite',
  d.external_url,
  d.cover_image_url,
  case when d.is_active then 'published' else 'archived' end,
  case when d.is_active then d.created_at end,
  d.id,
  d.created_at
from deals d
where d.external_url ~* '^https?://' and char_length(d.title) >= 3
on conflict (legacy_deal_id) do nothing;
