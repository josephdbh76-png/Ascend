-- Subscription tier is tracked independently of authentication: a user is
-- always either authenticated or not, and separately always on some plan
-- (free by default). This table is what settings/pricing read from — it is
-- never inferred from whether the user is merely logged in.

create table subscriptions (
  user_id uuid primary key references profiles (id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro', 'elite')),
  status text not null default 'active' check (status in ('active', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy "users can view their own subscription" on subscriptions
  for select using (auth.uid() = user_id);

create trigger subscriptions_set_updated_at before update on subscriptions
  for each row execute function set_updated_at();

-- Every new profile starts on the free tier, same pattern as privacy_settings.
create or replace function ensure_subscription()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profiles_ensure_subscription after insert on profiles
  for each row execute function ensure_subscription();
