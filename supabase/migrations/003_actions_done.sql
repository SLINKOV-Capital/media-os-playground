-- Media OS v0.2 — action done flag

alter table actions
  add column done boolean not null default false;
