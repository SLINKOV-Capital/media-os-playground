-- Media OS v0.2 — today_sort_order for drag-and-drop reorder on /today

alter table actions
  add column today_sort_order integer;

with ranked as (
  select
    id,
    row_number() over (
      order by sort_order asc, created_at asc
    ) - 1 as new_today_sort_order
  from actions
  where today = true
)
update actions
set today_sort_order = ranked.new_today_sort_order
from ranked
where actions.id = ranked.id;

create index actions_user_id_today_sort_order_idx
  on actions (user_id, today_sort_order)
  where today = true;
