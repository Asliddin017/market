-- ===========================================================================
-- ASL_ZIYO — Change A (unit-based price editing) + Change B (cigarette
-- per-piece pricing).
-- ---------------------------------------------------------------------------
-- Run AFTER supabase/schema.sql AND supabase/orders.sql.
-- Paste the whole file into the Supabase SQL Editor (Dashboard -> SQL -> New
-- query) and Run. Fully idempotent (add column if not exists / or replace /
-- updates keyed by category+name) — safe to run multiple times. No re-seed of
-- the 194 products is required; cigarette rows are updated in place.
--
-- Pricing rules (MUST match src/lib/pricing.js exactly):
--   CHANGE A — custom_price is honored ONLY for unit = 'kg'. For 'dona' the
--     price is fixed; custom_price is ignored.
--   CHANGE B — sold_by_piece products (cigarettes) sell as PACK (pachka = the
--     product price) or per PIECE (dona). Piece pricing with optional bundle:
--       bundle set -> floor(N/bundle_qty)*bundle_price + (N % bundle_qty)*piece_price
--       else       -> N * piece_price
-- ===========================================================================

-- ===========================================================================
-- 1) Per-piece config columns on products (source of truth for the catalog).
-- ===========================================================================
alter table public.products
  add column if not exists sold_by_piece boolean not null default false;
alter table public.products
  add column if not exists piece_price integer check (piece_price is null or piece_price >= 0);
alter table public.products
  add column if not exists piece_bundle_qty integer check (piece_bundle_qty is null or piece_bundle_qty > 0);
alter table public.products
  add column if not exists piece_bundle_price integer check (piece_bundle_price is null or piece_bundle_price >= 0);

-- ===========================================================================
-- 2) Snapshot columns on order_items (so each order keeps its own pricing and
--    the total trigger is self-contained). + the chosen sell mode.
-- ===========================================================================
alter table public.order_items
  add column if not exists sold_by_piece boolean not null default false;
alter table public.order_items
  add column if not exists piece_price integer check (piece_price is null or piece_price >= 0);
alter table public.order_items
  add column if not exists piece_bundle_qty integer check (piece_bundle_qty is null or piece_bundle_qty > 0);
alter table public.order_items
  add column if not exists piece_bundle_price integer check (piece_bundle_price is null or piece_bundle_price >= 0);
alter table public.order_items
  add column if not exists sell_mode text check (sell_mode is null or sell_mode in ('pachka', 'dona'));

-- The chosen sell mode also lives on the cart.
alter table public.cart_items
  add column if not exists sell_mode text check (sell_mode is null or sell_mode in ('pachka', 'dona'));

-- ===========================================================================
-- 3) Configure cigarettes (category 'Sigaretlar'). Idempotent UPDATEs — no
--    re-seed needed. The three specials are matched case-insensitively by name
--    so Title-casing on import does not matter.
-- ===========================================================================
do $$
declare
  cig_cat uuid := (select id from public.categories where name = 'Sigaretlar');
begin
  if cig_cat is null then
    raise notice 'Kategoriya "Sigaretlar" topilmadi — sigaret narxlari o''tkazib yuborildi.';
    return;
  end if;

  -- All cigarettes can be sold by piece.
  update public.products set sold_by_piece = true where category_id = cig_cat;

  -- Specials: Палмалл простой, Милано, Кемал => flat 1000 so'm/piece (no bundle).
  update public.products
  set piece_price = 1000, piece_bundle_qty = null, piece_bundle_price = null
  where category_id = cig_cat
    and lower(name) in (lower('Палмалл простой'), lower('Милано'), lower('Кемал'));

  -- Everyone else: 2000 so'm/piece, but every 3 = 5000 so'm.
  update public.products
  set piece_price = 2000, piece_bundle_qty = 3, piece_bundle_price = 5000
  where category_id = cig_cat
    and lower(name) not in (lower('Палмалл простой'), lower('Милано'), lower('Кемал'));
end $$;

-- ===========================================================================
-- 4) Authoritative order total. Mirrors src/lib/pricing.js lineTotal() exactly.
--    Only available lines are counted. SECURITY DEFINER so it can update the
--    order regardless of who changed a line (client insert OR seller edit).
-- ===========================================================================
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
        select sum(
          case
            -- CHANGE B: per-piece (dona) mode, with optional bundle discount.
            when oi.sold_by_piece and oi.sell_mode = 'dona' then
              case
                when oi.piece_bundle_qty is not null and oi.piece_bundle_qty > 0 then
                  (oi.quantity / oi.piece_bundle_qty) * coalesce(oi.piece_bundle_price, 0)
                  + (oi.quantity % oi.piece_bundle_qty) * coalesce(oi.piece_price, 0)
                else
                  oi.quantity * coalesce(oi.piece_price, 0)
              end
            -- CHANGE A: custom price honored ONLY for kg (scale) items.
            when oi.unit = 'kg' and oi.custom_price is not null then
              oi.custom_price * oi.quantity
            -- Everything else (incl. dona packs / fixed-price packages).
            else
              oi.original_price * oi.quantity
          end
        )
        from public.order_items oi
        where oi.order_id = oid and oi.is_available
      ), 0)
  where o.id = oid;
  return null; -- AFTER trigger
end;
$$;

-- Trigger binding is unchanged (created in orders.sql); recreate defensively so
-- this file works even if orders.sql's trigger was dropped.
drop trigger if exists order_items_recompute_total on public.order_items;
create trigger order_items_recompute_total
  after insert or update or delete on public.order_items
  for each row execute function public.recompute_order_total();

-- ===========================================================================
-- 5) Backfill existing orders' totals once, so already-placed orders reflect
--    the new rules immediately (no-op for a fresh DB).
-- ===========================================================================
update public.orders o
set total = coalesce((
      select sum(
        case
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
        end
      )
      from public.order_items oi
      where oi.order_id = o.id and oi.is_available
    ), 0);
