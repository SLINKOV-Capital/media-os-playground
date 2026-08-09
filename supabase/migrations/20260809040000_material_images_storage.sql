-- Stable source files uploaded for image Materials.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'material-images',
  'material-images',
  true,
  20971520,
  array['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "material_images_select"
on storage.objects for select
to public
using (bucket_id = 'material-images');

create policy "material_images_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'material-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "material_images_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'material-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'material-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "material_images_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'material-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
