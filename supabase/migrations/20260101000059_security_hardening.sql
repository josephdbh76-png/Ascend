-- SECURITY: revenue, verification, company badge and progression are now
-- written by the server only. Before this, any member could use the public
-- API with their own session to make themselves admin, mark themselves
-- verified, insert fake verified revenue, complete challenges and grant
-- themselves titles and achievements (all confirmed on production).

drop policy if exists "users can create their own revenue snapshots" on revenue_snapshots;
drop policy if exists "users can update their own revenue snapshots" on revenue_snapshots;
drop policy if exists "users can create their own revenue source snapshots" on revenue_source_snapshots;
drop policy if exists "users can update their own revenue source snapshots" on revenue_source_snapshots;
drop policy if exists "users can create verifications for their own sources" on verifications;
drop policy if exists "users can update verifications for their own sources" on verifications;
drop policy if exists "users can create their own bank transactions" on bank_transactions;
drop policy if exists "users can create their own bank connections" on bank_connections;
drop policy if exists "users can update their own bank connections" on bank_connections;
drop policy if exists "users can create their own achievement records" on user_achievements;
drop policy if exists "users can update their own achievement records" on user_achievements;
drop policy if exists "users can create their own challenge progress" on user_challenges;
drop policy if exists "users can update their own challenge progress" on user_challenges;
drop policy if exists "users can claim their own earned titles" on user_titles;

-- Manual declarations always start pending.
drop policy if exists "users can create their own revenue declarations" on revenue_declarations;
drop policy if exists "users can create their own pending revenue declarations" on revenue_declarations;
create policy "users can create their own pending revenue declarations" on revenue_declarations
  for insert with check (
    auth.uid() = user_id and review_status = 'pending' and reviewed_at is null and reviewed_by is null
  );

-- True for requests made with a member's (or anonymous) token; false for
-- the service role and for direct SQL.
create or replace function is_member_request()
returns boolean
language sql
stable
as $$
  select coalesce(auth.role(), '') in ('authenticated', 'anon');
$$;

-- Profiles: members keep editing their own profile, never the privileged flags.
create or replace function guard_member_profile_write()
returns trigger
language plpgsql
as $$
begin
  if not is_member_request() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_admin := false;
    new.is_cofounder := false;
    new.is_demo := false;
    new.revenue_verified := false;
    new.founding_member_number := null;
    new.pro_credit_until := null;
  else
    new.is_admin := old.is_admin;
    new.is_cofounder := old.is_cofounder;
    new.is_demo := old.is_demo;
    new.revenue_verified := old.revenue_verified;
    new.founding_member_number := old.founding_member_number;
    new.pro_credit_until := old.pro_credit_until;
    new.referred_by := old.referred_by;
  end if;
  return new;
end;
$$;

-- Named to fire before profiles_assign_founding_number (triggers run in name order).
drop trigger if exists profiles_a_guard_member_writes on profiles;
create trigger profiles_a_guard_member_writes before insert or update on profiles
  for each row execute function guard_member_profile_write();

-- Businesses: the "verified company" badge is only set by the SIRET check.
create or replace function guard_member_business_write()
returns trigger
language plpgsql
as $$
begin
  if not is_member_request() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.siret := null;
    new.legal_name := null;
    new.siret_verified_at := null;
  else
    new.siret := old.siret;
    new.legal_name := old.legal_name;
    new.siret_verified_at := old.siret_verified_at;
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_guard_member_writes on businesses;
create trigger businesses_guard_member_writes before insert or update on businesses
  for each row execute function guard_member_business_write();

-- Revenue sources: members may only create/update their manual source and
-- disconnect the others. Connections (and their account ids) are written
-- by the server after a real OAuth / credential check.
create or replace function guard_member_revenue_source_write()
returns trigger
language plpgsql
as $$
begin
  if not is_member_request() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.provider <> 'manual' or new.external_account_id is not null then
      raise exception 'revenue sources are created by the server';
    end if;
    return new;
  end if;
  if new.user_id <> old.user_id
     or new.provider <> old.provider
     or new.external_account_id is distinct from old.external_account_id
     or new.is_test_mode <> old.is_test_mode then
    raise exception 'revenue sources are managed by the server';
  end if;
  if new.status is distinct from old.status and new.status <> 'disconnected' and new.provider <> 'manual' then
    raise exception 'members can only disconnect a revenue source';
  end if;
  return new;
end;
$$;

drop trigger if exists revenue_sources_guard_member_writes on revenue_sources;
create trigger revenue_sources_guard_member_writes before insert or update on revenue_sources
  for each row execute function guard_member_revenue_source_write();

-- Titles: a member can only choose which of their titles is displayed.
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
  ) then
    raise exception 'only the displayed title can be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists user_titles_guard_member_writes on user_titles;
create trigger user_titles_guard_member_writes before update on user_titles
  for each row execute function guard_member_user_title_write();

-- Bank transactions: a member can only tag a transaction as revenue or not.
create or replace function guard_member_bank_transaction_write()
returns trigger
language plpgsql
as $$
begin
  if is_member_request() and (
    new.user_id <> old.user_id
    or new.revenue_source_id <> old.revenue_source_id
    or new.external_id <> old.external_id
    or new.account_id <> old.account_id
    or new.booking_date <> old.booking_date
    or new.amount_cents <> old.amount_cents
    or new.currency <> old.currency
  ) then
    raise exception 'only the revenue tag can be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists bank_transactions_guard_member_writes on bank_transactions;
create trigger bank_transactions_guard_member_writes before update on bank_transactions
  for each row execute function guard_member_bank_transaction_write();
