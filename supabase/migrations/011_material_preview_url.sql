-- Media OS — material preview_url + Storage bucket material-previews

alter table materials
  add column if not exists preview_url text;

comment on column materials.preview_url is
  'Public URL of thumbnail in Supabase Storage (bucket material-previews).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'material-previews',
  'material-previews',
  true,
  524288,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: {user_id}/{material_id}/preview.webp

drop policy if exists "material_previews_select" on storage.objects;
drop policy if exists "material_previews_insert_own" on storage.objects;
drop policy if exists "material_previews_update_own" on storage.objects;
drop policy if exists "material_previews_delete_own" on storage.objects;

create policy "material_previews_select"
on storage.objects for select
to public
using (bucket_id = 'material-previews');

create policy "material_previews_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'material-previews'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "material_previews_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'material-previews'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'material-previews'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "material_previews_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'material-previews'
  and auth.uid()::text = (storage.foldername(name))[1]
);
