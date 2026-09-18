-- Shopify as a second automated, verified revenue source — the schema
-- already anticipated this (revenue_sources.provider allows 'shopify'),
-- but connecting one requires storing an OAuth access token, which Stripe
-- never needed (Stripe Connect Standard lets the platform call a connected
-- account using its own secret key; Shopify has no such thing — every
-- shop's Admin API calls need that shop's own token).
--
-- That token is meaningfully more sensitive than the financial figures
-- already in revenue_sources/revenue_snapshots, which owners are allowed
-- to read directly (see 20260101000002_rls.sql). A leaked Shopify access
-- token is a live credential against the owner's real store, so it lives
-- in its own table with RLS enabled and *no policies at all* — nobody but
-- the service role (which bypasses RLS) can ever read or write it. All
-- application code touching this table must use the admin client.

create table provider_credentials (
  id uuid primary key default gen_random_uuid(),
  revenue_source_id uuid not null unique references revenue_sources (id) on delete cascade,
  access_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table provider_credentials enable row level security;

create trigger provider_credentials_set_updated_at before update on provider_credentials
  for each row execute function set_updated_at();
