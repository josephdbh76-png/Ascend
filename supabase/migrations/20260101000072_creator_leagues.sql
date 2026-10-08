-- Creator program v2 and creator leagues.
--
-- 1. A creator is linked to their member account and gets a personal link
--    (/c/CODE). Everyone who signs up through the link or pays with the
--    code stays attributed to that creator, who earns a commission on every
--    payment for `commission_months` months (null = for as long as they pay).
-- 2. Commissions are now one row per paid invoice instead of one per
--    subscription.
-- 3. Creator leagues: a creator's community competes as a team. Members
--    are in one league at a time; two leagues face off in a league war.
--    All writes go through the server (service role); everyone can read.

-- 1. Creators
alter table influencers add column if not exists user_id uuid unique references profiles (id) on delete set null;
alter table influencers add column if not exists commission_months int default 12
  check (commission_months is null or commission_months > 0);
alter table influencers add column if not exists link_clicks int not null default 0;

alter table profiles add column if not exists influencer_id uuid references influencers (id) on delete set null;
alter table profiles add column if not exists influencer_joined_at timestamptz;
create index if not exists profiles_influencer_id_idx on profiles (influencer_id) where influencer_id is not null;

-- Members can't attribute themselves to a creator (nor change who brought them).
create or replace function guard_member_profile_write()
returns trigger
language plpgsql
as $$
begin
  if not is_member_request() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_admin := false;
    new.is_cofounder := false;
    new.is_demo := false;
    new.revenue_verified := false;
    new.founding_member_number := null;
    new.pro_credit_until := null;
    new.influencer_id := null;
    new.influencer_joined_at := null;
  else
    new.is_admin := old.is_admin;
    new.is_cofounder := old.is_cofounder;
    new.is_demo := old.is_demo;
    new.revenue_verified := old.revenue_verified;
    new.founding_member_number := old.founding_member_number;
    new.pro_credit_until := old.pro_credit_until;
    new.referred_by := old.referred_by;
    new.influencer_id := old.influencer_id;
    new.influencer_joined_at := old.influencer_joined_at;
  end if;
  return new;
end;
$$;

create or replace function increment_creator_link_clicks(p_influencer_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update influencers set link_clicks = link_clicks + 1 where id = p_influencer_id;
$$;
revoke execute on function increment_creator_link_clicks(uuid) from public, anon, authenticated;
grant execute on function increment_creator_link_clicks(uuid) to service_role;

-- 2. One commission per paid invoice
alter table influencer_commissions drop constraint if exists influencer_commissions_stripe_subscription_id_key;
alter table influencer_commissions alter column stripe_checkout_session_id drop not null;
alter table influencer_commissions add column if not exists stripe_invoice_id text;
update influencer_commissions
  set stripe_invoice_id = coalesce(stripe_checkout_session_id, stripe_subscription_id)
  where stripe_invoice_id is null;
alter table influencer_commissions alter column stripe_invoice_id set not null;
create unique index if not exists influencer_commissions_invoice_idx on influencer_commissions (stripe_invoice_id);
create index if not exists influencer_commissions_member_idx on influencer_commissions (influencer_id, user_id, created_at);

-- 3. Creator leagues and league wars
create table if not exists creator_leagues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  name text not null check (char_length(name) between 2 and 40),
  tagline text check (tagline is null or char_length(tagline) <= 140),
  owner_id uuid references profiles (id) on delete set null,
  influencer_id uuid unique references influencers (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- The primary key on user_id is what keeps a member in one league at a time.
create table if not exists creator_league_members (
  user_id uuid primary key references profiles (id) on delete cascade,
  league_id uuid not null references creator_leagues (id) on delete cascade,
  joined_at timestamptz not null default now()
);
create index if not exists creator_league_members_league_idx on creator_league_members (league_id);

create table if not exists league_wars (
  id uuid primary key default gen_random_uuid(),
  league_a uuid not null references creator_leagues (id) on delete cascade,
  league_b uuid not null references creator_leagues (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  score_a numeric,
  score_b numeric,
  winner_league_id uuid references creator_leagues (id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  check (league_a <> league_b),
  check (ends_at > starts_at)
);
create index if not exists league_wars_leagues_idx on league_wars (league_a, league_b);

alter table creator_leagues enable row level security;
alter table creator_league_members enable row level security;
alter table league_wars enable row level security;

drop policy if exists "anyone can view creator leagues" on creator_leagues;
create policy "anyone can view creator leagues" on creator_leagues for select using (true);
drop policy if exists "anyone can view league members" on creator_league_members;
create policy "anyone can view league members" on creator_league_members for select using (true);
drop policy if exists "anyone can view league wars" on league_wars;
create policy "anyone can view league wars" on league_wars for select using (true);

-- Everything the league ranking and the war score need, per member. Raw
-- growth even for members who keep their revenue private: the server only
-- uses it for the score and never shows it.
create or replace function creator_league_member_stats(
  p_league_id uuid,
  p_since timestamptz default null,
  p_until timestamptz default null
)
returns table (
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  is_demo boolean,
  revenue_verified boolean,
  revenue_visibility text,
  growth_percent numeric,
  joined_at timestamptz,
  challenges_completed bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.user_id,
    p.username,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.is_demo,
    p.revenue_verified,
    coalesce(ps.revenue_visibility, 'private'),
    case
      when r.previous_amount_cents is null or r.previous_amount_cents = 0 then null
      else round(((r.amount_cents - r.previous_amount_cents)::numeric / r.previous_amount_cents) * 100, 1)
    end,
    m.joined_at,
    (
      select count(*) from user_challenges uc
      where uc.user_id = m.user_id
        and uc.status = 'completed'
        and (p_since is null or uc.completed_at >= p_since)
        and (p_until is null or uc.completed_at < p_until)
    )
  from creator_league_members m
  join profiles p on p.id = m.user_id
  left join privacy_settings ps on ps.user_id = m.user_id
  left join lateral member_reference_revenue(m.user_id) r on true
  where m.league_id = p_league_id;
$$;
revoke execute on function creator_league_member_stats(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function creator_league_member_stats(uuid, timestamptz, timestamptz) to service_role;

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (
    type in (
      'achievement_unlocked', 'rank_increased', 'challenge_started',
      'milestone_reached', 'verification_completed', 'new_follower', 'new_message',
      'new_application', 'application_status_changed', 'revenue_review_completed',
      'referral_rewarded', 'payment_refunded', 'season_reward', 'training_review_completed',
      'revenue_reminder', 'league_war'
    )
  );

insert into titles (id, name, description, icon, rarity, type, requirement, tradeable) values
  ('league-war-winner', 'Vainqueur · Guerre de ligues', 'Membre vérifié de la ligue gagnante d''une guerre de ligues.', 'swords', 'epic', 'earned', '{"type":"manual"}', false)
on conflict (id) do nothing;
