-- Fix action_materials insert RLS: use document_materials (v0.3), not materials.document_id

drop policy if exists "action_materials_insert_own" on action_materials;

create policy "action_materials_insert_own"
on action_materials for insert
with check (
  auth.uid() = action_materials.user_id
  and exists (
    select 1
    from actions a
    where a.id = action_materials.action_id
      and a.user_id = auth.uid()
  )
  and exists (
    select 1
    from document_materials dm
    join actions a on a.id = action_materials.action_id
    where dm.material_id = action_materials.material_id
      and dm.document_id = a.document_id
      and dm.user_id = auth.uid()
  )
);
