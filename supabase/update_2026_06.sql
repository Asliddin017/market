-- ===========================================================================
-- ASL_ZIYO — 2026-06 multi-part update
-- ---------------------------------------------------------------------------
-- Run AFTER supabase/schema.sql, supabase/orders.sql AND supabase/piece_pricing.sql.
-- Paste the WHOLE file into the Supabase SQL Editor (Dashboard -> SQL -> New
-- query) and Run. Fully idempotent (add column if not exists / create or replace
-- / drop policy if exists / guarded inserts) — safe to run multiple times.
--
-- What this does, by section:
--   0) Rename "Tagliklar (Pampers)" -> "Tagaklar (Pampers)" (products stay linked).
--   1) Hide client-restricted categories (cigarettes) via categories.hidden_for_clients
--      + RLS so CLIENTS never receive those category/product rows. Staff see all.
--   2) orders.client_name + client_phone (mandatory name/phone captured at checkout).
--   3) contacts table (+RLS: everyone reads, only admin writes) + seed the primary.
--   4) Stats indexes + SECURITY DEFINER aggregate functions (best-sellers, revenue,
--      top products/categories) — they bypass RLS to return only NON-PII aggregates
--      so clients can read best-sellers and staff can read full stats.
-- ===========================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- Re-declared defensively so this file is safe to run on its own.
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- 0) Category rename: Tagliklar -> Tagaklar (diapers = "tagak"). Products link
--    by category_id, so renaming the row keeps every product attached.
-- ===========================================================================
update public.categories
set name = 'Tagaklar (Pampers)', slug = 'tagaklar-pampers', emoji = '👶'
where name = 'Tagliklar (Pampers)';

-- ===========================================================================
-- 1) Client-restricted categories (cigarettes banned for clients).
--    A reusable flag: set hidden_for_clients = true on ANY category to hide it
--    (and all its products) from the CLIENT role everywhere. Staff are unaffected.
-- ===========================================================================
alter table public.categories
  add column if not exists hidden_for_clients boolean not null default false;

update public.categories set hidden_for_clients = true where name = 'Sigaretlar';

-- Categories: clients only see non-hidden ones; staff see all.
drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories
  for select to authenticated
  using (public.current_app_role() in ('admin', 'seller') or not hidden_for_clients);

-- Products: clients never receive a product whose category is hidden; staff see all.
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select to authenticated
  using (
    public.current_app_role() in ('admin', 'seller')
    or not exists (
      select 1 from public.categories c
      where c.id = category_id and c.hidden_for_clients
    )
  );

-- ===========================================================================
-- 2) Order requires a client name + phone (captured at checkout, shown to staff).
-- ===========================================================================
alter table public.orders add column if not exists client_name  text;
alter table public.orders add column if not exists client_phone text;

-- ===========================================================================
-- 3) Contacts ("Aloqa"): store contact info. Everyone reads, only admin writes.
-- ===========================================================================
create table if not exists public.contacts (
  id         uuid primary key default gen_random_uuid(),
  label      text,                              -- 'Asosiy' / 'Ishonch' / ...
  name       text not null,
  phone      text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_order_idx
  on public.contacts (is_primary desc, sort_order, created_at);

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;

drop policy if exists "contacts_select" on public.contacts;
create policy "contacts_select" on public.contacts
  for select to authenticated using (true);

drop policy if exists "contacts_insert_admin" on public.contacts;
create policy "contacts_insert_admin" on public.contacts
  for insert to authenticated with check (public.current_app_role() = 'admin');

drop policy if exists "contacts_update_admin" on public.contacts;
create policy "contacts_update_admin" on public.contacts
  for update to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists "contacts_delete_admin" on public.contacts;
create policy "contacts_delete_admin" on public.contacts
  for delete to authenticated using (public.current_app_role() = 'admin');

-- Seed the primary contact once (only if there is no primary yet).
insert into public.contacts (label, name, phone, is_primary, sort_order)
select 'Asosiy', 'Asliddin', '+998500170099', true, 0
where not exists (select 1 from public.contacts where is_primary);

-- ===========================================================================
-- 4) Statistics + best-sellers.
--    Indexes for the aggregate queries.
-- ===========================================================================
create index if not exists order_items_product_idx on public.order_items (product_id);
create index if not exists orders_status_ready_idx  on public.orders (status, ready_at);

-- Final money for one order line — MIRRORS src/lib/pricing.js lineTotal() and the
-- recompute_order_total() trigger exactly (piece/bundle, kg-custom, else fixed).
create or replace function public.order_line_revenue(oi public.order_items)
returns integer language sql immutable as $$
  select case
    when oi.sold_by_piece and oi.sell_mode = 'dona' then
      case
        when oi.piece_bundle_qty is not null and oi.piece_bundle_qty > 0 then
          (oi.quantity / oi.piece_bundle_qty) * coalesce(oi.piece_bundle_price, 0)
          + (oi.quantity % oi.piece_bundle_qty) * coalesce(oi.piece_price, 0)
        else
          oi.quantity * coalesce(oi.piece_price, 0)
      end
    when oi.unit = 'kg' and oi.custom_price is not null then
      oi.custom_price * oi.quantity
    else
      oi.original_price * oi.quantity
  end;
$$;

