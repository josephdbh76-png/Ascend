-- Gives the "Membre fondateur" title real, database-tracked scarcity.
-- assign_founding_member_number() already caps founding numbers at 500,
-- but nothing decremented titles.remaining_supply for it, so the
-- "X / 500 exemplaires" UI (built for purchasable titles) never reflected
-- the real countdown. This backfills the current count and keeps it live
-- going forward via a trigger on user_titles, mirroring the pattern
-- purchase_exclusive_title() already uses for paid titles.

update titles
set supply = 500,
    remaining_supply = greatest(500 - (select count(*) from profiles where founding_member_number is not null), 0)
where id = 'founding-member';

create or replace function decrement_founding_member_supply()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.title_id = 'founding-member' then
    update titles
    set remaining_supply = greatest(remaining_supply - 1, 0)
    where id = 'founding-member' and remaining_supply is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists user_titles_decrement_founding_supply on user_titles;
create trigger user_titles_decrement_founding_supply after insert on user_titles
  for each row execute function decrement_founding_member_supply();
