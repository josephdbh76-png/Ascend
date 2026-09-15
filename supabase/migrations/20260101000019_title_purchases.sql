-- Wires purchasable titles up to real Stripe payments, and fixes the
-- founding-member counter never moving.

-- 1. Real payments for purchasable titles ------------------------------
-- purchase_exclusive_title() let ANY authenticated user claim a title for
-- free by calling the RPC directly (nothing enforced payment — it relied
-- entirely on the client-side button being disabled). Now that titles are
-- genuinely for sale, that's an actual free-claim exploit, so it's revoked.
-- grant_purchased_title() replaces it: callable only by the service role,
-- only from the Stripe webhook after a real Checkout Session has been
-- paid. It's idempotent (a webhook can be delivered more than once) — a
-- user who already owns the title short-circuits to success without
-- decrementing supply again.

revoke execute on function purchase_exclusive_title(text) from authenticated;

alter table titles add column stripe_price_id text;

create or replace function grant_purchased_title(p_user_id uuid, p_title_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows int;
begin
  if exists (select 1 from user_titles where user_id = p_user_id and title_id = p_title_id) then
    return true;
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
  values (p_user_id, p_title_id, 'purchased')
  on conflict (user_id, title_id) do nothing;

  return true;
end;
$$;

revoke all on function grant_purchased_title(uuid, text) from public, authenticated, anon;
grant execute on function grant_purchased_title(uuid, text) to service_role;

-- 2. Fix the founding-member counter ------------------------------------
-- remaining_supply for 'founding-member' was only ever decremented when
-- the ACHIEVEMENT/title itself got granted (via a trigger on user_titles
-- insert) — but that only happens during a Stripe revenue sync. The real
-- 500-slot cap is actually consumed at SIGNUP time, by
-- assign_founding_member_number(). The two never matched, so the counter
-- froze at 498 as soon as it was seeded, no matter how many people joined.
-- Fix: decrement directly in assign_founding_member_number() instead, and
-- drop the old (now redundant, and wrongly-timed) trigger.

drop trigger if exists user_titles_decrement_founding_supply on user_titles;
drop function if exists decrement_founding_member_supply();

create or replace function assign_founding_member_number()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  next_number int;
  member_limit int := 500;
begin
  select coalesce(max(founding_member_number), 0) + 1 into next_number from profiles;
  if next_number <= member_limit then
    new.founding_member_number := next_number;
    update titles
    set remaining_supply = greatest(remaining_supply - 1, 0)
    where id = 'founding-member' and remaining_supply is not null;
  end if;
  return new;
end;
$$;

-- One-time resync to the true current count (recomputes from scratch
-- rather than trusting whatever the frozen counter drifted to).
update titles
set remaining_supply = greatest(500 - (select count(*) from profiles where founding_member_number is not null), 0)
where id = 'founding-member';
