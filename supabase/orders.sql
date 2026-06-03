-- ===========================================================================
-- ASL_ZIYO — Buyurtma (order) tizimi: tables + RLS + triggers
-- ---------------------------------------------------------------------------
-- Run AFTER supabase/schema.sql (it reuses public.current_app_role() and
-- public.set_updated_at() from there; both are re-declared here defensively so
-- this file is safe to paste on its own too).
--
-- Paste the whole file into the Supabase SQL Editor (Dashboard -> SQL -> New
-- query) and Run. Fully idempotent (create ... if not exists / or replace /
-- drop ... if exists) — safe to run multiple times.
--
-- New tables:
--   orders        — one per placed order (client_id, status, total, note, ts)
--   order_items   — snapshot of each line at order time (name/price/qty frozen)
--
-- Pickup only — there is NO delivery. The seller just prepares the order.
-- ===========================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ===========================================================================
-- 0) Helpers reused from schema.sql (re-declared so this file stands alone).
-- ===========================================================================
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- 1) Custom price on the cart (so a client's override survives reload and can
--    be snapshotted into the order). Nullable: null = use the product price.
-- ===========================================================================
alter table public.cart_items
  add column if not exists custom_price integer
  check (custom_price is null or custom_price >= 0);

-- ===========================================================================
-- 2) TABLES.
-- ===========================================================================

-- orders ---------------------------------------------------------------------
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.profiles (id) on delete cascade,
  -- 'buyurtma_berildi' (just ordered) -> 'tayyorlanmoqda' (optional, packing)
  -- -> 'tayyor' (ready for pickup).
  status     text not null default 'buyurtma_berildi'
             check (status in ('buyurtma_berildi', 'tayyorlanmoqda', 'tayyor')),
  total      integer not null default 0 check (total >= 0), -- so'm, kept in sync by trigger
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at   timestamptz -- set when status first becomes 'tayyor'
);

create index if not exists orders_client_idx on public.orders (client_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);

-- order_items (immutable snapshot of the cart at order time) ------------------
-- product_id is nullable + ON DELETE SET NULL so deleting a product later never
-- destroys order history; name/price are frozen in the snapshot columns.
create table if not exists public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  product_id     uuid references public.products (id) on delete set null,
  name_snapshot  text not null,
  unit           text not null default 'dona',
  original_price integer not null default 0 check (original_price >= 0),
  custom_price   integer check (custom_price is null or custom_price >= 0),
  quantity       integer not null default 1 check (quantity > 0),
  is_available   boolean not null default true, -- seller marks "yo'q" -> false
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ===========================================================================
-- 3) Triggers.
-- ===========================================================================

-- Keep updated_at fresh.
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists order_items_set_updated_at on public.order_items;
create trigger order_items_set_updated_at
  before update on public.order_items
  for each row execute function public.set_updated_at();

-- Stamp ready_at the first time an order becomes 'tayyor'.
create or replace function public.set_order_ready_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'tayyor' and (old.status is distinct from 'tayyor') then
    new.ready_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_ready_at on public.orders;
create trigger orders_set_ready_at
  before update on public.orders
  for each row execute function public.set_order_ready_at();

-- Recompute orders.total from the line items whenever they change. The
-- effective line price is (custom_price ?? original_price) * quantity, counted
-- ONLY when is_available. SECURITY DEFINER so it can update the order row
-- regardless of who toggled the line (client insert OR seller availability
-- toggle) — this is what keeps the total correct on BOTH sides via realtime.
create or replace function public.recompute_order_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  oid uuid := coalesce(new.order_id, old.order_id);
begin
  update public.orders o
  set total = coalesce((
        select sum(coalesce(oi.custom_price, oi.original_price) * oi.quantity)
        from public.order_items oi
        where oi.order_id = oid and oi.is_available
      ), 0)
  where o.id = oid;
  return null; -- AFTER trigger
end;
$$;

drop trigger if exists order_items_recompute_total on public.order_items;
create trigger order_items_recompute_total
  after insert or update or delete on public.order_items
  for each row execute function public.recompute_order_total();

-- ===========================================================================
-- 4) Row Level Security.
-- ===========================================================================
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- orders ---------------------------------------------------------------------
-- Client reads OWN orders; staff (admin/seller) read ALL.
drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders
  for select to authenticated
  using (client_id = auth.uid() or public.current_app_role() in ('admin', 'seller'));

-- A client creates only their own orders.
drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert to authenticated
  with check (client_id = auth.uid());

-- Only staff change status (clients cannot). updated_at/ready_at by trigger.
drop policy if exists "orders_update_staff" on public.orders;
create policy "orders_update_staff" on public.orders
  for update to authenticated
  using (public.current_app_role() in ('admin', 'seller'))
  with check (public.current_app_role() in ('admin', 'seller'));

-- Only admin deletes orders.
drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_admin" on public.orders
  for delete to authenticated
  using (public.current_app_role() = 'admin');

-- order_items ----------------------------------------------------------------
-- Visible to staff, or to the client who owns the parent order.
drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select" on public.order_items
  for select to authenticated
  using (
    public.current_app_role() in ('admin', 'seller')
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.client_id = auth.uid()
    )
  );

-- A client inserts snapshot rows only into their OWN order.
drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own" on public.order_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.client_id = auth.uid()
    )
  );

-- Only staff toggle is_available (mark "yo'q") on a line.
drop policy if exists "order_items_update_staff" on public.order_items;
create policy "order_items_update_staff" on public.order_items
  for update to authenticated
  using (public.current_app_role() in ('admin', 'seller'))
  with check (public.current_app_role() in ('admin', 'seller'));

-- Only admin deletes individual lines (orders normally cascade-delete).
drop policy if exists "order_items_delete_admin" on public.order_items;
create policy "order_items_delete_admin" on public.order_items
  for delete to authenticated
  using (public.current_app_role() = 'admin');

-- ===========================================================================
-- 5) Realtime: expose the new tables so the app's subscriptions get live
--    inserts (new orders) + updates (status / stock-out) on every device.
-- ===========================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;
end $$;
