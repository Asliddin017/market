-- ===========================================================================
-- ASL_ZIYO — Kirish loglari (login_events)
-- ---------------------------------------------------------------------------
-- Run AFTER supabase/schema.sql. Paste the WHOLE file into the Supabase SQL
-- Editor (Dashboard -> SQL -> New query) and Run. Fully idempotent.
--
-- Every time a user signs in ('login') or opens the app with a saved session
-- ('visit'), the client records one row: who, when, and the device/browser it
-- came from (parsed from the user agent on the client; the raw UA is kept too).
-- Only ADMINS may read the table; a user may only insert rows about themself.
-- ===========================================================================

create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create table if not exists public.login_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null default 'login' check (kind in ('login', 'visit')),
  device_type text,          -- 'Telefon' | 'Planshet' | 'Kompyuter'
  os          text,          -- 'Android 14', 'iOS 17', 'Windows', ...
  browser     text,          -- 'Chrome 128', 'Safari', ...
  screen      text,          -- '412x915'
  language    text,          -- 'uz-UZ'
  user_agent  text,          -- raw navigator.userAgent
  created_at  timestamptz not null default now()
);

create index if not exists login_events_user_idx on public.login_events (user_id, created_at desc);
create index if not exists login_events_time_idx on public.login_events (created_at desc);

alter table public.login_events enable row level security;

-- A user records only their own events (user_id must be the caller).
drop policy if exists "login_events_insert_own" on public.login_events;
create policy "login_events_insert_own" on public.login_events
  for insert to authenticated
  with check (user_id = auth.uid());

-- Only admins read the log.
drop policy if exists "login_events_select_admin" on public.login_events;
create policy "login_events_select_admin" on public.login_events
  for select to authenticated
  using (public.current_app_role() = 'admin');

-- Only admins may clear old rows.
drop policy if exists "login_events_delete_admin" on public.login_events;
create policy "login_events_delete_admin" on public.login_events
  for delete to authenticated
  using (public.current_app_role() = 'admin');

-- Realtime so the admin page updates live.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'login_events'
  ) then
    alter publication supabase_realtime add table public.login_events;
  end if;
end $$;
