-- Media OS Cockpit — initial schema (Stage 1)

create type task_status as enum (
  'new',
  'decision',
  'stuck',
  'done',
  'let_go'
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references projects (id) on delete set null,
  title text not null,
  status task_status not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workflow_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index projects_user_id_idx on projects (user_id);
create index tasks_user_id_status_idx on tasks (user_id, status);
create index tasks_project_id_idx on tasks (project_id);
create index workflow_templates_user_id_idx on workflow_templates (user_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
before update on projects
for each row
execute function set_updated_at();

create trigger tasks_set_updated_at
before update on tasks
for each row
execute function set_updated_at();

alter table projects enable row level security;
alter table tasks enable row level security;
alter table workflow_templates enable row level security;

create policy "projects_select_own"
on projects for select
using (auth.uid() = user_id);

create policy "projects_insert_own"
on projects for insert
with check (auth.uid() = user_id);

create policy "projects_update_own"
on projects for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "projects_delete_own"
on projects for delete
using (auth.uid() = user_id);

create policy "tasks_select_own"
on tasks for select
using (auth.uid() = user_id);

create policy "tasks_insert_own"
on tasks for insert
with check (auth.uid() = user_id);

create policy "tasks_update_own"
on tasks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "tasks_delete_own"
on tasks for delete
using (auth.uid() = user_id);

create policy "workflow_templates_select_own"
on workflow_templates for select
using (auth.uid() = user_id);

create policy "workflow_templates_insert_own"
on workflow_templates for insert
with check (auth.uid() = user_id);

create policy "workflow_templates_update_own"
on workflow_templates for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "workflow_templates_delete_own"
on workflow_templates for delete
using (auth.uid() = user_id);
