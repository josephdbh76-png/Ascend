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
