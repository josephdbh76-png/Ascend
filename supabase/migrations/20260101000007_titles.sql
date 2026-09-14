-- Collectible profile titles. "Earned" titles mirror achievements (free,
-- unlocked by meeting a requirement). "Exclusive" titles are extremely
-- limited paid collectibles (e.g. 1 of 1) — ownership of those can ONLY be
-- granted through purchase_exclusive_title() below, never through a direct
-- client insert, so scarcity is enforced by the database itself.

create table titles (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary', 'exclusive')),
  type text not null check (type in ('earned', 'purchasable')),
  price_cents int,
  supply int,
  remaining_supply int,
  requirement jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table user_titles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  title_id text not null references titles (id) on delete cascade,
  acquired_at timestamptz not null default now(),
  acquisition_type text not null check (acquisition_type in ('earned', 'purchased')),
  is_active boolean not null default false,
  unique (user_id, title_id)
);

-- Only one active (displayed-on-profile) title per user.
create unique index user_titles_one_active_per_user on user_titles (user_id) where is_active;

alter table titles enable row level security;
alter table user_titles enable row level security;

create policy "titles catalog is publicly readable" on titles
  for select using (true);

create policy "user titles are publicly readable" on user_titles
  for select using (true);

-- Earned titles can be self-claimed once the client-side UI believes the
-- requirement is met (defense in depth only — the real grant happens
-- server-side via title.service.ts during achievement/rank evaluation).
-- Purchasable/exclusive titles are excluded entirely: no client, however
-- authenticated, can insert ownership of one directly.
create policy "users can claim their own earned titles" on user_titles
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from titles t where t.id = title_id and t.type = 'earned')
  );

create policy "users can change which of their titles is active" on user_titles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Atomically grants an exclusive title and decrements its remaining supply.
-- Fails (returns false) once supply is exhausted — this is the only path
-- that can ever create ownership of a purchasable title, so scarcity can
-- never be bypassed from the client.
create or replace function purchase_exclusive_title(p_title_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update titles
  set remaining_supply = remaining_supply - 1
  where id = p_title_id
    and type = 'purchasable'
    and remaining_supply is not null
    and remaining_supply > 0;

  get diagnostics updated_rows = row_count;
  if updated_rows = 0 then
    return false;
  end if;

  insert into user_titles (user_id, title_id, acquisition_type)
  values (auth.uid(), p_title_id, 'purchased')
  on conflict (user_id, title_id) do nothing;

  return true;
end;
$$;

grant execute on function purchase_exclusive_title(text) to authenticated;

insert into titles (id, name, description, icon, rarity, type, requirement) values
  ('founding-member', 'Membre fondateur', 'Un des 500 premiers membres d''ASCEND.', 'gem', 'epic', 'earned', '{"type":"founding_member"}'),
  ('top-100', 'Top 100', 'Classé dans le top 100 mondial.', 'medal', 'rare', 'earned', '{"type":"rank_threshold","rank":100}'),
  ('top-50', 'Top 50', 'Classé dans le top 50 mondial.', 'medal', 'epic', 'earned', '{"type":"rank_threshold","rank":50}'),
  ('top-10', 'Top 10', 'Classé dans le top 10 mondial.', 'medal', 'legendary', 'earned', '{"type":"rank_threshold","rank":10}'),
  ('growth-machine', 'Growth Machine', 'Croissance mensuelle de plus de 30 %.', 'flame', 'epic', 'earned', '{"type":"growth_threshold","percent":30}'),
  ('100k-club', '100K Club', 'A franchi 100 000 € de revenus mensuels.', 'trophy', 'legendary', 'earned', '{"type":"revenue_threshold","cents":10000000}'),
  ('the-builder', 'The Builder', 'A vérifié sa première source de revenus.', 'hammer', 'common', 'earned', '{"type":"verification"}'),
  ('the-operator', 'The Operator', '30 jours de revenus vérifiés sans interruption.', 'settings', 'rare', 'earned', '{"type":"consistency","days":30}');

insert into titles (id, name, description, icon, rarity, type, price_cents, supply, remaining_supply, requirement) values
  ('the-business-man', 'The Business Man', 'Un titre unique. Une seule personne au monde le portera.', 'crown', 'exclusive', 'purchasable', 50000, 1, 1, '{}');
