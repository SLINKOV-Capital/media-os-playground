-- Media OS — action focus fields
-- Safe to run if 003_actions_done.sql was already applied (uses IF NOT EXISTS for done).

alter table actions
  add column if not exists done boolean not null default false;

alter table actions
  add column today boolean not null default false;
