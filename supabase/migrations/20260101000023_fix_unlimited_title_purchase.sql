-- grant_purchased_title() required remaining_supply to be non-null before
-- granting anything — which silently rejected every purchase of an
-- unlimited-supply title (remaining_supply is null by design, e.g. "The
-- Spark"). The webhook still returned 200 to Stripe (payment genuinely
-- succeeded), so the failure was invisible: no error anywhere, just no
-- title. Fixed to treat "unlimited" as always eligible, only touching
-- remaining_supply when the title actually has a finite one.

create or replace function grant_purchased_title(p_user_id uuid, p_title_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_eligible boolean;
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

  insert into user_titles (user_id, title_id, acquisition_type)
  values (p_user_id, p_title_id, 'purchased')
  on conflict (user_id, title_id) do nothing;

  return true;
end;
$$;
