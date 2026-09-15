-- Same missing-INSERT/UPDATE-policy bug as verifications, found by actually
-- exercising a real sync end to end: revenue_snapshots, user_achievements
-- and user_challenges only ever had SELECT policies. Every write from the
-- sync path (upsertMonthlyRevenue, evaluateRevenueAchievements,
-- evaluateRankAchievements, evaluateChallengeProgress) runs as the
-- authenticated user, not the service role, and would have been rejected
-- by RLS the moment it got past the earlier bugs already fixed this
-- session — revenue_snapshots is the one that actually surfaced, because
-- unlike the others it checks its error and throws instead of swallowing
-- it silently.

create policy "users can create their own revenue snapshots" on revenue_snapshots
  for insert with check (auth.uid() = user_id);

create policy "users can update their own revenue snapshots" on revenue_snapshots
  for update using (auth.uid() = user_id);

create policy "users can create their own achievement records" on user_achievements
  for insert with check (auth.uid() = user_id);

create policy "users can update their own achievement records" on user_achievements
  for update using (auth.uid() = user_id);

create policy "users can create their own challenge progress" on user_challenges
  for insert with check (auth.uid() = user_id);

create policy "users can update their own challenge progress" on user_challenges
  for update using (auth.uid() = user_id);
