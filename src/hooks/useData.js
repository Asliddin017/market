import { useLiveQuery } from 'dexie-react-hooks'
import { db, slugify } from '../db/db'

// NOTE: these return `undefined` while the (async) IndexedDB query is still in
// flight, and the array once it resolves. Callers should coalesce with `?? []`
// and may use the `undefined` value to distinguish "loading" from "empty".

/** Live list of categories (re-renders automatically on any change). */
export function useCategories() {
  return useLiveQuery(() => db.categories.orderBy('name').toArray(), [])
}

/** Live list of products. */
export function useProducts() {
  return useLiveQuery(() => db.products.toArray(), [])
}

/** Live list of all users (admin). */
export function useUsers() {
  return useLiveQuery(() => db.users.orderBy('createdAt').toArray(), [])
}

// ---- Product mutations ----------------------------------------------------

export async function saveProduct(product) {
  const now = new Date().toISOString()
  const payload = {
    name: product.name.trim(),
    categoryId: Number(product.categoryId),
    price: Number(product.price) || 0,
    unit: product.unit || 'dona',
    image: product.image ?? null,
  }
  if (product.id) {
    // Preserve createdAt; bump updatedAt.
    await db.products.update(product.id, { ...payload, updatedAt: now })
    return product.id
  }
  return db.products.add({ ...payload, createdAt: now, updatedAt: now })
}

export async function deleteProduct(id) {
  await db.products.delete(id)
}

// ---- Category mutations ---------------------------------------------------

export async function saveCategory(category) {
  const name = category.name.trim()
  const payload = { name, slug: slugify(name), icon: category.icon || '📦' }
  if (category.id) {
    await db.categories.update(category.id, payload)
    return category.id
  }
  return db.categories.add({ ...payload, createdAt: new Date().toISOString() })
}

/**
 * Delete a category. Refuses if products still reference it, returning the
 * count so the UI can warn the user.
 */
export async function deleteCategory(id) {
  const used = await db.products.where('categoryId').equals(id).count()
  if (used > 0) {
    return { ok: false, used }
  }
  await db.categories.delete(id)
  return { ok: true }
}

// ---- User mutations (admin) ----------------------------------------------

export async function updateUserRole(id, role) {
  await db.users.update(id, { role })
}

/** Fetch a single user's saved cart (admin: view client carts). */
export async function getUserCart(userId) {
  return db.carts.get(userId)
}
