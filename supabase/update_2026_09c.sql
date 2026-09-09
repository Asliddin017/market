-- ===========================================================================
-- 2026-09-09 — Public storefront (browse without an account).
--
-- Anyone (the `anon` role = not signed in) can now READ the catalogue:
-- products, categories and the "Aloqa" contacts, plus the best-sellers RPC
-- used on the home page. Nothing else opens up: carts, orders, profiles,
-- login log and every INSERT/UPDATE/DELETE stay `authenticated`-only.
--
-- Client-hidden categories (hidden_for_clients, e.g. cigarettes) stay hidden
-- for guests too: current_app_role() is NULL for anon, so the staff branch is
-- never true and only the `not hidden_for_clients` branch can pass.
--
-- Idempotent — safe to paste into the Supabase SQL editor more than once.
-- ===========================================================================

drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories
  for select to anon, authenticated
  using (public.current_app_role() in ('admin', 'seller') or not hidden_for_clients);

drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select to anon, authenticated
  using (
    public.current_app_role() in ('admin', 'seller')
    or not exists (
      select 1 from public.categories c
      where c.id = category_id and c.hidden_for_clients
    )
  );

drop policy if exists "contacts_select" on public.contacts;
create policy "contacts_select" on public.contacts
  for select to anon, authenticated using (true);

-- Home page "Ko'p sotilganlar" (non-PII aggregate; already excludes hidden
-- categories for non-staff callers).
grant execute on function public.best_sellers(int) to anon;
