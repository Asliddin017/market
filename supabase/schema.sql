-- ===========================================================================
-- ASL_ZIYO — Supabase schema + Row Level Security + triggers
-- ---------------------------------------------------------------------------
-- Run this whole file in the Supabase SQL Editor (Dashboard -> SQL -> New query)
-- or push it with the Supabase CLI (see README). It is ordered so it runs
-- top-to-bottom in a single paste:
--
--   1. extensions
--   2. TABLES (in dependency order: profiles -> categories -> products
--      -> cart_items -> price_history)
--   3. helper functions (only after the tables they read exist)
--   4. triggers
--   5. enable RLS
--   6. RLS policies
--
-- Everything is idempotent (create ... if not exists / or replace /
-- drop ... if exists) so it is safe to run multiple times.
--
-- Tables:
--   profiles       — one row per auth user (username, role)
--   categories     — product categories (name, slug, emoji)
--   products       — products (price in so'm as integer, unit, image_url)
--   cart_items     — one row per (client, product) with a quantity
--   price_history  — append-only log of product price changes
-- ===========================================================================

-- ===========================================================================
-- 1) Extensions
-- ===========================================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ===========================================================================
-- 2) TABLES (created FIRST, in dependency order, before any function/policy
--    references them).
-- ===========================================================================

-- profiles -------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique,
  role       text not null default 'client' check (role in ('admin', 'seller', 'client')),
  created_at timestamptz not null default now()
);

-- categories -----------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null,
  emoji      text not null default '📦',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- products -------------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  price       integer not null default 0 check (price >= 0), -- so'm
  unit        text not null default 'dona' check (unit in ('dona', 'kg', 'litr')),
  image_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Unique per category so the seed script can upsert idempotently.
create unique index if not exists products_name_category_udx
  on public.products (category_id, name);
create index if not exists products_category_idx on public.products (category_id);

-- cart_items (one row per client+product) ------------------------------------
create table if not exists public.cart_items (
  client_id  uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity   integer not null default 1 check (quantity > 0),
  updated_at timestamptz not null default now(),
  primary key (client_id, product_id)
);

-- price_history (append-only) ------------------------------------------------
create table if not exists public.price_history (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  old_price  integer,
  new_price  integer not null,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now()
);

create index if not exists price_history_product_idx
  on public.price_history (product_id, changed_at desc);

-- ===========================================================================
-- 3) Helper functions (now that the tables exist).
-- ===========================================================================

-- The calling user's role, read from profiles.
-- SECURITY DEFINER + a fixed search_path so it can read profiles WITHOUT
-- tripping that table's RLS — this is what prevents infinite recursion when
-- the profiles policies themselves call this function.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Generic "touch updated_at" trigger function.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- New auth user -> create a matching profile row (role defaults to 'client').
-- Username comes from the sign-up metadata; falls back to the email local-part.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    'client'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Log a row whenever a product's price actually changes.
create or replace function public.log_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'UPDATE' and new.price is distinct from old.price) then
    insert into public.price_history (product_id, old_price, new_price, changed_by)
    values (new.id, old.price, new.price, auth.uid());
  end if;
  return new;
end;
$$;

-- ===========================================================================
-- 4) Triggers.
-- ===========================================================================

-- Create the profile row right after an auth user is created.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh on categories & products.
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

-- Append a price_history row on every price change.
drop trigger if exists products_log_price_change on public.products;
create trigger products_log_price_change
  after update on public.products
  for each row execute function public.log_price_change();

-- ===========================================================================
-- 5) Enable Row Level Security.
-- ===========================================================================
alter table public.profiles      enable row level security;
alter table public.categories    enable row level security;
alter table public.products      enable row level security;
alter table public.cart_items    enable row level security;
alter table public.price_history enable row level security;

-- ===========================================================================
-- 6) RLS policies.
-- ===========================================================================

-- profiles -------------------------------------------------------------------
-- Any authenticated user can read profiles (needed to load own role; admins
-- list all users on the Foydalanuvchilar page). NOTE: this SELECT policy is a
-- plain `using (true)` and does NOT call current_app_role(), so there is no
-- recursion. The admin-only write policies use the SECURITY DEFINER helper.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

-- Only admins may change roles (or otherwise update profile rows).
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- Only admins may delete profiles.
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated using (public.current_app_role() = 'admin');

-- categories -----------------------------------------------------------------
drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories
  for select to authenticated using (true);

drop policy if exists "categories_insert_staff" on public.categories;
create policy "categories_insert_staff" on public.categories
  for insert to authenticated
  with check (public.current_app_role() in ('admin', 'seller'));

drop policy if exists "categories_update_staff" on public.categories;
create policy "categories_update_staff" on public.categories
  for update to authenticated
  using (public.current_app_role() in ('admin', 'seller'))
  with check (public.current_app_role() in ('admin', 'seller'));

drop policy if exists "categories_delete_admin" on public.categories;
create policy "categories_delete_admin" on public.categories
  for delete to authenticated using (public.current_app_role() = 'admin');

-- products -------------------------------------------------------------------
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select to authenticated using (true);

drop policy if exists "products_insert_staff" on public.products;
create policy "products_insert_staff" on public.products
  for insert to authenticated
  with check (public.current_app_role() in ('admin', 'seller'));

drop policy if exists "products_update_staff" on public.products;
create policy "products_update_staff" on public.products
  for update to authenticated
  using (public.current_app_role() in ('admin', 'seller'))
  with check (public.current_app_role() in ('admin', 'seller'));

drop policy if exists "products_delete_admin" on public.products;
create policy "products_delete_admin" on public.products
  for delete to authenticated using (public.current_app_role() = 'admin');

-- cart_items -----------------------------------------------------------------
-- A client manages ONLY their own cart; admins may additionally READ any cart.
drop policy if exists "cart_select_own_or_admin" on public.cart_items;
create policy "cart_select_own_or_admin" on public.cart_items
  for select to authenticated
  using (client_id = auth.uid() or public.current_app_role() = 'admin');

drop policy if exists "cart_insert_own" on public.cart_items;
create policy "cart_insert_own" on public.cart_items
  for insert to authenticated with check (client_id = auth.uid());

drop policy if exists "cart_update_own" on public.cart_items;
create policy "cart_update_own" on public.cart_items
  for update to authenticated
  using (client_id = auth.uid()) with check (client_id = auth.uid());

drop policy if exists "cart_delete_own" on public.cart_items;
create policy "cart_delete_own" on public.cart_items
  for delete to authenticated using (client_id = auth.uid());

-- price_history --------------------------------------------------------------
-- Staff can read history; rows are written only by the (definer) trigger above.
drop policy if exists "price_history_select_staff" on public.price_history;
create policy "price_history_select_staff" on public.price_history
  for select to authenticated
  using (public.current_app_role() in ('admin', 'seller'));

-- ===========================================================================
-- 7) Realtime: expose the tables the app subscribes to (idempotent).
-- ===========================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;

-- ===========================================================================
-- FIRST ADMIN
-- After signing up once with username "Asliddin017" in the app, promote it:
--   update public.profiles set role = 'admin'
--   where username = 'Asliddin017';
-- ===========================================================================
