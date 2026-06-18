-- Media OS v0.2 — many-to-many: actions ↔ materials
-- actions.material_id remains deprecated and is not dropped.

create table action_materials (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references actions (id) on delete cascade,
  material_id uuid not null references materials (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (action_id, material_id)
);

create index action_materials_action_id_idx on action_materials (action_id);
create index action_materials_material_id_idx on action_materials (material_id);
create index action_materials_user_id_idx on action_materials (user_id);

insert into action_materials (action_id, material_id, user_id)
select a.id, a.material_id, a.user_id
from actions a
inner join materials m
  on m.id = a.material_id
  and m.document_id = a.document_id
  and m.user_id = a.user_id
where a.material_id is not null
on conflict (action_id, material_id) do nothing;

comment on column actions.material_id is
  'Deprecated. Use action_materials. Kept for backward compatibility; not written by new code.';

alter table action_materials enable row level security;

create policy "action_materials_select_own"
on action_materials for select
using (auth.uid() = user_id);

create policy "action_materials_insert_own"
on action_materials for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from actions a
    where a.id = action_id
      and a.user_id = auth.uid()
  )
  and exists (
    select 1
    from materials m
    join actions a on a.id = action_id
    where m.id = material_id
      and m.user_id = auth.uid()
      and m.document_id = a.document_id
  )
);

create policy "action_materials_delete_own"
on action_materials for delete
using (auth.uid() = user_id);
