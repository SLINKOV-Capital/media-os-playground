-- Media OS — documents.sort_order for drag-and-drop priority on /documents

alter table documents
  add column if not exists sort_order integer not null default 0;

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id
      order by updated_at desc, created_at desc
    ) - 1 as new_sort_order
  from documents
)
update documents d
set sort_order = ranked.new_sort_order
from ranked
where d.id = ranked.id;

create index if not exists documents_user_id_sort_order_idx
  on documents (user_id, sort_order);

comment on column documents.sort_order is
  'Manual priority order on /documents (lower = higher focus). Top 3 are highlighted.';
