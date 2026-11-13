-- Reversible soft archive for manager records and stable MCP material retries.
-- Archive is separate from task completion and Kanban category.
alter table public.projects
  add column if not exists archived_at timestamptz;

alter table public.tasks
  add column if not exists archived_at timestamptz;

alter table public.materials
  add column if not exists archived_at timestamptz,
  add column if not exists submission_id uuid;

create unique index if not exists materials_user_submission_id_key
  on public.materials (user_id, submission_id);

create index if not exists projects_user_archived_at_idx
  on public.projects (user_id, archived_at);
create index if not exists tasks_user_archived_at_idx
  on public.tasks (user_id, archived_at);
create index if not exists materials_user_archived_at_idx
  on public.materials (user_id, archived_at);

-- Ordinary project/task/material removal is now archival. Restrict accidental
-- physical deletes so child actions and established document/material links
-- cannot be removed by a cascade.
alter table public.actions drop constraint if exists actions_task_id_fkey;
alter table public.actions add constraint actions_task_id_fkey
  foreign key (task_id) references public.tasks(id) on delete restrict;

alter table public.work_links drop constraint if exists work_links_project_id_fkey;
alter table public.work_links add constraint work_links_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete restrict;
alter table public.work_links drop constraint if exists work_links_task_id_fkey;
alter table public.work_links add constraint work_links_task_id_fkey
  foreign key (task_id) references public.tasks(id) on delete restrict;
alter table public.work_links drop constraint if exists work_links_document_id_fkey;
alter table public.work_links add constraint work_links_document_id_fkey
  foreign key (document_id) references public.documents(id) on delete restrict;
alter table public.work_links drop constraint if exists work_links_material_id_fkey;
alter table public.work_links add constraint work_links_material_id_fkey
  foreign key (material_id) references public.materials(id) on delete restrict;

alter table public.document_materials drop constraint if exists document_materials_material_id_fkey;
alter table public.document_materials add constraint document_materials_material_id_fkey
  foreign key (material_id) references public.materials(id) on delete restrict;
alter table public.document_materials drop constraint if exists document_materials_document_id_fkey;
alter table public.document_materials add constraint document_materials_document_id_fkey
  foreign key (document_id) references public.documents(id) on delete restrict;
