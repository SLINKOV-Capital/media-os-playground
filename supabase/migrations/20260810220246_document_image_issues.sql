create table public.document_image_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  image_number integer not null check (image_number > 0),
  alt text not null default '',
  title text,
  original_src text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, image_number)
);

create index document_image_issues_document_idx
  on public.document_image_issues (document_id, image_number);

create trigger document_image_issues_set_updated_at
before update on public.document_image_issues
for each row execute function set_updated_at();

alter table public.document_image_issues enable row level security;

revoke all on table public.document_image_issues from anon;
grant select, insert, update, delete on table public.document_image_issues to authenticated;

create policy "document_image_issues_select_own"
on public.document_image_issues for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "document_image_issues_insert_own"
on public.document_image_issues for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.documents d
    where d.id = document_id and d.user_id = (select auth.uid())
  )
);

create policy "document_image_issues_update_own"
on public.document_image_issues for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.documents d
    where d.id = document_id and d.user_id = (select auth.uid())
  )
);

create policy "document_image_issues_delete_own"
on public.document_image_issues for delete
to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'document-image-imports',
  'document-image-imports',
  false,
  20971520,
  array['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "document_image_imports_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'document-image-imports'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "document_image_imports_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'document-image-imports'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "document_image_imports_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'document-image-imports'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);
