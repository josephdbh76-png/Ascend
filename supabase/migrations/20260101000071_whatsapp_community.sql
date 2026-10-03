-- Elite WhatsApp community: the number each Elite member joins with, so the
-- team can accept their join request on WhatsApp and remove them once they
-- are no longer Elite. A row outlives a deleted account only until the team
-- has removed that number from the community, then it is deleted.
create table if not exists whatsapp_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references profiles (id) on delete set null,
  -- "Prénom Nom (@pseudo)" when the number was given: who to remove if the
  -- account is deleted meanwhile.
  display_name text not null,
  phone text not null,
  requested_at timestamptz not null default now(),
  -- Set by the team once the join request is accepted on WhatsApp.
  added_at timestamptz,
  -- The member asked to leave: the team removes them, then the row goes.
  leave_requested_at timestamptz
);

alter table whatsapp_members enable row level security;

-- Members read their own row; every write goes through the server, which
-- checks the Elite plan first.
drop policy if exists "members read their own whatsapp row" on whatsapp_members;
create policy "members read their own whatsapp row" on whatsapp_members
  for select using (auth.uid() = user_id);
