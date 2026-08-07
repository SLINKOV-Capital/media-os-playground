-- Reset test Materials to the current five-type model and remove legacy scope.
-- Documents are intentionally untouched.

delete from public.materials;

drop index if exists public.materials_document_id_idx;

alter table public.materials
  drop column if exists document_id;

alter table public.materials
  add constraint materials_material_type_check
  check (material_type in ('obsidian', 'image', 'video', 'youtube', 'other'));

-- Avoid document_materials -> materials -> document_materials RLS recursion.
-- The trigger performs the material ownership lookup with RLS bypassed, while
-- the policy itself only checks the caller and their document.
create schema if not exists private;

create or replace function private.validate_document_material_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'document_materials user mismatch' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.documents d
    where d.id = new.document_id
      and d.user_id = (select auth.uid())
  ) then
    raise exception 'document is not owned by current user' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.materials m
    where m.id = new.material_id
      and m.user_id = (select auth.uid())
  ) then
    raise exception 'material is not owned by current user' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_document_material_ownership()
from public, anon, authenticated;

drop trigger if exists document_materials_validate_ownership
on public.document_materials;

create trigger document_materials_validate_ownership
before insert or update on public.document_materials
for each row
execute function private.validate_document_material_ownership();

drop policy if exists "document_materials_insert_own"
on public.document_materials;

create policy "document_materials_insert_own"
on public.document_materials
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.documents d
    where d.id = document_id
      and d.user_id = (select auth.uid())
  )
);
