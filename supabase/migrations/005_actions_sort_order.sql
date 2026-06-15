-- Media OS v0.2 — action sort_order for drag-and-drop reorder

alter table actions
  add column sort_order integer not null default 0;

with ranked as (
  select
    id,
    row_number() over (
      partition by document_id
      order by created_at asc
    ) - 1 as new_sort_order
  from actions
)
update actions
set sort_order = ranked.new_sort_order
from ranked
where actions.id = ranked.id;

create index actions_document_id_sort_order_idx
  on actions (document_id, sort_order);
