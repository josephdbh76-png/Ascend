-- A title nobody ever manually activates never shows up anywhere (profile,
-- leaderboard, network) — most members never think to flip that switch in
-- Titres. grant_purchased_title() now auto-activates a purchase when the
-- buyer has no active title yet (mirrors the same fix already made to the
-- earned-title path in title.service.ts). Also backfills every existing
-- member who owns a title but has none active, activating their oldest one.

create or replace function grant_purchased_title(p_user_id uuid, p_title_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_eligible boolean;
  has_active boolean;
begin
  if exists (select 1 from user_titles where user_id = p_user_id and title_id = p_title_id) then
    return true;
  end if;

  select (type = 'purchasable' and (remaining_supply is null or remaining_supply > 0))
    into is_eligible
  from titles
  where id = p_title_id;

  if is_eligible is not true then
    return false;
  end if;

  update titles
  set remaining_supply = remaining_supply - 1
  where id = p_title_id
    and remaining_supply is not null
    and remaining_supply > 0;

  select exists(select 1 from user_titles where user_id = p_user_id and is_active = true) into has_active;

  insert into user_titles (user_id, title_id, acquisition_type, is_active)
  values (p_user_id, p_title_id, 'purchased', not has_active)
  on conflict (user_id, title_id) do nothing;

  return true;
end;
$$;

with first_title as (
  select distinct on (user_id) user_id, id
  from user_titles
  order by user_id, acquired_at asc
)
update user_titles ut
set is_active = true
from first_title ft
where ut.id = ft.id
  and not exists (
    select 1 from user_titles ut2 where ut2.user_id = ft.user_id and ut2.is_active = true
  );
