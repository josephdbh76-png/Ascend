-- Two public buckets (read access bypasses RLS entirely for a public
-- bucket — these policies only govern who can write): one self-service
-- per-member (avatars), one admin-only for anything shown platform-wide
-- (deal cover images, dashboard banners).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "users can upload their own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can replace their own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own avatar" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

insert into storage.buckets (id, name, public)
values ('admin-media', 'admin-media', true)
on conflict (id) do nothing;

-- Uploaded exclusively through server actions that already check
-- isCurrentUserAdmin() with the service-role client — no direct-client
-- write policy needed here, service_role bypasses RLS by default.

-- "Bons plans du moment" / actualités carousel on the dashboard home —
-- empty table means the dashboard shows nothing different, exactly as
-- today.
create table dashboard_banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text not null,
  subtitle text,
  link_url text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table dashboard_banners enable row level security;

create policy "members can view active banners" on dashboard_banners
  for select using (is_active = true);

create policy "admins can view all banners" on dashboard_banners
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

grant insert, update, delete on dashboard_banners to service_role;
