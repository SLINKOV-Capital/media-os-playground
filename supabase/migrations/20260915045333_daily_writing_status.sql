create table public.daily_writing_status (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  minutes smallint not null check (minutes in (0, 35, 70, 90)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create trigger daily_writing_status_set_updated_at
before update on public.daily_writing_status
for each row
execute function public.set_updated_at();

alter table public.daily_writing_status enable row level security;

create policy "daily_writing_status_select_own"
on public.daily_writing_status for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "daily_writing_status_insert_own"
on public.daily_writing_status for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "daily_writing_status_update_own"
on public.daily_writing_status for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.daily_writing_status from anon;
grant select, insert, update on table public.daily_writing_status to authenticated;
