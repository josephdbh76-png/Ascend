-- The founding-member counter was decremented on every profile insert and
-- never given back: deleted accounts (tests, spam, members who left) kept
-- eating slots, so "places restantes" drifted below reality. It is now
-- recomputed from the real members after every change to profiles.

create or replace function assign_founding_member_number()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  next_number int;
begin
  select coalesce(max(founding_member_number), 0) + 1 into next_number from profiles;
  if next_number <= 500 then
    new.founding_member_number := next_number;
  end if;
  return new;
end;
$$;

create or replace function recount_founding_supply()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update titles
  set remaining_supply = greatest(
    supply - (select count(*) from profiles where founding_member_number is not null and is_demo = false),
    0
  )
  where id = 'founding-member' and supply is not null;
  return null;
end;
$$;

drop trigger if exists profiles_recount_founding_supply on profiles;
create trigger profiles_recount_founding_supply
  after insert or delete or update of is_demo on profiles
  for each statement execute function recount_founding_supply();

update titles
set remaining_supply = greatest(
  supply - (select count(*) from profiles where founding_member_number is not null and is_demo = false),
  0
)
where id = 'founding-member' and supply is not null;
