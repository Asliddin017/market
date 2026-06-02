import { create } from 'zustand'
import { db } from '../db/db'

// ---------------------------------------------------------------------------
// Per-user shopping cart, backed by the `carts` table in IndexedDB (keyed by
// userId). This lets the cart persist across refreshes AND lets an admin view
// any client's saved cart. Each item stores a price/name snapshot so the cart
// stays correct even if the underlying product later changes.
//
// The active user's cart is mirrored in memory for fast, reactive UI; every
// mutation writes back to Dexie (fire-and-forget).
// ---------------------------------------------------------------------------

export const useCartStore = create((set, get) => ({
  userId: null,
  items: [], // [{ id, name, price, unit, image, qty }]
  updatedAt: null,
  loaded: false,

  /** Load the given user's saved cart into memory (null clears it). */
  loadForUser: async (userId) => {
    if (userId == null) {
      set({ userId: null, items: [], updatedAt: null, loaded: true })
      return
    }
    const row = await db.carts.get(userId)
    set({ userId, items: row?.items ?? [], updatedAt: row?.updatedAt ?? null, loaded: true })
  },

  /** Persist current in-memory cart to Dexie for the active user. */
  _save: () => {
    const { userId, items } = get()
    if (userId == null) return
    const updatedAt = new Date().toISOString()
    set({ updatedAt })
    db.carts.put({ userId, items, updatedAt })
  },

  addItem: (product, qty = 1) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === product.id)
      if (existing) {
        return {
          items: state.items.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i)),
        }
      }
      return {
        items: [
          ...state.items,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            unit: product.unit,
            image: product.image ?? null,
            qty,
          },
        ],
      }
    })
    get()._save()
  },

  setQty: (id, qty) => {
    set((state) => ({
      items: state.items
        .map((i) => (i.id === id ? { ...i, qty: Math.max(0, qty) } : i))
        .filter((i) => i.qty > 0),
    }))
    get()._save()
  },

  increment: (id) => get().setQty(id, (get().items.find((i) => i.id === id)?.qty ?? 0) + 1),
  decrement: (id) => get().setQty(id, (get().items.find((i) => i.id === id)?.qty ?? 0) - 1),

  removeItem: (id) => {
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
    get()._save()
  },

  clear: () => {
    set({ items: [] })
    get()._save()
  },
}))

// Derived selectors (use with the store hook in components).
export const selectCount = (state) => state.items.reduce((sum, i) => sum + i.qty, 0)
export const selectTotal = (state) => state.items.reduce((sum, i) => sum + i.qty * i.price, 0)

/** Compute count/total for an arbitrary items array (e.g. admin viewing a cart). */
export const cartTotals = (items = []) => ({
  count: items.reduce((s, i) => s + i.qty, 0),
  total: items.reduce((s, i) => s + i.qty * i.price, 0),
})
