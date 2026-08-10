create table public.document_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  recommended_document_id uuid not null references public.documents (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint document_recommendations_not_self
    check (document_id <> recommended_document_id),
  constraint document_recommendations_unique
    unique (document_id, recommended_document_id)
);

create index document_recommendations_document_order_idx
  on public.document_recommendations (document_id, sort_order, created_at);
create index document_recommendations_target_idx
  on public.document_recommendations (recommended_document_id);

create table public.document_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  term text not null,
  definition text not null,
  explained_in_document_id uuid references public.documents (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_terms_term_not_blank check (length(trim(term)) > 0),
  constraint document_terms_definition_not_blank check (length(trim(definition)) > 0)
);

create unique index document_terms_document_term_idx
  on public.document_terms (document_id, lower(trim(term)));
create index document_terms_document_order_idx
  on public.document_terms (document_id, sort_order, created_at);
create index document_terms_explained_in_idx
  on public.document_terms (explained_in_document_id)
  where explained_in_document_id is not null;

create trigger document_terms_set_updated_at
before update on public.document_terms
for each row execute function public.set_updated_at();

create or replace function public.validate_document_editor_relation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.documents d
    where d.id = new.document_id and d.user_id = new.user_id
  ) then
    raise exception 'Source Document must belong to the same user'
      using errcode = '23514';
  end if;

  if tg_table_name = 'document_recommendations' and not exists (
    select 1 from public.documents d
    where d.id = new.recommended_document_id and d.user_id = new.user_id
  ) then
    raise exception 'Recommended Document must belong to the same user'
      using errcode = '23514';
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

    if new.explained_in_document_id is not null and not exists (
      select 1 from public.documents d
      where d.id = new.explained_in_document_id and d.user_id = new.user_id
    ) then
      raise exception 'Explaining Document must belong to the same user'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger document_recommendations_validate
before insert or update on public.document_recommendations
for each row execute function public.validate_document_editor_relation();

create trigger document_terms_validate
before insert or update on public.document_terms
for each row execute function public.validate_document_editor_relation();

alter table public.document_recommendations enable row level security;
alter table public.document_terms enable row level security;

create policy "document_recommendations_select_own"
on public.document_recommendations for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "document_recommendations_insert_own"
on public.document_recommendations for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "document_recommendations_update_own"
on public.document_recommendations for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "document_recommendations_delete_own"
on public.document_recommendations for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "document_recommendations_select_published"
on public.document_recommendations for select
to anon, authenticated
using (
  exists (
    select 1 from public.documents source
    where source.id = document_id and source.site_status = 'published'
  )
  and exists (
    select 1 from public.documents target
    where target.id = recommended_document_id
      and target.site_status = 'published'
  )
);

create policy "document_terms_select_own"
on public.document_terms for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "document_terms_insert_own"
on public.document_terms for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "document_terms_update_own"
on public.document_terms for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "document_terms_delete_own"
on public.document_terms for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "document_terms_select_published"
on public.document_terms for select
to anon, authenticated
using (
  exists (
    select 1 from public.documents d
    where d.id = document_id and d.site_status = 'published'
  )
);

grant select on public.document_recommendations, public.document_terms to anon;
grant select, insert, update, delete
  on public.document_recommendations, public.document_terms to authenticated;
