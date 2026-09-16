-- Lets a member without Stripe (or any other unsupported processor) still
-- participate: a monthly self-reported revenue amount, optionally backed
-- by an uploaded proof document, stored as a 'manual' revenue_sources row
-- (a provider the schema already allowed for, but nothing implemented).
-- Kept out of is_verified/revenue_verified on purpose — self-reported
-- numbers stay labeled "Déclaré", distinct from Stripe's "Vérifié",
-- everywhere the app shows that distinction. Whether to fold declared
-- revenue into the public leaderboard is a bigger call left for later.

alter table revenue_snapshots add column proof_path text;

insert into storage.buckets (id, name, public)
values ('revenue-proofs', 'revenue-proofs', false)
on conflict (id) do nothing;

create policy "users can upload their own revenue proofs" on storage.objects
  for insert with check (bucket_id = 'revenue-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can view their own revenue proofs" on storage.objects
  for select using (bucket_id = 'revenue-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can replace their own revenue proofs" on storage.objects
  for update using (bucket_id = 'revenue-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own revenue proofs" on storage.objects
  for delete using (bucket_id = 'revenue-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
