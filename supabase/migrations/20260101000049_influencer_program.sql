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
