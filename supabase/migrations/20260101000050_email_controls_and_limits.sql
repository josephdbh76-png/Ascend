-- Two independent layers of control over automated emails: an
-- admin-wide kill switch per email type (this table — absence of a row
-- means "enabled", so new email types work by default without a
-- migration), and a per-member granular opt-out (profiles column below,
-- same absence-means-enabled convention) layered on top of the existing
-- blanket email_notifications_enabled master switch.
create table automated_email_settings (
  email_key text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table automated_email_settings enable row level security;

create policy "admins can view automated email settings" on automated_email_settings
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

grant insert, update on automated_email_settings to service_role;

alter table profiles add column notification_email_prefs jsonb not null default '{}'::jsonb;
