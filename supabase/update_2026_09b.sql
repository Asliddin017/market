-- ===========================================================================
-- ASL_ZIYO — 2026-09 (b): foydalanuvchi statusi, so'nggi faollik, IP, tozalash
-- ---------------------------------------------------------------------------
-- Run AFTER supabase/login_events.sql. Paste the WHOLE file into the Supabase
-- SQL Editor (Dashboard -> SQL -> New query) and Run. Fully idempotent.
--
-- What this does:
--   1) profiles.is_active   — admin can deactivate an account (default true).
--      A deactivated account gets NO role (current_app_role() -> null), so
--      every staff/client policy denies it; the app also signs it out.
--   2) profiles.last_seen_at — kept fresh by a trigger on login_events.
--   3) login_events.ip      — filled server-side from the request headers
--      (x-forwarded-for) by a BEFORE INSERT trigger; the browser cannot see
--      its own public IP, PostgREST can.
--   4) cleanup_inactive_users() — deletes INACTIVE accounts that have not
--      been seen for 30 days (auth.users row; profile/cart/log cascade;
--      orders keep their snapshot, client_id cascades too — see note).
--      Admin-only RPC (the Users page calls it) + a daily pg_cron job when
--      the pg_cron extension is available.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) + 2) profile columns
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists is_active    boolean not null default true;
alter table public.profiles add column if not exists last_seen_at timestamptz;

create index if not exists profiles_last_seen_idx on public.profiles (last_seen_at desc);

-- Role helper now returns NULL for deactivated accounts (all policies that
-- check the role therefore deny them).
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

-- Deactivated clients must not create orders either (their policy checks only
-- client_id = auth.uid()).
drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert to authenticated
  with check (
    client_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
  );

-- ---------------------------------------------------------------------------
-- 3) login_events.ip + triggers (ip from headers, last_seen_at on profile)
-- ---------------------------------------------------------------------------
alter table public.login_events add column if not exists ip text;

-- Session length: the client "heartbeats" its own log row while the tab is
-- open, so (last_active_at - created_at) is how long the user stayed on.
alter table public.login_events add column if not exists last_active_at timestamptz not null default now();

drop policy if exists "login_events_update_own" on public.login_events;
create policy "login_events_update_own" on public.login_events
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


create or replace function public.login_events_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hdrs json;
  fwd  text;
begin
  -- PostgREST exposes the HTTP request headers to SQL; the first entry of
  -- x-forwarded-for is the caller's public IP.
  begin
    hdrs := current_setting('request.headers', true)::json;
  exception when others then
    hdrs := null;
  end;
  if hdrs is not null then
    fwd := coalesce(hdrs ->> 'x-forwarded-for', hdrs ->> 'x-real-ip', hdrs ->> 'cf-connecting-ip');
    if fwd is not null then
      new.ip := nullif(trim(split_part(fwd, ',', 1)), '');
    end if;
  end if;

  update public.profiles set last_seen_at = now() where id = new.user_id;
  return new;
end;
$$;

-- Heartbeats also refresh the profile's last_seen_at.
create or replace function public.login_events_after_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.last_active_at is distinct from old.last_active_at then
    update public.profiles set last_seen_at = greatest(coalesce(last_seen_at, new.last_active_at), new.last_active_at)
    where id = new.user_id;
  end if;
  return null;
end;
$$;

drop trigger if exists login_events_after_update on public.login_events;
create trigger login_events_after_update
  after update on public.login_events
  for each row execute function public.login_events_after_update();

drop trigger if exists login_events_before_insert on public.login_events;
create trigger login_events_before_insert
  before insert on public.login_events
  for each row execute function public.login_events_before_insert();

-- Back-fill last_seen_at from the existing log once.
update public.profiles p
set last_seen_at = e.last_at
from (select user_id, max(created_at) as last_at from public.login_events group by user_id) e
where e.user_id = p.id and (p.last_seen_at is null or p.last_seen_at < e.last_at);

-- ---------------------------------------------------------------------------
-- 4) Cleanup of deactivated + 30-days-silent accounts
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_inactive_users(days int default 30)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  n int := 0;
begin
  -- Callable from the app only by an admin; pg_cron runs it as postgres
  -- (auth.uid() is null there).
  if auth.uid() is not null and public.current_app_role() <> 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with victims as (
    select p.id
    from public.profiles p
    where p.is_active = false
      and p.role <> 'admin'
      and coalesce(p.last_seen_at, p.created_at) < now() - make_interval(days => greatest(days, 1))
  ),
  gone as (
    delete from auth.users u using victims v where u.id = v.id returning u.id
  )
  select count(*) into n from gone;
  return n;
end;
$$;

grant execute on function public.cleanup_inactive_users(int) to authenticated;

-- Daily job at 03:00 (server time) when pg_cron is available. Safe to skip.
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron mavjud emas — tozalash faqat admin sahifani ochganda ishlaydi.';
    return;
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'asl_ziyo_cleanup_inactive_users';
    perform cron.schedule('asl_ziyo_cleanup_inactive_users', '0 3 * * *',
      $job$ select public.cleanup_inactive_users(30); $job$);
  end if;
exception when others then
  raise notice 'pg_cron jadvalga qo''yilmadi: %', sqlerrm;
end $$;

-- NOTE: orders.client_id references profiles ON DELETE CASCADE (orders.sql),
-- so a deleted account takes its orders with it. Statistics count only
-- 'tayyor' orders' totals that still exist. If order history of deleted
-- accounts must survive, change that FK to ON DELETE SET NULL first.
