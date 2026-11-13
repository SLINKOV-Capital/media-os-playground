-- MediaOS 2.0 task manager. Projects/tasks reuse the existing owner-scoped rows.
alter table public.projects
  add column if not exists description text,
  add column if not exists category text not null default 'projects',
  add column if not exists sort_order integer not null default 0;

alter table public.tasks
  add column if not exists description text,
  add column if not exists category text not null default 'intentions',
  add column if not exists sort_order integer not null default 0,
  add column if not exists due_date date,
  add column if not exists event_at timestamptz,
  add column if not exists completed boolean not null default false;

alter table public.projects add constraint projects_category_check
  check (category in ('ideas','intentions','commitments','projects','wishes'));
alter table public.tasks add constraint tasks_category_check
  check (category in ('ideas','intentions','commitments','projects','wishes'));
update public.tasks set completed = true where status = 'done' and completed = false;

drop policy if exists tasks_insert_own on public.tasks;
create policy tasks_insert_own on public.tasks for insert with check (
  auth.uid() = user_id and (project_id is null or exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()
  ))
);
drop policy if exists tasks_update_own on public.tasks;
create policy tasks_update_own on public.tasks for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id and (project_id is null or exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()
  ))
);

-- Old document checklist items are explicitly retired by the product decision.
-- Documents, publication content, materials and publication metadata are untouched.
delete from public.actions;
drop table if exists public.action_materials;
alter table public.actions
  drop constraint if exists actions_document_id_fkey;
alter table public.actions
  alter column document_id drop not null,
  add column if not exists task_id uuid references public.tasks(id) on delete cascade,
  add column if not exists description text,
  add column if not exists due_date date;
alter table public.actions alter column task_id set not null;
drop policy if exists actions_insert_own on public.actions;
create policy actions_insert_own on public.actions for insert with check (
  auth.uid() = user_id and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
);
drop policy if exists actions_update_own on public.actions;
create policy actions_update_own on public.actions for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
);
alter table public.actions drop column if exists today;
alter table public.actions drop column if exists today_sort_order;
alter table public.actions drop column if exists material_id;
create index if not exists actions_task_id_sort_order_idx on public.actions(task_id, sort_order);
create index if not exists tasks_user_category_sort_idx on public.tasks(user_id, category, sort_order);
create index if not exists projects_user_category_sort_idx on public.projects(user_id, category, sort_order);

-- Reusable links between operational cards and publication documents/materials.
create table if not exists public.work_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  material_id uuid references public.materials(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint work_links_one_parent check (num_nonnulls(project_id, task_id) = 1),
  constraint work_links_one_target check (num_nonnulls(document_id, material_id) = 1)
);
create unique index if not exists work_links_unique_idx on public.work_links
  (user_id, coalesce(project_id, task_id), coalesce(document_id, material_id));
create index if not exists work_links_project_idx on public.work_links(project_id);
create index if not exists work_links_task_idx on public.work_links(task_id);
alter table public.work_links enable row level security;
create policy work_links_select_own on public.work_links for select using (auth.uid() = user_id);
create policy work_links_insert_own on public.work_links for insert with check (
  auth.uid() = user_id
  and ((project_id is not null and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
    or (task_id is not null and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())))
  and ((document_id is not null and exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()))
    or (material_id is not null and exists (select 1 from public.materials m where m.id = material_id and m.user_id = auth.uid())))
);
create policy work_links_update_own on public.work_links for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and ((project_id is not null and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
    or (task_id is not null and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())))
  and ((document_id is not null and exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid()))
    or (material_id is not null and exists (select 1 from public.materials m where m.id = material_id and m.user_id = auth.uid())))
);
create policy work_links_delete_own on public.work_links for delete using (auth.uid() = user_id);

-- Tight allowlist for the optional ChatGPT/API integration. Clients still use their
-- own Supabase user JWT and are constrained by the same RLS policies.
grant select, insert, update, delete on public.projects, public.tasks, public.actions, public.work_links to authenticated;
