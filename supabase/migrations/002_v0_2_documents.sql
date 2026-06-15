-- Media OS v0.2 — documents, materials, actions, workflow_templates_v2
-- Legacy tables (tasks, projects, workflow_templates) are intentionally unchanged.

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  document_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references documents (id) on delete cascade,
  title text not null,
  material_type text not null,
  file_url_or_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references documents (id) on delete cascade,
  material_id uuid references materials (id) on delete set null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workflow_templates_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null,
  action_titles text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_user_id_idx on documents (user_id);
create index documents_user_id_updated_at_idx on documents (user_id, updated_at desc);
create index documents_user_id_document_type_idx on documents (user_id, document_type);

create index materials_document_id_idx on materials (document_id);
create index materials_user_id_idx on materials (user_id);

create index actions_document_id_idx on actions (document_id);
create index actions_user_id_idx on actions (user_id);
create index actions_material_id_idx on actions (material_id);

create index workflow_templates_v2_user_id_idx on workflow_templates_v2 (user_id);

create unique index workflow_templates_v2_user_document_type_idx
  on workflow_templates_v2 (user_id, document_type);

create trigger documents_set_updated_at
before update on documents
for each row
execute function set_updated_at();

create trigger materials_set_updated_at
before update on materials
for each row
execute function set_updated_at();

create trigger actions_set_updated_at
before update on actions
for each row
execute function set_updated_at();

create trigger workflow_templates_v2_set_updated_at
before update on workflow_templates_v2
for each row
execute function set_updated_at();

alter table documents enable row level security;
alter table materials enable row level security;
alter table actions enable row level security;
alter table workflow_templates_v2 enable row level security;

create policy "documents_select_own"
on documents for select
using (auth.uid() = user_id);

create policy "documents_insert_own"
on documents for insert
with check (auth.uid() = user_id);

create policy "documents_update_own"
on documents for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "documents_delete_own"
on documents for delete
using (auth.uid() = user_id);

create policy "materials_select_own"
on materials for select
using (auth.uid() = user_id);

create policy "materials_insert_own"
on materials for insert
with check (auth.uid() = user_id);

create policy "materials_update_own"
on materials for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "materials_delete_own"
on materials for delete
using (auth.uid() = user_id);

create policy "actions_select_own"
on actions for select
using (auth.uid() = user_id);

create policy "actions_insert_own"
on actions for insert
with check (auth.uid() = user_id);

create policy "actions_update_own"
on actions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "actions_delete_own"
on actions for delete
using (auth.uid() = user_id);

create policy "workflow_templates_v2_select_own"
on workflow_templates_v2 for select
using (auth.uid() = user_id);

create policy "workflow_templates_v2_insert_own"
on workflow_templates_v2 for insert
with check (auth.uid() = user_id);

create policy "workflow_templates_v2_update_own"
on workflow_templates_v2 for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "workflow_templates_v2_delete_own"
on workflow_templates_v2 for delete
using (auth.uid() = user_id);
