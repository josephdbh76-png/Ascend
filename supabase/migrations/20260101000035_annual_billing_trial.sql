-- Annual billing (2 mois offerts sur Pro, 3 mois offerts sur Elite) and a
-- 14-day Elite trial, restricted to members who have never had a paid
-- subscription. trial_used is permanent — it's never reset back to false,
-- even after cancelling, so it can't be farmed by downgrading and
-- re-subscribing.

alter table subscriptions add column billing_interval text check (billing_interval in ('month', 'year'));
alter table subscriptions add column trial_used boolean not null default false;
alter table subscriptions add column trial_ends_at timestamptz;
