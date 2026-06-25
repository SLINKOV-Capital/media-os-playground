-- Media OS — public site fields on documents + RLS for published content

alter table documents
  add column content_md text,
  add column preview text,
  add column site_status text not null default 'draft',
  add column site_slug text,
  add column site_published_at timestamptz,
  add column site_featured boolean not null default false;

alter table documents
  add constraint documents_site_status_check
  check (site_status in ('draft', 'published'));

comment on column documents.content_md is
  'Markdown body for public site. Single source of truth — no separate CMS copy.';

comment on column documents.preview is
  'Short lead / card description for public site.';

comment on column documents.site_status is
  'draft | published — controls visibility on public site.';

comment on column documents.site_slug is
  'URL slug for /p/[slug]. Set on first publish; immutable after site_published_at is set.';

comment on column documents.site_published_at is
  'Timestamp of first publication. Slug and document_type locked once set.';

comment on column documents.site_featured is
  'Show on public homepage featured section when published.';

create unique index documents_site_slug_published_idx
  on documents (site_slug)
  where site_status = 'published' and site_slug is not null;

create index documents_site_published_list_idx
  on documents (site_published_at desc nulls last)
  where site_status = 'published';

create index documents_site_featured_idx
  on documents (site_featured)
  where site_status = 'published' and site_featured = true;

-- Public read: published documents (anon + authenticated)
create policy "documents_select_published"
on documents for select
to anon, authenticated
using (site_status = 'published');

-- Public read: materials linked to published documents
create policy "document_materials_select_published"
on document_materials for select
to anon, authenticated
using (
  exists (
    select 1
    from documents d
    where d.id = document_id
      and d.site_status = 'published'
  )
);

create policy "materials_select_published"
on materials for select
to anon, authenticated
using (
  exists (
    select 1
    from document_materials dm
    join documents d on d.id = dm.document_id
    where dm.material_id = materials.id
      and d.site_status = 'published'
  )
);

create or replace function prevent_published_document_delete()
returns trigger
language plpgsql
as $$
begin
  if old.site_published_at is not null then
    raise exception 'Cannot delete document that was published on the public site';
  end if;

  return old;
end;
$$;

create trigger documents_prevent_delete_published
before delete on documents
for each row
execute function prevent_published_document_delete();
