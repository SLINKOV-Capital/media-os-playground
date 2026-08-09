-- A document may keep site_published_at as publication history after it is
-- returned to draft. Only the current published state blocks deletion.

create or replace function public.prevent_published_document_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.site_status = 'published' then
    raise exception 'Cannot delete a currently published document';
  end if;

  return old;
end;
$$;
