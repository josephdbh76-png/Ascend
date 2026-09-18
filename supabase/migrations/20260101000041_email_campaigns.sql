-- Manual email campaigns, composed and sent from the admin panel — RGPD
-- requires explicit opt-in for marketing email (never a default-on
-- checkbox), so marketing_consent defaults to false: every existing and
-- new member is unsubscribed until they actively turn it on in Réglages.
-- unsubscribe_token is the stable, unguessable id a one-click unsubscribe
-- link (reachable with no session — an email client never carries our
-- cookies) uses to identify who's opting out, without needing them to log
-- in first.

alter table profiles add column marketing_consent boolean not null default false;
alter table profiles add column unsubscribe_token uuid not null default gen_random_uuid();

create unique index profiles_unsubscribe_token_idx on profiles (unsubscribe_token);

-- A log of what was sent, to whom (as a filter, not a raw address list),
-- and by which admin — never fabricated, always the real outcome of a
-- real send.
create table email_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  audience text not null,
  recipient_count int not null default 0,
  sent_by uuid not null references profiles (id),
  sent_at timestamptz not null default now()
);

alter table email_campaigns enable row level security;

-- Admin-only in application code (isCurrentUserAdmin() is checked before
-- every call) — RLS still blocks any non-admin from reading history or
-- forging a campaign log entry directly, as a second layer.
create policy "admins can view campaign history" on email_campaigns
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

grant insert on email_campaigns to service_role;
