-- "Bons plans" — admin-curated deals from influencers (mostly training/
-- course sales), Elite-only. ASCEND never processes the payment for these
-- (that would mean collecting money on behalf of a third party's own
-- product) — each deal links out to the influencer's own checkout, same
-- spirit as the discount codes already used for ASCEND subscriptions.
create table deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  influencer_name text not null,
  original_price_cents integer not null,
  deal_price_cents integer not null,
  external_url text not null,
  cover_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table deals enable row level security;

-- Elite-gating happens in application code (same pattern as the
-- Opportunities "Découvrir" catalog) — RLS here only needs to keep
-- inactive/draft deals hidden from everyone but admins.
create policy "members can view active deals" on deals
  for select using (is_active = true);

create policy "admins can view all deals" on deals
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

grant insert, update, delete on deals to service_role;
