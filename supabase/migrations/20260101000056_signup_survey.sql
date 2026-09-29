-- Short signup questionnaire (acquisition channel, payment platforms,
-- revenue bracket, goal). One row per member, exported by admins as CSV
-- to steer marketing and which integrations to build next.
create table signup_surveys (
  user_id uuid primary key references profiles(id) on delete cascade,
  discovery_source text not null,
  referrer_name text,
  payment_platforms text[] not null default '{}',
  monthly_revenue_range text not null,
  main_goal text not null,
  created_at timestamptz not null default now()
);

alter table signup_surveys enable row level security;

create policy "members insert own survey" on signup_surveys
  for insert with check (auth.uid() = user_id);

create policy "members update own survey" on signup_surveys
  for update using (auth.uid() = user_id);

create policy "members view own survey" on signup_surveys
  for select using (auth.uid() = user_id);

create policy "admins view all surveys" on signup_surveys
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );
