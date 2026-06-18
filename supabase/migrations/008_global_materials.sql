-- Media OS v0.3 — global materials via document_materials
-- materials.document_id remains deprecated; not dropped.

create table document_materials (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  material_id uuid not null references materials (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (document_id, material_id)
);

create index document_materials_document_id_idx on document_materials (document_id);
create index document_materials_material_id_idx on document_materials (material_id);
create index document_materials_user_id_idx on document_materials (user_id);

-- Migrate existing document-scoped materials into junction table
insert into document_materials (document_id, material_id, user_id)
select m.document_id, m.id, m.user_id
from materials m
where m.document_id is not null
on conflict (document_id, material_id) do nothing;

comment on column materials.document_id is
  'Deprecated. Use document_materials. Kept for backward compatibility; not written by new code.';

-- Unique titles per user (case-insensitive, trimmed)
create unique index materials_user_id_title_idx
  on materials (user_id, lower(trim(title)));

create unique index documents_user_id_title_idx
  on documents (user_id, lower(trim(title)));

alter table document_materials enable row level security;

create policy "document_materials_select_own"
on document_materials for select
using (auth.uid() = user_id);

create policy "document_materials_insert_own"
on document_materials for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from documents d
    where d.id = document_id
      and d.user_id = auth.uid()
  )
  and exists (
    select 1
    from materials m
    where m.id = material_id
      and m.user_id = auth.uid()
  )
);

create policy "document_materials_delete_own"
on document_materials for delete
using (auth.uid() = user_id);