-- Guard: stats are staff-only.
create or replace function public.require_staff()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if public.current_app_role() not in ('admin', 'seller') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- Best-sellers: product_id + qty + revenue across COMPLETED (tayyor) orders,
-- counting only available lines. SECURITY DEFINER so it can aggregate across all
-- orders, but it returns only product ids + counts (no client PII). Callable by
-- any authenticated user; the client app maps the ids onto the products it can
-- already see (so cigarettes, hidden from clients, are dropped client-side too).
create or replace function public.best_sellers(limit_n int default 8)
returns table(product_id uuid, qty_sold bigint, revenue bigint)
language sql stable security definer set search_path = public as $$
  select oi.product_id,
         sum(oi.quantity)::bigint as qty_sold,
         sum(public.order_line_revenue(oi))::bigint as revenue
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.status = 'tayyor' and oi.is_available and oi.product_id is not null
    -- Clients must not receive even the ids of client-hidden products (cigarettes).
    and (
      public.current_app_role() in ('admin', 'seller')
      or not exists (
        select 1 from public.products p
        join public.categories c on c.id = p.category_id
        where p.id = oi.product_id and c.hidden_for_clients
      )
    )
  group by oi.product_id
  order by qty_sold desc, revenue desc
  limit greatest(coalesce(limit_n, 8), 0);
$$;

-- Headline stats (revenue today/week/month/total + completed-order counts). Uses
-- orders.total (authoritative: available lines at final price) for tayyor orders,
-- dated by ready_at (falling back to created_at), in Asia/Tashkent local time.
create or replace function public.sales_stats()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  tz          text      := 'Asia/Tashkent';
  now_local   timestamp := (now() at time zone tz);
  day_start   timestamp := date_trunc('day',   now_local);
  week_start  timestamp := date_trunc('week',  now_local);
  month_start timestamp := date_trunc('month', now_local);
  result      json;
begin
  perform public.require_staff();
  select json_build_object(
    'revenue_today', coalesce(sum(total) filter (where ev >= day_start), 0),
    'revenue_week',  coalesce(sum(total) filter (where ev >= week_start), 0),
    'revenue_month', coalesce(sum(total) filter (where ev >= month_start), 0),
    'revenue_total', coalesce(sum(total), 0),
    'orders_today',  count(*) filter (where ev >= day_start),
    'orders_month',  count(*) filter (where ev >= month_start),
    'orders_total',  count(*)
  ) into result
  from (
    select o.total, (coalesce(o.ready_at, o.created_at) at time zone tz) as ev
    from public.orders o
    where o.status = 'tayyor'
  ) t;
  return result;
end;
$$;

-- Revenue per day for the last N days (gap-filled with zeros), staff-only.
create or replace function public.revenue_daily(days int default 30)
returns table(day date, revenue bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  tz text := 'Asia/Tashkent';
  n  int  := greatest(coalesce(days, 30), 1);
begin
  perform public.require_staff();
  return query
  with span as (
    select generate_series(
      date_trunc('day', (now() at time zone tz)) - ((n - 1) || ' days')::interval,
      date_trunc('day', (now() at time zone tz)),
      interval '1 day'
    )::date as day
  ),
  rev as (
    select (coalesce(o.ready_at, o.created_at) at time zone tz)::date as day,
           sum(o.total)::bigint as revenue
    from public.orders o
    where o.status = 'tayyor'
    group by 1
  )
  select s.day, coalesce(r.revenue, 0)::bigint
  from span s
  left join rev r on r.day = s.day
  order by s.day;
end;
$$;

-- Top products by quantity (with revenue), staff-only. Survives product deletion
-- via the name snapshot on the order line.
create or replace function public.top_products(limit_n int default 5)
returns table(product_id uuid, name text, qty_sold bigint, revenue bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_staff();
  return query
  select oi.product_id,
         coalesce(p.name, oi.name_snapshot) as name,
         sum(oi.quantity)::bigint,
         sum(public.order_line_revenue(oi))::bigint
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  left join public.products p on p.id = oi.product_id
  where o.status = 'tayyor' and oi.is_available
  group by oi.product_id, coalesce(p.name, oi.name_snapshot)
  order by 3 desc, 4 desc
  limit greatest(coalesce(limit_n, 5), 0);
end;
$$;

-- Top categories by revenue (with quantity), staff-only. Lines whose product was
-- deleted are skipped (no category to attribute them to).
create or replace function public.top_categories(limit_n int default 5)
returns table(category_id uuid, name text, qty_sold bigint, revenue bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_staff();
  return query
  select c.id, c.name,
         sum(oi.quantity)::bigint,
         sum(public.order_line_revenue(oi))::bigint
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  join public.categories c on c.id = p.category_id
  where o.status = 'tayyor' and oi.is_available
  group by c.id, c.name
  order by 4 desc, 3 desc
  limit greatest(coalesce(limit_n, 5), 0);
end;
$$;

-- Let the app (authenticated role) call the RPCs.
grant execute on function public.best_sellers(int)   to authenticated;
grant execute on function public.sales_stats()        to authenticated;
grant execute on function public.revenue_daily(int)   to authenticated;
grant execute on function public.top_products(int)    to authenticated;
grant execute on function public.top_categories(int)  to authenticated;

-- ===========================================================================
-- Done. The client app reads contacts live (realtime) and calls the RPCs above.
-- ===========================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contacts'
  ) then
    alter publication supabase_realtime add table public.contacts;
  end if;
end $$;
