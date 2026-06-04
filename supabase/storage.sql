-- ===========================================================================
-- ASL_ZIYO — Product image Storage (Supabase Storage bucket + RLS)
-- ---------------------------------------------------------------------------
-- Run AFTER supabase/schema.sql (it reuses public.current_app_role()). Paste
-- the WHOLE file into the Supabase SQL Editor (Dashboard -> SQL -> New query)
-- and Run, or `supabase db execute --file supabase/storage.sql`. Fully
-- idempotent (guarded insert / drop policy if exists) — safe to run repeatedly.
--
-- What this does:
--   1) Creates a PUBLIC bucket "product-images" (public read; files served via
--      the public CDN URL stored in products.image_url).
--   2) RLS on storage.objects for that bucket:
--      - SELECT  (read)            -> everyone (public),
--      - INSERT/UPDATE/DELETE      -> ONLY admin & seller, via current_app_role()
--        (the same helper + pattern as the products/categories policies).
--   Clients can VIEW images but can never upload/replace/remove them.
-- ===========================================================================

-- 1) Bucket (public read). If it already exists, just (re)assert it's public.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- storage.objects already has RLS enabled by Supabase; policies below scope it.

-- 2a) Public read for everyone (anon + authenticated) — only this bucket.
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select
  using (bucket_id = 'product-images');

-- 2b) Upload — admin & seller only.
drop policy if exists "product_images_staff_insert" on storage.objects;
create policy "product_images_staff_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.current_app_role() in ('admin', 'seller')
  );

-- 2c) Replace/overwrite — admin & seller only.
drop policy if exists "product_images_staff_update" on storage.objects;
create policy "product_images_staff_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and public.current_app_role() in ('admin', 'seller')
  )
  with check (
    bucket_id = 'product-images'
    and public.current_app_role() in ('admin', 'seller')
  );

-- 2d) Delete — admin & seller only.
drop policy if exists "product_images_staff_delete" on storage.objects;
create policy "product_images_staff_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and public.current_app_role() in ('admin', 'seller')
  );
