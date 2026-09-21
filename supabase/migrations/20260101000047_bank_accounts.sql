-- Bank account verification via a PSD2 account-information aggregator
-- (GoCardless Bank Account Data) — the first of what should become a
-- general "connect an app" model, alongside Stripe/Shopify/manual.
--
-- Unlike Stripe/Shopify, a bank account mixes personal transfers,
-- refunds and loans in with real business income, so incoming
-- transactions are synced but never auto-counted as revenue — a member
-- must explicitly tag which ones are their revenue (bank_transactions.
-- is_revenue), same spirit as Finary's own manual categorization.

alter table revenue_sources drop constraint revenue_sources_provider_check;
alter table revenue_sources add constraint revenue_sources_provider_check
  check (provider in ('stripe', 'shopify', 'paypal', 'paddle', 'manual', 'bank'));

-- One row per bank connection. requisition_id is the aggregator's id for
-- the PSD2 consent session; account_ids fills in once the member finishes
-- authenticating with their bank. expires_at tracks the ~90-day PSD2
-- re-consent window (a European rule, not aggregator-specific).
create table bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  revenue_source_id uuid not null references revenue_sources (id) on delete cascade,
  requisition_id text not null,
  institution_id text not null,
  institution_name text not null,
  account_ids text[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (revenue_source_id)
);

alter table bank_connections enable row level security;

create policy "users can view their own bank connections" on bank_connections
  for select using (auth.uid() = user_id);

create policy "users can create their own bank connections" on bank_connections
  for insert with check (auth.uid() = user_id);

create policy "users can update their own bank connections" on bank_connections
  for update using (auth.uid() = user_id);

create trigger bank_connections_set_updated_at before update on bank_connections
  for each row execute function set_updated_at();

-- Raw incoming (credit) transactions. Resyncing only ever adds new rows
-- (unique on revenue_source_id + the bank's own transaction id) — it
-- never touches is_revenue on a transaction that's already been synced
-- before, so a member's tagging choices are never silently reset.
create table bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  revenue_source_id uuid not null references revenue_sources (id) on delete cascade,
  external_id text not null,
  account_id text not null,
  booking_date date not null,
  amount_cents bigint not null,
  currency text not null default 'EUR',
  counterparty text,
  description text,
  is_revenue boolean not null default false,
  created_at timestamptz not null default now(),
  unique (revenue_source_id, external_id)
);

create index bank_transactions_source_date_idx on bank_transactions (revenue_source_id, booking_date desc);

alter table bank_transactions enable row level security;

create policy "users can view their own bank transactions" on bank_transactions
  for select using (auth.uid() = user_id);

create policy "users can create their own bank transactions" on bank_transactions
  for insert with check (auth.uid() = user_id);

create policy "users can tag their own bank transactions as revenue" on bank_transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
