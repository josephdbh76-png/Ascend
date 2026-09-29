-- Automatic refunds when a paid title/listing is no longer available.
alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (
    type in (
      'achievement_unlocked', 'rank_increased', 'challenge_started',
      'milestone_reached', 'verification_completed', 'new_follower', 'new_message',
      'new_application', 'application_status_changed', 'revenue_review_completed',
      'referral_rewarded', 'payment_refunded'
    )
  );

-- Atomic stock check: two buyers paying for the last copy at the same time
-- could both pass the eligibility read. The decrement itself now decides;
-- the loser gets false and is refunded by the webhook.
create or replace function grant_purchased_title(p_user_id uuid, p_title_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  t_type text;
  t_remaining int;
  updated_rows int;
  has_active boolean;
begin
  if exists (select 1 from user_titles where user_id = p_user_id and title_id = p_title_id) then
    return true;
  end if;

  select type, remaining_supply into t_type, t_remaining from titles where id = p_title_id;
  if t_type is distinct from 'purchasable' then
    return false;
  end if;

  if t_remaining is not null then
    update titles
    set remaining_supply = remaining_supply - 1
    where id = p_title_id and remaining_supply > 0;
    get diagnostics updated_rows = row_count;
    if updated_rows = 0 then
      return false;
    end if;
  end if;

  select exists(select 1 from user_titles where user_id = p_user_id and is_active = true) into has_active;

  insert into user_titles (user_id, title_id, acquisition_type, is_active)
  values (p_user_id, p_title_id, 'purchased', not has_active)
  on conflict (user_id, title_id) do nothing;

  return true;
end;
$$;

revoke all on function grant_purchased_title(uuid, text) from public, authenticated, anon;
grant execute on function grant_purchased_title(uuid, text) to service_role;
