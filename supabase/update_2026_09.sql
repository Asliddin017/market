-- ===========================================================================
-- ASL_ZIYO — 2026-09 server-side order hardening
-- ---------------------------------------------------------------------------
-- Run AFTER supabase/schema.sql, orders.sql, piece_pricing.sql and
-- update_2026_06.sql. Paste the WHOLE file into the Supabase SQL Editor
-- (Dashboard -> SQL -> New query) and Run. Fully idempotent (create or replace /
-- drop trigger if exists) — safe to run multiple times.
--
-- Why: until now an order line's snapshot (name, unit, price, per-piece config)
-- was whatever the CLIENT sent in the insert. The app sends the right values,
-- but anyone with the anon key + their own session could POST order_items with
-- original_price = 1 and the total trigger would happily believe it. Likewise a
-- client could insert an order that is already status = 'tayyor' (polluting the
-- statistics) or reference a client-hidden product (cigarettes).
--
-- What this does:
--   1) order_items BEFORE INSERT trigger: when product_id is set, the snapshot
--      columns are copied FROM public.products (server-authoritative) — the
--      client-supplied values are ignored. custom_price is kept ONLY for kg
--      lines (Change A, as before); sell_mode only for sold_by_piece products.
--      A client (non-staff) cannot order a product from a hidden category and
--      cannot pre-mark a line as unavailable.
--   2) orders BEFORE INSERT trigger: a new order always starts as
--      'buyurtma_berildi' with total = 0 / ready_at = null, regardless of what
--      the insert payload says. (The total is recomputed by the existing
--      order_items trigger as lines are inserted.)
--
-- The client app already behaves this way, so nothing changes for honest use.
-- ===========================================================================

-- Re-declared defensively so this file is safe to run on its own.
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ===========================================================================
-- 1) order_items: server-authoritative snapshot on insert.
-- ===========================================================================
create or replace function public.order_items_snapshot_from_product()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p      public.products%rowtype;
  hidden boolean := false;
  staff  boolean := public.current_app_role() in ('admin', 'seller');
begin
  if new.product_id is not null then
    -- SECURITY DEFINER: reads the product even if RLS hides it from the caller,
    -- so a client cannot slip a hidden (cigarette) product past the snapshot.
    select * into p from public.products where id = new.product_id;
    if not found then
      raise exception 'Mahsulot topilmadi' using errcode = '23503';
    end if;

    select c.hidden_for_clients into hidden
    from public.categories c
    where c.id = p.category_id;
    if coalesce(hidden, false) and not staff then
      raise exception 'Bu mahsulotga buyurtma berib bo''lmaydi' using errcode = '42501';
    end if;

    new.name_snapshot      := p.name;
    new.unit               := p.unit;
    new.original_price     := p.price;
    new.sold_by_piece      := coalesce(p.sold_by_piece, false);
    new.piece_price        := p.piece_price;
    new.piece_bundle_qty   := p.piece_bundle_qty;
    new.piece_bundle_price := p.piece_bundle_price;
  end if;

  -- CHANGE A: a custom (override) price is honoured ONLY for kg (scale) items.
  if new.unit is distinct from 'kg' then
    new.custom_price := null;
  end if;

  -- CHANGE B: per-piece mode only exists for sold_by_piece products; everything
  -- else has no sell mode. Default cigarettes to 'pachka' when unspecified.
  if coalesce(new.sold_by_piece, false) then
    if new.sell_mode is null then
      new.sell_mode := 'pachka';
    end if;
  else
    new.sell_mode := null;
  end if;

  -- Only staff mark a line "yo'q"; a fresh client line is always available.
  if not staff then
    new.is_available := true;
  end if;

  return new;
end;
$$;

drop trigger if exists order_items_snapshot_from_product on public.order_items;
create trigger order_items_snapshot_from_product
  before insert on public.order_items
  for each row execute function public.order_items_snapshot_from_product();

-- ===========================================================================
-- 2) orders: a new order always starts at the first status with total 0.
-- ===========================================================================
create or replace function public.orders_insert_defaults()
returns trigger
language plpgsql
as $$
begin
  new.status   := 'buyurtma_berildi';
  new.total    := 0;
  new.ready_at := null;
  return new;
end;
$$;

drop trigger if exists orders_insert_defaults on public.orders;
create trigger orders_insert_defaults
  before insert on public.orders
  for each row execute function public.orders_insert_defaults();

-- ===========================================================================
-- Done.
-- ===========================================================================
