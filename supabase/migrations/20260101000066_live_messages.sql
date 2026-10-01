-- Live messaging: new messages, read receipts and accepted requests reach
-- the open conversation without a refresh (Supabase Realtime, which only
-- sends a row to members allowed to read it by the policies below).
--
-- Also closes two holes in the update policies: a participant could edit
-- the text of any message of the conversation (the other person's too), and
-- the requester could accept their own request to get past the one-message
-- rule.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table conversations;
  end if;
end;
$$;

-- Messages: members can only mark as read a message they received.
create or replace function guard_member_message_write()
returns trigger
language plpgsql
as $$
begin
  if is_member_request() then
    if new.body <> old.body
      or new.sender_id <> old.sender_id
      or new.conversation_id <> old.conversation_id
      or new.created_at <> old.created_at then
      raise exception 'only the read receipt can be changed';
    end if;
    if new.read_at is distinct from old.read_at
      and (old.sender_id = auth.uid() or new.read_at is null or old.read_at is not null) then
      raise exception 'only the recipient can mark a message as read';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_guard_member_writes on messages;
create trigger messages_guard_member_writes before update on messages
  for each row execute function guard_member_message_write();

-- Conversations: the participants never change, and a request is accepted
-- by the person who received it (or by either side once they follow each
-- other).
create or replace function guard_member_conversation_write()
returns trigger
language plpgsql
as $$
begin
  if is_member_request() then
    if new.user_a <> old.user_a or new.user_b <> old.user_b or new.requested_by <> old.requested_by then
      raise exception 'participants cannot be changed';
    end if;
    if new.status <> old.status then
      if not (old.status = 'pending' and new.status = 'accepted') then
        raise exception 'a conversation can only go from pending to accepted';
      end if;
      if auth.uid() = old.requested_by and not (
        exists (select 1 from follows f where f.follower_id = old.user_a and f.followee_id = old.user_b)
        and exists (select 1 from follows f where f.follower_id = old.user_b and f.followee_id = old.user_a)
      ) then
        raise exception 'the request is accepted by the person who received it';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists conversations_guard_member_writes on conversations;
create trigger conversations_guard_member_writes before update on conversations
  for each row execute function guard_member_conversation_write();
