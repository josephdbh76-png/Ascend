-- Boutique: numbered copies, time-limited sales, Elite-only titles, and the
-- reworked catalogue (smaller editions that can actually sell out, a price
-- ladder from 1 € to 500 €).

-- 1. Numbered copies ---------------------------------------------------------
-- Every copy of a limited title carries its number ("n°7 sur 30"). It
-- follows the copy when it is resold on the Marché.
alter table user_titles add column if not exists edition_number int;
alter table title_listings add column if not exists edition_number int;

-- Founding members keep their founding number; other limited titles already
-- owned are numbered in the order they were obtained.
update user_titles ut
set edition_number = p.founding_member_number
from profiles p
where ut.title_id = 'founding-member' and ut.user_id = p.id and ut.edition_number is null;

with ranked as (
  select ut.id, row_number() over (partition by ut.title_id order by ut.acquired_at, ut.id) as n
  from user_titles ut
  join titles t on t.id = ut.title_id
  where t.supply is not null and ut.title_id <> 'founding-member' and ut.edition_number is null
)
update user_titles ut set edition_number = ranked.n from ranked where ut.id = ranked.id;

create unique index if not exists user_titles_edition_unique
  on user_titles (title_id, edition_number) where edition_number is not null;

-- Numbers every new copy of a limited title, whatever grants it (purchase,
-- earned, admin): the lowest number not taken. A resale passes its number in.
create or replace function assign_title_edition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t_supply int;
begin
  if new.edition_number is not null then
    return new;
  end if;

  -- Locks the title row: two copies granted at once can't take one number.
  select supply into t_supply from titles where id = new.title_id for update;
  if t_supply is null then
    return new;
  end if;

  if new.title_id = 'founding-member' then
    new.edition_number := (select founding_member_number from profiles where id = new.user_id);
    return new;
  end if;

  new.edition_number := (
    select min(n)
    from generate_series(1, t_supply) as n
    where not exists (select 1 from user_titles where title_id = new.title_id and edition_number = n)
  );
  return new;
end;
$$;

drop trigger if exists user_titles_assign_edition on user_titles;
create trigger user_titles_assign_edition
  before insert on user_titles
  for each row execute function assign_title_edition();

-- 2. Sale windows and member-only titles ----------------------------------
-- sale_starts_at / sale_ends_at: on sale only in between (either may be
-- empty). launch_sale_days: on sale N days from the official launch; the
-- dates are set when the admin turns the beta off.
alter table titles add column if not exists sale_starts_at timestamptz;
alter table titles add column if not exists sale_ends_at timestamptz;
alter table titles add column if not exists launch_sale_days int check (launch_sale_days > 0);
alter table titles add column if not exists required_tier text check (required_tier in ('pro', 'elite'));

-- 3. Catalogue -----------------------------------------------------------
-- An open edition is always in stock: reselling it means nothing.
update titles set tradeable = false where id = 'the-spark';

-- Copies already sold (none so far) are kept when an edition shrinks.
update titles
set supply = 100, remaining_supply = greatest(100 - (supply - remaining_supply), 0)
where id = 'the-ambitious';

update titles
set price_cents = 4900, supply = 30, remaining_supply = greatest(30 - (supply - remaining_supply), 0)
where id = 'the-insider';

insert into titles (id, name, description, icon, rarity, type, price_cents, supply, remaining_supply, requirement, tradeable, launch_sale_days, sale_ends_at, required_tier) values
  ('pionnier', 'Pionnier', 'Présent dès l''ouverture d''ASCEND. En vente 7 jours au lancement, jamais réédité.', 'rocket', 'epic', 'purchasable', 2900, 100, 100, '{}', true, 7, null, null),
  ('collector-saison-01', 'Collector · Saison 01', 'L''édition de la première saison d''ASCEND. En vente jusqu''à la fin de la saison.', 'star', 'rare', 'purchasable', 2500, 50, 50, '{}', true, null, '2026-11-30 23:59:59+01', null),
  ('elite-circle', 'Elite Circle', 'Le cercle des membres Elite d''ASCEND.', 'shield', 'legendary', 'purchasable', 9900, 25, 25, '{}', true, null, null, 'elite'),
  ('cercle-des-10', 'Le Cercle des 10', 'Dix exemplaires. Pas un de plus.', 'award', 'legendary', 'purchasable', 19900, 10, 10, '{}', true, null, null, null)
on conflict (id) do nothing;

-- 4. A member can't renumber their own copy -------------------------------
-- Same guard as before, now covering edition_number: a member still only
-- chooses which of their titles is displayed.
create or replace function guard_member_user_title_write()
returns trigger
language plpgsql
as $$
begin
  if is_member_request() and (
    new.user_id <> old.user_id
    or new.title_id <> old.title_id
    or new.acquisition_type <> old.acquisition_type
    or new.acquired_at <> old.acquired_at
    or new.edition_number is distinct from old.edition_number
  ) then
    raise exception 'only the displayed title can be changed';
  end if;
  return new;
end;
$$;
