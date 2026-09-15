-- Adds notification types for two events that previously produced no
-- notification at all: gaining a follower, and receiving a message.

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (
    type in (
      'achievement_unlocked', 'rank_increased', 'challenge_started',
      'milestone_reached', 'verification_completed', 'new_follower', 'new_message'
    )
  );
