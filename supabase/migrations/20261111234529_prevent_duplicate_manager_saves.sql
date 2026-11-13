-- Keep manager create requests idempotent across repeat clicks and request retries.
-- Nullable UUIDs preserve existing rows and allow deliberately separate submissions.
alter table public.projects
  add column if not exists submission_id uuid;

alter table public.tasks
  add column if not exists submission_id uuid;

alter table public.actions
  add column if not exists submission_id uuid;

create unique index if not exists projects_user_submission_id_key
  on public.projects (user_id, submission_id);

create unique index if not exists tasks_user_submission_id_key
  on public.tasks (user_id, submission_id);

create unique index if not exists actions_user_submission_id_key
  on public.actions (user_id, submission_id);
