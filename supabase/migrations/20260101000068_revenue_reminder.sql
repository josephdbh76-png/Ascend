-- Monthly reminder for members who declare their revenue by hand: on the
-- 2nd of each month, if last month isn't declared yet.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (
    type in (
      'achievement_unlocked', 'rank_increased', 'challenge_started',
      'milestone_reached', 'verification_completed', 'new_follower', 'new_message',
      'new_application', 'application_status_changed', 'revenue_review_completed',
      'referral_rewarded', 'payment_refunded', 'season_reward', 'training_review_completed',
      'revenue_reminder'
    )
  );
