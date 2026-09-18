-- Optional attachments on an opportunity application — a portfolio, a
-- cover letter, a work sample — alongside the plain-text message. One
-- application can carry several files, each reviewed independently of the
-- message itself. Mirrors the revenue-proofs storage pattern: a private
-- bucket, RLS scoped to the uploader's own folder for writes, and the
-- opportunity's author reads via a server-generated signed URL (checked in
-- application code, the same way admin revenue-proof review already
-- works) rather than a broader storage policy.

create table opportunity_application_attachments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references opportunity_applications (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size bigint not null,
  content_type text not null,
  created_at timestamptz not null default now()
);

create index opportunity_application_attachments_application_idx
  on opportunity_application_attachments (application_id);

alter table opportunity_application_attachments enable row level security;

create policy "applicants can add attachments to their own applications" on opportunity_application_attachments
  for insert with check (
    exists (
      select 1 from opportunity_applications a
      where a.id = application_id and a.applicant_id = auth.uid()
    )
  );

create policy "applicants and the opportunity author can view attachments" on opportunity_application_attachments
  for select using (
    exists (
      select 1 from opportunity_applications a
      join opportunities o on o.id = a.opportunity_id
      where a.id = application_id and (a.applicant_id = auth.uid() or o.author_id = auth.uid())
    )
  );

insert into storage.buckets (id, name, public)
values ('opportunity-attachments', 'opportunity-attachments', false)
on conflict (id) do nothing;

create policy "applicants can upload their own opportunity attachments" on storage.objects
  for insert with check (bucket_id = 'opportunity-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "applicants can view their own opportunity attachments" on storage.objects
  for select using (bucket_id = 'opportunity-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "applicants can delete their own opportunity attachments" on storage.objects
  for delete using (bucket_id = 'opportunity-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
