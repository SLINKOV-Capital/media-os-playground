-- Media OS v0.3 — Nihuyasi module

create table nihuyasi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index nihuyasi_user_id_date_idx
  on nihuyasi (user_id, date desc);

create index nihuyasi_user_id_idx on nihuyasi (user_id);

create trigger nihuyasi_set_updated_at
before update on nihuyasi
for each row
execute function set_updated_at();

alter table nihuyasi enable row level security;

create policy "nihuyasi_select_own"
on nihuyasi for select
using (auth.uid() = user_id);

create policy "nihuyasi_insert_own"
on nihuyasi for insert
with check (auth.uid() = user_id);

create policy "nihuyasi_update_own"
on nihuyasi for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "nihuyasi_delete_own"
on nihuyasi for delete
using (auth.uid() = user_id);
