-- Revenue proofs also accept CSV exports (Whop, Stripe, Gumroad payments).
-- (Applied to production through the storage API on 2026-10-01; safe to re-run.)
update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/csv', 'application/vnd.ms-excel']
where id = 'revenue-proofs';
