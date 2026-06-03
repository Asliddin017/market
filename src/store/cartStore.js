import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getUserCart } from '../hooks/useData'
import { SELL_MODE, canEditPrice, lineTotal as lineTotalImpl, total as cartTotal } from '../lib/pricing'

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
  loaded: false, // first load finished (success OR error)?
  error: null, // set when the saved cart failed to load

  /** Load the given client's saved cart into memory (null clears it). */
  loadForUser: async (clientId) => {
    if (clientId == null) {
      set({ clientId: null, items: [], updatedAt: null, loaded: true, error: null })
      return
    }
    set({ clientId, loaded: false, error: null })
    try {
      const { items } = await getUserCart(clientId)
      set({ clientId, items, updatedAt: new Date().toISOString(), loaded: true, error: null })
    } catch (err) {
      console.error('[cart] load failed:', err)
      // Keep loaded=false semantics distinct from empty: surface an error so the
      // page can offer a retry instead of falsely showing "savatcha bo'sh".
      set({ clientId, items: [], updatedAt: null, loaded: true, error: err })
    }
  },

  /** Re-run the load for the current client (retry button). */
  reload: () => get().loadForUser(get().clientId),

  /** Upsert one product row (quantity + custom price + sell mode) in Supabase. */
  _persistQty: async (productId, quantity) => {
    const { clientId, items } = get()
    if (clientId == null) return
    set({ updatedAt: new Date().toISOString() })
    const item = items.find((i) => i.id === productId)
    const { error } = await supabase
      .from('cart_items')
      .upsert(
        {
          client_id: clientId,
          product_id: productId,
          quantity,
          // Only kg items keep a custom price (Change A); ignore it otherwise.
          custom_price: item && canEditPrice(item) ? item.customPrice ?? null : null,
          sell_mode: item?.sellMode ?? null,
        },
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

  addItem: (product, qty = 1, opts = {}) => {
    const existing = get().items.find((i) => i.id === product.id)
    const newQty = (existing?.qty ?? 0) + qty
    // Default cigarettes to PACK (pachka = the normal product price); a card can
    // pass opts.sellMode to start in piece (dona) mode instead.
    const sellMode = opts.sellMode ?? (product.soldByPiece ? SELL_MODE.PACK : null)
    set((state) => ({
      items: existing
        ? state.items.map((i) =>
            i.id === product.id
              ? { ...i, qty: newQty, ...(opts.sellMode ? { sellMode: opts.sellMode } : {}) }
              : i,
          )
        : [
            ...state.items,
            {
              id: product.id,
              name: product.name,
              price: product.price,
              unit: product.unit,
              image: product.image ?? null,
              qty,
              customPrice: null, // only honored for kg items (Change A)
              // Per-piece (cigarette) config snapshot from the product (Change B).
              soldByPiece: Boolean(product.soldByPiece),
              piecePrice: product.piecePrice ?? null,
              pieceBundleQty: product.pieceBundleQty ?? null,
              pieceBundlePrice: product.pieceBundlePrice ?? null,
              sellMode,
            },
          ],
    }))
    get()._persistQty(product.id, newQty)
  },

  /**
   * Set (or clear) a client's custom price override for one line. Allowed ONLY
   * for kg items (Change A) — a no-op for anything else. `value`:
   *   null / '' -> clear the override (use the product's real price)
   *   a number  -> use that price; negatives/NaN are ignored (no-op).
   */
  setCustomPrice: (id, value) => {
    const target = get().items.find((i) => i.id === id)
    if (!target || !canEditPrice(target)) return // price fixed for non-kg items
    let custom = null
    if (value != null && String(value).trim() !== '') {
      const n = Number(value)
      if (!Number.isFinite(n) || n < 0) return // invalid -> ignore
      custom = Math.round(n)
    }
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, customPrice: custom } : i)),
    }))
    const item = get().items.find((i) => i.id === id)
    if (item) get()._persistQty(id, item.qty)
  },

  /** Switch a cigarette line between PACK (pachka) and PIECE (dona) pricing. */
  setSellMode: (id, mode) => {
    if (mode !== SELL_MODE.PACK && mode !== SELL_MODE.PIECE) return
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, sellMode: mode } : i)),
    }))
    const item = get().items.find((i) => i.id === id)
    if (item) get()._persistQty(id, item.qty)
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

// Derived selectors (use with the store hook in components). All money math
// goes through lib/pricing.js so the kg-custom + per-piece rules apply.
export const selectCount = (state) => state.items.reduce((sum, i) => sum + i.qty, 0)
export const selectTotal = (state) => cartTotal(state.items)

/** Compute count/total for an arbitrary items array (e.g. admin viewing a cart). */
export const cartTotals = (items = []) => ({
  count: items.reduce((s, i) => s + i.qty, 0),
  total: cartTotal(items),
})

// Per-line total (qty + all pricing rules) for the cart UI.
export const cartLineTotal = (item) => lineTotalImpl(item)
