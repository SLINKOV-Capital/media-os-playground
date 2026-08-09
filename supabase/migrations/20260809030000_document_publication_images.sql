-- Autonomous publication images for Documents.
-- Materials are optional import sources and are not publication assets.

create table public.document_publication_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  source_material_id uuid references public.materials (id) on delete set null,
  role text not null,
  title text,
  alt text not null default '',
  sort_order integer not null default 0,
  storage_path text not null,
  image_url text not null,
  width integer not null,
  height integer not null,
  status text not null default 'ready',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_publication_images_role_check
    check (role in ('cover', 'illustration')),
  constraint document_publication_images_status_check
    check (status in ('processing', 'ready', 'error')),
  constraint document_publication_images_dimensions_check
    check (width > 0 and height > 0)
);

create unique index document_publication_images_one_cover_idx
  on public.document_publication_images (document_id)
  where role = 'cover';

create index document_publication_images_document_order_idx
  on public.document_publication_images (document_id, role, sort_order, created_at);

create index document_publication_images_source_material_idx
  on public.document_publication_images (source_material_id)
  where source_material_id is not null;

create trigger document_publication_images_set_updated_at
before update on public.document_publication_images
for each row execute function set_updated_at();

create or replace function public.validate_document_publication_image_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_material_id is not null
    and (tg_op = 'INSERT' or old.source_material_id is distinct from new.source_material_id)
    and not exists (
      select 1
      from public.materials m
      join public.document_materials dm
        on dm.material_id = m.id
       and dm.document_id = new.document_id
       and dm.user_id = new.user_id
      where m.id = new.source_material_id
        and m.user_id = new.user_id
        and m.material_type = 'image'
    )
  then
    raise exception 'Publication image source must be a linked image Material'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger document_publication_images_validate_source
before insert or update of source_material_id
on public.document_publication_images
for each row execute function public.validate_document_publication_image_source();

alter table public.document_publication_images enable row level security;

create policy "document_publication_images_select_own"
on public.document_publication_images for select
using (auth.uid() = user_id);

create policy "document_publication_images_insert_own"
on public.document_publication_images for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.documents d
    where d.id = document_id and d.user_id = auth.uid()
  )
);

create policy "document_publication_images_update_own"
on public.document_publication_images for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.documents d
    where d.id = document_id and d.user_id = auth.uid()
  )
);

create policy "document_publication_images_delete_own"
on public.document_publication_images for delete
using (auth.uid() = user_id);

create policy "document_publication_images_select_published"
on public.document_publication_images for select
to anon, authenticated
using (
  exists (
    select 1 from public.documents d
    where d.id = document_id and d.site_status = 'published'
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'document-images',
  'document-images',
  true,
  5242880,
  array['image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "document_images_select"
on storage.objects for select
to public
using (bucket_id = 'document-images');

create policy "document_images_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'document-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "document_images_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'document-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'document-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "document_images_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'document-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
