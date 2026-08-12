-- The shared trigger must not access relation-specific NEW fields directly:
-- PostgreSQL validates record fields for the active trigger relation.
create or replace function public.validate_document_editor_relation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  related_document_id uuid;
begin
  if not exists (
    select 1 from public.documents d
    where d.id = new.document_id and d.user_id = new.user_id
  ) then
    raise exception 'Source Document must belong to the same user'
      using errcode = '23514';
  end if;

  if tg_table_name = 'document_recommendations' then
    related_document_id := nullif(
      to_jsonb(new) ->> 'recommended_document_id',
      ''
    )::uuid;

    if not exists (
      select 1 from public.documents d
      where d.id = related_document_id and d.user_id = new.user_id
    ) then
      raise exception 'Recommended Document must belong to the same user'
        using errcode = '23514';
    end if;
  end if;

  if tg_table_name = 'document_terms' then
    if not exists (
      select 1 from public.documents d
      where d.id = new.document_id
        and d.user_id = new.user_id
        and lower(trim(d.document_type)) like '%стат%'
    ) then
      raise exception 'Terms are allowed only for article Documents'
        using errcode = '23514';
    end if;

    related_document_id := nullif(
      to_jsonb(new) ->> 'explained_in_document_id',
      ''
    )::uuid;

    if related_document_id is not null and not exists (
      select 1 from public.documents d
      where d.id = related_document_id and d.user_id = new.user_id
    ) then
      raise exception 'Explaining Document must belong to the same user'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;
