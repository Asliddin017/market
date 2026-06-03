import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { slugify, toTitleCase } from '../lib/utils'

// ---------------------------------------------------------------------------
// Data access layer (Supabase).
//
// The app speaks camelCase ({ id, name, categoryId, price, unit, image,
// createdAt, updatedAt }); the database speaks snake_case. We translate at THIS
// boundary so the React components stay unchanged. Reads are live: each list
// hook subscribes to Postgres changes (realtime) and refetches, so an edit on
// one device shows up on every other device without a manual refresh.
//
// Every list hook returns { data, loading, error }:
//   loading -> data === undefined, loading === true
//   loaded  -> data is an array,  loading === false
//   error   -> error is set and console.error'd (never a silent blank page)
// ---------------------------------------------------------------------------

// ---- row <-> app mappers (exported for testing) ---------------------------
export const mapProduct = (r) => ({
  id: r.id,
  name: r.name,
  categoryId: r.category_id,
  price: r.price,
  unit: r.unit,
  image: r.image_url ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const mapCategory = (r) => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  icon: r.emoji ?? '📦',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const mapProfile = (r) => ({
  id: r.id,
  username: r.username,
  role: r.role,
  createdAt: r.created_at,
})

// ---- shared live-table hook (fetch + realtime refetch) --------------------
//
// Robust against network latency / live Supabase (the cause of "intermittent
// blank pages"):
//   * loading starts true and only flips false after the FIRST response
//     (success OR error). "still loading" (data === undefined) is never the same
//     as "loaded + empty" (data === []), so a page can always tell them apart.
//   * fetching is gated on auth being ready, so we never query before the
//     session/token is restored (an un-authed query can come back empty under
//     RLS and blank the page on F5).
//   * the first fetch retries once on a transient error (e.g. token not yet
//     propagated) before surfacing an error.
//   * a FAILED background/realtime refetch keeps the data already on screen
//     instead of wiping it to undefined — a reconnect blip never blanks a page.
//   * refetch() lets the UI offer a "Qayta urinish" (retry) button.
//
// Exported for testing.
export function useLiveTable(table, loader) {
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  // Only fetch once the Supabase session + profile are resolved.
  const authReady = useAuthStore((s) => s.ready)

  const [state, setState] = useState({ data: undefined, loading: true, error: null })
  // Mirror of state so the async runner can decide whether data is already on
  // screen (background refetch) without re-subscribing on every change.
  const stateRef = useRef(state)
  stateRef.current = state

  const [reloadKey, setReloadKey] = useState(0)
  const refetch = useCallback(() => {
    setState({ data: undefined, loading: true, error: null })
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!authReady) return // wait for auth before the first query
    let active = true

    const run = async (attempt = 0) => {
      try {
        const data = await loaderRef.current()
        if (active) setState({ data, loading: false, error: null })
      } catch (error) {
        if (!active) return
        // If data is already on screen this was a background / realtime refetch
        // — keep showing what we have rather than blanking to an error state.
        if (stateRef.current.data !== undefined) {
          console.error(`[useLiveTable:${table}] background refetch failed (kept current data):`, error)
          return
        }
        // First load failed: retry once (covers a not-yet-propagated token),
        // then surface the error so the page can show a retry button.
        if (attempt === 0) {
          console.error(`[useLiveTable:${table}] load failed, retrying once:`, error)
          setTimeout(() => { if (active) run(1) }, 400)
          return
        }
        console.error(`[useLiveTable:${table}] load failed:`, error)
        setState({ data: undefined, loading: false, error })
      }
    }

    run()

    // Unique channel name per subscription instance: two components can watch
    // the same table at once (e.g. Home + Products both use useProducts).
    const channel = supabase
      .channel(`public:${table}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => run())
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [table, authReady, reloadKey])

  return { ...state, refetch }
}

/** Live list of categories (name-sorted). Returns { data, loading, error }. */
export function useCategories() {
  return useLiveTable('categories', async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    return data.map(mapCategory)
  })
}

/** Live list of products (oldest first, matches the old createdAt order). */
export function useProducts() {
  return useLiveTable('products', async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data.map(mapProduct)
  })
}

/** Live list of all profiles (admin). Returns { data, loading, error }. */
export function useUsers() {
  return useLiveTable('profiles', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data.map(mapProfile)
  })
}

// ---- Product mutations ----------------------------------------------------

export async function saveProduct(product) {
  const payload = {
    name: toTitleCase(product.name),
    category_id: product.categoryId, // uuid string — do NOT Number() it
    price: Number(product.price) || 0,
    unit: product.unit || 'dona',
    image_url: product.image ?? null,
  }
  if (product.id) {
    // updated_at + price_history handled by DB triggers.
    const { error } = await supabase.from('products').update(payload).eq('id', product.id)
    if (error) throw error
    return product.id
  }
  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

/** Price-change history for a product (newest first). */
export async function getPriceHistory(productId) {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('product_id', productId)
    .order('changed_at', { ascending: false })
  if (error) throw error
  return data.map((r) => ({
    id: r.id,
    oldPrice: r.old_price,
    newPrice: r.new_price,
    changedAt: r.changed_at,
  }))
}

// ---- Category mutations ---------------------------------------------------

export async function saveCategory(category) {
  const name = toTitleCase(category.name)
  const payload = { name, slug: slugify(name), emoji: category.icon || '📦' }
  if (category.id) {
    const { error } = await supabase.from('categories').update(payload).eq('id', category.id)
    if (error) throw error
    return category.id
  }
  const { data, error } = await supabase
    .from('categories')
    .insert(payload)
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/**
 * Delete a category. Refuses if products still reference it, returning the
 * count so the UI can warn the user (DB also has ON DELETE RESTRICT as a guard).
 */
export async function deleteCategory(id) {
  const { count, error: countErr } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
  if (countErr) throw countErr
  if (count && count > 0) {
    return { ok: false, used: count }
  }
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
  return { ok: true }
}

// ---- User mutations (admin) ----------------------------------------------

export async function updateUserRole(id, role) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
  if (error) throw error
}

/** Fetch a single client's saved cart (admin: view client carts). */
export async function getUserCart(userId) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('quantity, updated_at, products ( id, name, price, unit, image_url )')
    .eq('client_id', userId)
  if (error) throw error
  const items = (data ?? [])
    .filter((row) => row.products)
    .map((row) => ({
      id: row.products.id,
      name: row.products.name,
      price: row.products.price,
      unit: row.products.unit,
      image: row.products.image_url ?? null,
      qty: row.quantity,
    }))
  return { items }
}

// ---- Backup: export / import (admin) --------------------------------------

/** Export all categories + products to a plain JSON-serialisable object. */
export async function exportData() {
  const [{ data: cats, error: cErr }, { data: prods, error: pErr }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('products').select('*').order('created_at'),
  ])
  if (cErr) throw cErr
  if (pErr) throw pErr
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    categories: cats.map(mapCategory),
    products: prods.map(mapProduct),
  }
}

/**
 * Import a backup object (as produced by exportData, or the shape of
 * products.json). Idempotent: categories upsert by name, products upsert by
 * (category_id, name). Returns { categories, products } counts written.
 */
export async function importData(payload) {
  // Accept either our export shape (categories: [{name, icon}], products:
  // [{name, categoryId|category, price, unit, image}]) or the raw products.json
  // shape (categories: ["Name", ...]).
  const rawCats = payload?.categories ?? []
  const catRows = rawCats.map((c) =>
    typeof c === 'string'
      ? { name: toTitleCase(c), slug: slugify(c), emoji: '📦' }
      : { name: toTitleCase(c.name), slug: slugify(c.name), emoji: c.icon || c.emoji || '📦' },
  )

  const { data: cats, error: cErr } = await supabase
    .from('categories')
    .upsert(catRows, { onConflict: 'name' })
    .select('id, name')
  if (cErr) throw cErr
  const idByName = new Map(cats.map((c) => [c.name, c.id]))

  const rawProducts = payload?.products ?? []
  const prodRows = []
  for (const p of rawProducts) {
    // Resolve category by id (export) or by name (products.json / mixed).
    let categoryId = p.categoryId ?? p.category_id ?? null
    if (!categoryId && (p.category || p.categoryName)) {
      categoryId = idByName.get(toTitleCase(p.category ?? p.categoryName))
    }
    if (!categoryId) continue
    prodRows.push({
      name: toTitleCase(p.name),
      category_id: categoryId,
      price: Number(p.price) || 0,
      unit: p.unit || 'dona',
      image_url: p.image ?? p.image_url ?? null,
    })
  }

  let written = 0
  const CHUNK = 200
  for (let i = 0; i < prodRows.length; i += CHUNK) {
    const chunk = prodRows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('products')
      .upsert(chunk, { onConflict: 'category_id,name' })
    if (error) throw error
    written += chunk.length
  }

  return { categories: cats.length, products: written }
}
