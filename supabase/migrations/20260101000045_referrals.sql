-- Referral program: every member's own username doubles as their
-- referral code (ascend.app/signup?ref=username) — no separate code to
-- generate, remember or display. referred_by is set once, at signup,
-- and never changes; the referrals table tracks the reward lifecycle
-- separately so a referral can be looked up, listed and rewarded
-- exactly once regardless of what happens to the referred profile later.
alter table profiles add column referred_by uuid references profiles (id) on delete set null;

-- A free month of Pro is granted in-app (not through a real Stripe
-- subscription/coupon) — getSubscription() reports "pro" for a free-tier
-- member while this is in the future, so every existing hasProAccess()
-- check upgrades automatically with no other code changes.
alter table profiles add column pro_credit_until timestamptz;

create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles (id) on delete cascade,
  referred_id uuid not null references profiles (id) on delete cascade,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (referred_id)
);

create index referrals_referrer_idx on referrals (referrer_id);

alter table referrals enable row level security;

create policy "users can view referrals they made" on referrals
  for select using (auth.uid() = referrer_id);

-- Set once, by the referred member themselves, right at signup — never
-- editable afterward (no update policy) so a referral can't be
-- reassigned after the fact.
create policy "a new member can record who referred them" on referrals
  for insert with check (auth.uid() = referred_id);

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (
    type in (
      'achievement_unlocked', 'rank_increased', 'challenge_started',
      'milestone_reached', 'verification_completed', 'new_follower', 'new_message',
      'new_application', 'application_status_changed', 'revenue_review_completed',
      'referral_rewarded'
    )
  );
