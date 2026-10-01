-- Size and type limits on every upload bucket. Files now go straight from
-- the browser to storage with a signed upload (a server action is capped at
-- 1 MB), so the bucket itself enforces what each one accepts.
-- (Applied to production through the storage API on 2026-10-01; safe to re-run.)

update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id in ('admin-media', 'avatars', 'training-covers');

update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
where id = 'revenue-proofs';

update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
where id = 'opportunity-attachments';
