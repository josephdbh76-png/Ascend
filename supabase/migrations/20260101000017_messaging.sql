-- Instagram-style messaging: a conversation starts "pending" and the
-- requester gets exactly one message before the recipient has replied
-- or explicitly accepted — unless the two already follow each other
-- mutually, in which case it's a normal conversation from the start.
-- The one-message cap itself is enforced in message.service.ts (it
-- needs to read the follows table), not here; RLS only enforces that
-- you can only act within conversations you're a participant of.

create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles (id) on delete cascade,
  user_b uuid not null references profiles (id) on delete cascade,
  requested_by uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create index conversations_user_a_idx on conversations (user_a);
create index conversations_user_b_idx on conversations (user_b);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_conversation_idx on messages (conversation_id, created_at);

alter table conversations enable row level security;
alter table messages enable row level security;

create policy "participants can view their conversations" on conversations
  for select using (auth.uid() = user_a or auth.uid() = user_b);

create policy "participants can create a conversation" on conversations
  for insert with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "participants can update their conversations" on conversations
  for update using (auth.uid() = user_a or auth.uid() = user_b);

create policy "participants can view messages in their conversations" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "participants can send messages in their conversations" on messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "participants can mark messages as read" on messages
  for update using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create trigger conversations_set_updated_at before update on conversations
  for each row execute function set_updated_at();
