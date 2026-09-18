-- Two additions on top of the manual campaign tool:
--
-- 1. Automatic transactional emails (welcome, new follower, new message,
--    application received/accepted/declined, revenue verified) — these are
--    a direct result of the member's own account activity, not marketing,
--    so they don't need the marketing_consent opt-in. They get their own
--    opt-out instead, defaulting to on (the expected behavior — a member
--    who didn't ask to stop hearing about their own account activity
--    shouldn't be silently cut off).
--
-- 2. Reusable email templates for the admin campaign composer, so a
--    campaign's subject/body can be saved and loaded again later instead
--    of retyped from scratch every time.

alter table profiles add column email_notifications_enabled boolean not null default true;

create table email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body text not null,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table email_templates enable row level security;

-- Admin-only in application code; RLS is the second layer, same pattern as
-- email_campaigns.
create policy "admins can manage email templates" on email_templates
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create trigger email_templates_set_updated_at before update on email_templates
  for each row execute function set_updated_at();
