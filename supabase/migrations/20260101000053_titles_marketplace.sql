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
