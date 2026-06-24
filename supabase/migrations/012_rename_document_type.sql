-- Atomic rename of workflow template document_type + cascade to documents

create or replace function public.rename_document_type(
  p_template_id uuid,
  p_new_document_type text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_old_document_type text;
  v_new_type text := trim(p_new_document_type);
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if v_new_type = '' then
    raise exception 'empty_type';
  end if;

  select document_type
  into v_old_document_type
  from workflow_templates_v2
  where id = p_template_id
    and user_id = v_user_id
  for update;

  if v_old_document_type is null then
    raise exception 'template_not_found';
  end if;

  if lower(v_new_type) = lower(trim(v_old_document_type)) then
    return;
  end if;

  if exists (
    select 1
    from workflow_templates_v2
    where user_id = v_user_id
      and id <> p_template_id
      and lower(trim(document_type)) = lower(v_new_type)
  ) then
    raise exception 'duplicate_type';
  end if;

  update documents
  set
    document_type = v_new_type,
    updated_at = now()
  where user_id = v_user_id
    and document_type = v_old_document_type;

  update workflow_templates_v2
  set
    document_type = v_new_type,
    updated_at = now()
  where id = p_template_id
    and user_id = v_user_id;
end;
$$;

grant execute on function public.rename_document_type(uuid, text) to authenticated;
