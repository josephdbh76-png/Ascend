-- Publishing an opportunity was open to every member — only the Découvrir
-- catalog was Elite-gated, which let a free member post an ad nobody but
-- Elite members could ever see, and gave them no reason to upgrade. The
-- whole feature is marketed as an Elite perk ("Fil d'opportunités"), so
-- publishing is now gated the same way applying already is.

drop policy "members can publish opportunities" on opportunities;

create policy "elite members can publish opportunities" on opportunities
  for insert with check (
    auth.uid() = author_id
    and exists (select 1 from subscriptions s where s.user_id = auth.uid() and s.tier = 'elite' and s.status = 'active')
  );
