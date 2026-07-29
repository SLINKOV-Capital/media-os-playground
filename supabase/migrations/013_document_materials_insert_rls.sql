-- Qualify document_materials RLS columns to avoid ambiguous references on insert

drop policy if exists "document_materials_insert_own" on document_materials;

create policy "document_materials_insert_own"
on document_materials for insert
with check (
  auth.uid() = document_materials.user_id
  and exists (
    select 1
    from documents d
    where d.id = document_materials.document_id
      and d.user_id = auth.uid()
  )
  and exists (
    select 1
    from materials m
    where m.id = document_materials.material_id
      and m.user_id = auth.uid()
  )
);
