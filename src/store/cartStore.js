import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getUserCart } from '../hooks/useData'

// ---------------------------------------------------------------------------
// Per-client shopping cart, backed by the `cart_items` table in Supabase
// (one row per client+product). The active cart is mirrored in memory for a
// fast, reactive UI; every mutation writes back to Supabase (fire-and-forget,
// errors are logged). RLS guarantees a client can only touch their own rows;
// admins can read any client's cart via getUserCart (Users page).
// ---------------------------------------------------------------------------

export const useCartStore = create((set, get) => ({
  clientId: null,
  items: [], // [{ id, name, price, unit, image, qty }]
  updatedAt: null,
  loaded: false,

  /** Load the given client's saved cart into memory (null clears it). */
  loadForUser: async (clientId) => {
    if (clientId == null) {
      set({ clientId: null, items: [], updatedAt: null, loaded: true })
      return
    }
    set({ clientId, loaded: false })
    try {
      const { items } = await getUserCart(clientId)
      set({ clientId, items, updatedAt: new Date().toISOString(), loaded: true })
    } catch (err) {
      console.error('[cart] load failed:', err)
      set({ clientId, items: [], updatedAt: null, loaded: true })
    }
  },

  /** Upsert one product row to the given quantity in Supabase. */
  _persistQty: async (productId, quantity) => {
    const { clientId } = get()
    if (clientId == null) return
    set({ updatedAt: new Date().toISOString() })
    const { error } = await supabase
      .from('cart_items')
      .upsert(
        { client_id: clientId, product_id: productId, quantity },
        { onConflict: 'client_id,product_id' },
      )
    if (error) console.error('[cart] save failed:', error)
  },

  _persistDelete: async (productId) => {
    const { clientId } = get()
    if (clientId == null) return
    set({ updatedAt: new Date().toISOString() })
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('client_id', clientId)
      .eq('product_id', productId)
    if (error) console.error('[cart] delete failed:', error)
  },

  addItem: (product, qty = 1) => {
    const existing = get().items.find((i) => i.id === product.id)
    const newQty = (existing?.qty ?? 0) + qty
    set((state) => ({
      items: existing
        ? state.items.map((i) => (i.id === product.id ? { ...i, qty: newQty } : i))
        : [
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
    }))
    get()._persistQty(product.id, newQty)
  },

  setQty: (id, qty) => {
    const next = Math.max(0, qty)
    set((state) => ({
      items: state.items
        .map((i) => (i.id === id ? { ...i, qty: next } : i))
        .filter((i) => i.qty > 0),
    }))
    if (next <= 0) get()._persistDelete(id)
    else get()._persistQty(id, next)
  },

  increment: (id) => get().setQty(id, (get().items.find((i) => i.id === id)?.qty ?? 0) + 1),
  decrement: (id) => get().setQty(id, (get().items.find((i) => i.id === id)?.qty ?? 0) - 1),

  removeItem: (id) => {
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
    get()._persistDelete(id)
  },

  clear: async () => {
    const { clientId } = get()
    set({ items: [], updatedAt: new Date().toISOString() })
    if (clientId == null) return
    const { error } = await supabase.from('cart_items').delete().eq('client_id', clientId)
    if (error) console.error('[cart] clear failed:', error)
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
