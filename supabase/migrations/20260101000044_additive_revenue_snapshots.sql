-- Every revenue sync (Stripe, Shopify, approved manual declarations) used
-- to write straight into revenue_snapshots, uniquely keyed on
-- (user_id, period) — so whichever source synced most recently for a
-- given month completely overwrote whatever another source had already
-- verified for that same month, instead of adding to it. This table lets
-- each source keep its own row per period; revenue_snapshots (read by the
-- leaderboard, dashboard, challenges, milestones — unchanged) becomes the
-- SUM across every source for that user+period instead of "last sync
-- wins".
create table revenue_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  revenue_source_id uuid not null references revenue_sources (id) on delete cascade,
  period date not null,
  amount_cents bigint not null,
  currency text not null default 'EUR',
  is_verified boolean not null default true,
  transaction_count int,
  customer_count int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (revenue_source_id, period)
);

create index revenue_source_snapshots_user_period_idx on revenue_source_snapshots (user_id, period desc);

alter table revenue_source_snapshots enable row level security;

create policy "users can view their own revenue source snapshots" on revenue_source_snapshots
  for select using (auth.uid() = user_id);

create policy "users can create their own revenue source snapshots" on revenue_source_snapshots
  for insert with check (auth.uid() = user_id);

create policy "users can update their own revenue source snapshots" on revenue_source_snapshots
  for update using (auth.uid() = user_id);

create trigger revenue_source_snapshots_set_updated_at before update on revenue_source_snapshots
  for each row execute function set_updated_at();

-- Backfill: every existing revenue_snapshots row already carries the
-- revenue_source_id of whichever source last wrote it, so this is a
-- direct 1:1 copy — there's no way to recover a different source's
-- figure for a month it already got overwritten on, only to stop losing
-- data going forward.
insert into revenue_source_snapshots (user_id, revenue_source_id, period, amount_cents, currency, is_verified, transaction_count, customer_count)
select user_id, revenue_source_id, period, amount_cents, currency, is_verified, transaction_count, customer_count
from revenue_snapshots
on conflict (revenue_source_id, period) do nothing;
