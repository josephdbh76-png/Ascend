-- Leagues, Clash of Clans style ("clans" in the code, « ligues » in the UI).
--
-- Any verified member can open a league; members join it (open, on
-- request or on invitation), with a leader and co-leaders. Every member
-- has an invite link: a new member who subscribes thanks to it earns the
-- inviter 5 €, 50 € more at every 10th, and the league leader a share.
-- Leaders declare wars on other leagues: 7 days, scored on the revenue
-- members make during the war compared to their usual pace, challenges
-- and verified members. Wins bring trophies and titles.
--
-- Replaces the creator leagues of migration 072 (still empty). All
-- writes go through the server (service role).

drop table if exists league_wars cascade;
drop table if exists creator_league_members cascade;
drop table if exists creator_leagues cascade;
drop function if exists creator_league_member_stats(uuid, timestamptz, timestamptz);

create table clans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  name text not null check (char_length(name) between 2 and 40),
  tagline text check (tagline is null or char_length(tagline) <= 140),
  emblem text not null default 'shield',
  color text not null default 'gold',
  access text not null default 'open' check (access in ('open', 'request', 'invite')),
  max_members int not null default 50 check (max_members between 5 and 500),
  owner_id uuid references profiles (id) on delete set null,
  -- A partner creator's league: their /c/CODE link leads here.
  influencer_id uuid unique references influencers (id) on delete set null,
  trophies int not null default 0 check (trophies >= 0),
  wars_won int not null default 0,
  wars_lost int not null default 0,
  wars_drawn int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- The primary key on user_id keeps a member in one league at a time.
create table clan_members (
  user_id uuid primary key references profiles (id) on delete cascade,
  clan_id uuid not null references clans (id) on delete cascade,
  role text not null default 'member' check (role in ('leader', 'coleader', 'member')),
  invited_by uuid references profiles (id) on delete set null,
  joined_at timestamptz not null default now()
);
create index clan_members_clan_idx on clan_members (clan_id);
create unique index clan_members_one_leader on clan_members (clan_id) where role = 'leader';

