-- Manual revenue declarations now require proof (enforced in the app
-- layer) and go through an admin review queue rather than sitting
-- self-reported forever. Approved declarations are promoted to real
-- verified status (same as Stripe) since a human has now confirmed them —
-- rejected ones stay excluded and the member is told why.

alter table revenue_snapshots add column review_status text check (review_status in ('pending', 'approved', 'rejected'));
alter table revenue_snapshots add column reviewed_at timestamptz;
alter table revenue_snapshots add column reviewed_by uuid references profiles (id);
alter table revenue_snapshots add column rejection_reason text;

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (
    type in (
      'achievement_unlocked', 'rank_increased', 'challenge_started',
      'milestone_reached', 'verification_completed', 'new_follower', 'new_message',
      'new_application', 'application_status_changed', 'revenue_review_completed'
    )
  );
