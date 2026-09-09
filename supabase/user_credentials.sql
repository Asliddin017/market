-- ===========================================================================
-- ASL_ZIYO — Foydalanuvchi parollari (admin ko'rishi uchun)
-- ---------------------------------------------------------------------------
-- Run AFTER supabase/schema.sql and supabase/admin_password.sql. Paste the
-- WHOLE file into the Supabase SQL Editor and Run. Idempotent.
--
-- !!! OGOHLANTIRISH / WARNING !!!
-- Supabase Auth keeps only bcrypt hashes. This table stores the PLAIN-TEXT
-- password the user typed at sign-up / sign-in (written by the client right
-- after a successful auth) so an ADMIN can read it on the "Foydalanuvchilar"
-- page. Anyone who obtains a database dump or the service_role key reads
-- every password here. Shop owner's explicit decision (2026-09-09).
--
-- Access: a user may write ONLY their own row; ONLY admins may read.
-- ===========================================================================

create table if not exists public.user_credentials (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  password   text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_credentials enable row level security;

drop policy if exists "user_credentials_insert_own" on public.user_credentials;
create policy "user_credentials_insert_own" on public.user_credentials
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "user_credentials_update_own" on public.user_credentials;
create policy "user_credentials_update_own" on public.user_credentials
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user_credentials_select_admin" on public.user_credentials;
create policy "user_credentials_select_admin" on public.user_credentials
  for select to authenticated using (public.current_app_role() = 'admin');

drop policy if exists "user_credentials_delete_admin" on public.user_credentials;
create policy "user_credentials_delete_admin" on public.user_credentials
  for delete to authenticated using (public.current_app_role() = 'admin');

-- When an admin sets a new password (admin_set_user_password), remember it too.
create or replace function public.admin_set_user_password(target_user_id uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if new_password is null or length(new_password) < 6 then
    raise exception 'Parol kamida 6 ta belgi bo''lsin' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Foydalanuvchi topilmadi' using errcode = 'P0002';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf', 10)),
      updated_at = now()
  where id = target_user_id;

  insert into public.user_credentials (user_id, password, updated_at)
  values (target_user_id, new_password, now())
  on conflict (user_id) do update set password = excluded.password, updated_at = now();

  delete from auth.refresh_tokens where user_id = target_user_id::text;
  begin
    delete from auth.sessions where user_id = target_user_id;
  exception when undefined_table then
    null;
  end;
end;
$$;

-- Realtime so the admin page updates as users sign in.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_credentials'
  ) then
    alter publication supabase_realtime add table public.user_credentials;
  end if;
end $$;