create table clan_join_requests (
  clan_id uuid not null references clans (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (clan_id, user_id)
);

-- proposed → scheduled (accepted; 24 h of preparation) → started (rosters
-- frozen) → closed. Or declined / expired (no answer in 48 h) / canceled.
create table clan_wars (
  id uuid primary key default gen_random_uuid(),
  clan_a uuid not null references clans (id) on delete cascade,
  clan_b uuid not null references clans (id) on delete cascade,
  status text not null default 'proposed'
    check (status in ('proposed', 'declined', 'expired', 'scheduled', 'closed', 'canceled')),
  declared_by uuid references profiles (id) on delete set null,
  respond_by timestamptz not null,
  accepted_at timestamptz,
  declined_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  started_at timestamptz,
  score_a numeric,
  score_b numeric,
  winner_clan_id uuid references clans (id) on delete set null,
  trophies_a int,
  trophies_b int,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  check (clan_a <> clan_b),
  check (ends_at is null or ends_at > starts_at)
);
create index clan_wars_clans_idx on clan_wars (clan_a, clan_b);
create index clan_wars_open_idx on clan_wars (status) where status in ('proposed', 'scheduled');

-- Rosters, frozen when the war starts, with each fighter's starting point:
-- revenue numbers, so never readable by members (server only).
create table clan_war_fighters (
  war_id uuid not null references clan_wars (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  clan_id uuid not null references clans (id) on delete cascade,
  verified_at_start boolean not null default false,
  -- Has a source that syncs on its own and a verified previous month.
  revenue_eligible boolean not null default false,
  baseline_weekly_cents bigint not null default 0,
  start_period date,
  start_mtd_cents bigint not null default 0,
  points numeric,
  result text check (result in ('won', 'lost', 'draw')),
  primary key (war_id, user_id)
);
create index clan_war_fighters_user_idx on clan_war_fighters (user_id);

-- One score per side per day, for the war's chart.
create table clan_war_days (
  war_id uuid not null references clan_wars (id) on delete cascade,
  day date not null,
  score_a numeric not null,
  score_b numeric not null,
  primary key (war_id, day)
);

-- Who brought whom: one inviter per member, the first one.
create table clan_invites (
  invitee_id uuid primary key references profiles (id) on delete cascade,
  inviter_id uuid not null references profiles (id) on delete cascade,
  clan_id uuid references clans (id) on delete set null,
  source text not null check (source in ('signup', 'join')),
  had_paid_subscription boolean not null default false,
  -- The subscription has to come within 60 days to count as "thanks to the invite".
  eligible_until timestamptz not null,
  outcome text check (outcome in ('rewarded', 'not_in_league', 'same_card', 'late', 'already_subscribed')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (invitee_id <> inviter_id)
);
create index clan_invites_inviter_idx on clan_invites (inviter_id);

-- Money earned through invites: held 30 days (refund window), then paid on the 5th.
create table clan_rewards (
  id uuid primary key default gen_random_uuid(),
  beneficiary_id uuid not null references profiles (id) on delete cascade,
  kind text not null check (kind in ('invite', 'invite_bonus', 'leader_share', 'leader_bonus')),
  amount_cents int not null check (amount_cents > 0),
  invitee_id uuid references profiles (id) on delete set null,
  clan_id uuid references clans (id) on delete set null,
  stripe_invoice_id text,
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'canceled')),
  available_at timestamptz not null,
  paid_at timestamptz,
  stripe_transfer_id text,
  created_at timestamptz not null default now()
);
create index clan_rewards_beneficiary_idx on clan_rewards (beneficiary_id, status);

alter table clans enable row level security;
alter table clan_members enable row level security;
alter table clan_join_requests enable row level security;
alter table clan_wars enable row level security;
alter table clan_war_fighters enable row level security;
alter table clan_war_days enable row level security;
alter table clan_invites enable row level security;
alter table clan_rewards enable row level security;

create policy "anyone can view leagues" on clans for select using (true);
create policy "anyone can view league members" on clan_members for select using (true);
create policy "anyone can view league wars" on clan_wars for select using (true);
create policy "anyone can view league war days" on clan_war_days for select using (true);
create policy "members can view their join requests" on clan_join_requests for select using (auth.uid() = user_id);
create policy "members can view their invites" on clan_invites for select using (auth.uid() = inviter_id or auth.uid() = invitee_id);
create policy "members can view their rewards" on clan_rewards for select using (auth.uid() = beneficiary_id);

-- The internal ranking: raw growth even for private revenue (the server
-- only shows it when the member's revenue is public).
create or replace function clan_member_stats(p_clan_id uuid)
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
  role text,
  joined_at timestamptz
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
    m.role,
    m.joined_at
  from clan_members m
  join profiles p on p.id = m.user_id
  left join privacy_settings ps on ps.user_id = m.user_id
  left join lateral member_reference_revenue(m.user_id) r on true
  where m.clan_id = p_clan_id;
$$;
revoke execute on function clan_member_stats(uuid) from public, anon, authenticated;
grant execute on function clan_member_stats(uuid) to service_role;

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (
    type in (
      'achievement_unlocked', 'rank_increased', 'challenge_started',
      'milestone_reached', 'verification_completed', 'new_follower', 'new_message',
      'new_application', 'application_status_changed', 'revenue_review_completed',
      'referral_rewarded', 'payment_refunded', 'season_reward', 'training_review_completed',
      'revenue_reminder', 'league_war', 'league_activity'
    )
  );

insert into titles (id, name, description, icon, rarity, type, requirement, tradeable) values
  ('league-war-veteran', 'Vétéran de guerre', '5 guerres de ligues gagnées avec des revenus vérifiés.', 'swords', 'epic', 'earned', '{"type":"manual"}', false),
  ('league-war-legend', 'Légende de guerre', '25 guerres de ligues gagnées avec des revenus vérifiés.', 'crown', 'legendary', 'earned', '{"type":"manual"}', false)
on conflict (id) do nothing;
update titles set description = 'Première guerre de ligues gagnée avec des revenus vérifiés.' where id = 'league-war-winner';
