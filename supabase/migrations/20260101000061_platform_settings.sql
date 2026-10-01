-- Platform-wide switches set from the admin (first one: the beta).
-- Readable by anyone (nothing secret), written by the server only.

create table if not exists platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id) on delete set null
);

alter table platform_settings enable row level security;
drop policy if exists "platform settings are publicly readable" on platform_settings;
create policy "platform settings are publicly readable" on platform_settings for select using (true);

insert into platform_settings (key, value)
values ('beta', '{"enabled": false, "since": null}')
on conflict (key) do nothing;
