-- Fixes two bugs found while debugging a false "Vérifié" badge:
--
-- 1. `verifications` only ever had a SELECT policy — no INSERT or UPDATE
--    policy existed, so every write from stripe.service.ts (running as the
--    authenticated user, not the service role) was silently rejected by
--    RLS. Supabase's upsert()/update() don't throw on a rejected write
--    unless the caller checks `.error`, which this code never did, so the
--    table has been empty for every user since the feature was built —
--    getVerificationStatus() always fell back to "unverified" regardless
--    of what actually happened during a sync.
--
-- 2. profiles.revenue_verified was set to true whenever the Stripe API
--    call succeeded, even with zero charges returned — "the request didn't
--    error" isn't the same as "revenue was verified". Fixed in
--    stripe.service.ts; this migration only covers the RLS gap and
--    resets any profile that got marked verified with no backing data.

create policy "users can create verifications for their own sources" on verifications
  for insert with check (
    exists (
      select 1 from revenue_sources rs
      where rs.id = verifications.revenue_source_id and rs.user_id = auth.uid()
    )
  );

create policy "users can update verifications for their own sources" on verifications
  for update using (
    exists (
      select 1 from revenue_sources rs
      where rs.id = verifications.revenue_source_id and rs.user_id = auth.uid()
    )
  );

-- Clear the false-positive: verified with no revenue_snapshots at all.
update profiles
set revenue_verified = false
where revenue_verified = true
  and id not in (select distinct user_id from revenue_snapshots);
