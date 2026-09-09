import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCartStore, selectCount, selectTotal, cartTotals } from './cartStore'

// These tests exercise the in-memory cart logic + selectors. With clientId left
// null (the default, e.g. an admin/seller or an unauthenticated render), the
// persistence helpers short-circuit, so no Supabase calls happen.

const A = { id: 'a', name: 'Olma', price: 1000, unit: 'kg', image: null }
const B = { id: 'b', name: 'Sut', price: 1500, unit: 'litr', image: null }

beforeEach(() => {
  useCartStore.setState({ clientId: null, items: [], updatedAt: null, loaded: false })
})

describe('cart add / quantity logic', () => {
  it('adds a new item with the given quantity', () => {
    useCartStore.getState().addItem(A, 2)
    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 'a', qty: 2, price: 1000 })
  })

  it('merges quantity when the same product is added again', () => {
    const { addItem } = useCartStore.getState()
    addItem(A, 1)
    addItem(A, 3)
    const items = useCartStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].qty).toBe(4)
  })

  it('increment / decrement adjust quantity', () => {
    const s = useCartStore.getState()
    s.addItem(A, 1)
    s.increment('a')
    expect(useCartStore.getState().items[0].qty).toBe(2)
    s.decrement('a')
    expect(useCartStore.getState().items[0].qty).toBe(1)
  })

  it('decrementing to zero removes the item', () => {
    const s = useCartStore.getState()
    s.addItem(A, 1)
    s.decrement('a')
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('setQty clamps negatives to 0 (which drops the line)', () => {
    const s = useCartStore.getState()
    s.addItem(A, 2)
    s.setQty('a', -5)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('removeItem deletes the line', () => {
    const s = useCartStore.getState()
    s.addItem(A, 1)
    s.addItem(B, 1)
    s.removeItem('a')
    const ids = useCartStore.getState().items.map((i) => i.id)
    expect(ids).toEqual(['b'])
  })
})

describe('cart selectors / totals', () => {
  it('selectCount and selectTotal aggregate quantity and money', () => {
    const s = useCartStore.getState()
    s.addItem(A, 2) // 2 * 1000
    s.addItem(B, 3) // 3 * 1500
    const state = useCartStore.getState()
    expect(selectCount(state)).toBe(5)
    expect(selectTotal(state)).toBe(2 * 1000 + 3 * 1500)
  })

  it('cartTotals works on an arbitrary items array (admin viewing a cart)', () => {
    const items = [
      { id: 'x', qty: 2, price: 500 },
      { id: 'y', qty: 1, price: 750 },
    ]
    expect(cartTotals(items)).toEqual({ count: 3, total: 1750 })
  })

  it('cartTotals tolerates an empty / missing array', () => {
    expect(cartTotals()).toEqual({ count: 0, total: 0 })
    expect(cartTotals([])).toEqual({ count: 0, total: 0 })
  })

  it('cartTotals uses the custom price for a kg line (ignored for non-kg)', () => {
    const items = [
      { id: 'x', qty: 2, price: 1000, unit: 'kg', customPrice: 1500 }, // 2 * 1500 (kg)
      { id: 'y', qty: 1, price: 750, unit: 'dona', customPrice: 999 }, // 1 * 750 (custom ignored)
    ]
    expect(cartTotals(items)).toEqual({ count: 3, total: 2 * 1500 + 750 })
  })
})

describe('custom price override', () => {
  it('setCustomPrice overrides the unit price used in selectTotal', () => {
    const s = useCartStore.getState()
    s.addItem(A, 2) // original 1000
    s.setCustomPrice('a', 1800)
    const state = useCartStore.getState()
    expect(state.items[0].customPrice).toBe(1800)
    expect(selectTotal(state)).toBe(2 * 1800)
  })

  it('clearing the custom price (empty string) reverts to the real price', () => {
    const s = useCartStore.getState()
    s.addItem(A, 1)
    s.setCustomPrice('a', 5000)
    s.setCustomPrice('a', '')
    const state = useCartStore.getState()
    expect(state.items[0].customPrice).toBeNull()
    expect(selectTotal(state)).toBe(1000)
  })

  it('ignores invalid (negative / NaN) custom prices', () => {
    const s = useCartStore.getState()
    s.addItem(A, 1)
    s.setCustomPrice('a', -50)
    s.setCustomPrice('a', 'abc')
    expect(useCartStore.getState().items[0].customPrice).toBeNull()
  })

  it('new items start with no custom price', () => {
    useCartStore.getState().addItem(A, 1)
    expect(useCartStore.getState().items[0].customPrice).toBeNull()
  })

  it('is a no-op for non-kg (dona/litr) items — price stays fixed (Change A)', () => {
    const s = useCartStore.getState()
    s.addItem(B, 1) // litr
    s.setCustomPrice('b', 999)
    const state = useCartStore.getState()
    expect(state.items[0].customPrice).toBeNull()
    expect(selectTotal(state)).toBe(1500) // unchanged real price
  })
})

// ---- Change B: cigarettes by pack (pachka) or piece (dona) ----------------
const CIG_BUNDLE = {
  id: 'c',
  name: 'Винстон',
  price: 22000,
  unit: 'dona',
  image: null,
  soldByPiece: true,
  piecePrice: 2000,
  pieceBundleQty: 3,
  pieceBundlePrice: 5000,
}

describe('cigarette piece pricing in the cart', () => {
  it('defaults to PACK mode (pachka) using the pack price', () => {
    const s = useCartStore.getState()
    s.addItem(CIG_BUNDLE, 2)
    const state = useCartStore.getState()
    expect(state.items[0].sellMode).toBe('pachka')
    expect(selectTotal(state)).toBe(44000) // 2 * 22000
  })

  it('PIECE (dona) mode applies the 3 = 5000 bundle math', () => {
    const s = useCartStore.getState()
    s.addItem(CIG_BUNDLE, 6)
    s.setSellMode('c', 'dona')
    expect(selectTotal(useCartStore.getState())).toBe(10000) // 2 bundles
  })

  it('can be added straight into dona mode via opts', () => {
    const s = useCartStore.getState()
    s.addItem(CIG_BUNDLE, 4, { sellMode: 'dona' })
    const state = useCartStore.getState()
    expect(state.items[0].sellMode).toBe('dona')
    expect(selectTotal(state)).toBe(7000) // 5000 + 2000
  })

  it('setSellMode ignores unknown modes', () => {
    const s = useCartStore.getState()
    s.addItem(CIG_BUNDLE, 1)
    s.setSellMode('c', 'bogus')
    expect(useCartStore.getState().items[0].sellMode).toBe('pachka')
  })

  it('cartTotals also honors piece pricing', () => {
    const items = [
      { id: 'c', qty: 3, price: 22000, unit: 'dona', soldByPiece: true, sellMode: 'dona', piecePrice: 2000, pieceBundleQty: 3, pieceBundlePrice: 5000 },
    ]
    expect(cartTotals(items)).toEqual({ count: 3, total: 5000 })
  })
})

describe('cart persistence ordering (per-product write queue)', () => {
  it('runs writes for one product strictly in order even when earlier ones resolve late', async () => {
    const { supabase } = await import('../lib/supabase')
    const pending = []
    // Every upsert returns a promise WE resolve — the first one last.
    const from = vi.spyOn(supabase, 'from').mockImplementation(() => ({
      upsert: (row) =>
        new Promise((resolve) => {
          pending.push({ row, resolve })
        }),
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    }))
    try {
      useCartStore.setState({ clientId: 'u1', items: [], updatedAt: null, loaded: true })
      const s = useCartStore.getState()
      s.addItem(A, 1) // queued write: qty 1
      s.increment('a') // must wait for the first write
      s.increment('a') // and the second
      await new Promise((r) => setTimeout(r, 0))
      // Only the FIRST write has been sent; the rest are queued behind it.
      expect(pending).toHaveLength(1)
      expect(pending[0].row.quantity).toBe(1)

      pending[0].resolve({ error: null })
      await new Promise((r) => setTimeout(r, 0))
      expect(pending).toHaveLength(2)
      expect(pending[1].row.quantity).toBe(2)
      pending[1].resolve({ error: null })
      await new Promise((r) => setTimeout(r, 0))
      expect(pending).toHaveLength(3)
      expect(pending[2].row.quantity).toBe(3)
      pending[2].resolve({ error: null })
      await new Promise((r) => setTimeout(r, 0))
      expect(pending.map((p) => p.row.quantity)).toEqual([1, 2, 3])
    } finally {
      from.mockRestore()
      useCartStore.setState({ clientId: null, items: [], updatedAt: null, loaded: false })
    }
  })
})

// ---------------------------------------------------------------------------
// Guest (not logged in) cart: lives in localStorage, merged into the account's
// Supabase cart on login.
// ---------------------------------------------------------------------------
import { mergeCarts, GUEST_CART_KEY } from './cartStore'

describe('mergeCarts (pure)', () => {
  it('sums quantities for shared products and appends guest-only lines', () => {
    const server = [{ id: 'a', qty: 2, price: 1000, customPrice: 900 }]
    const guest = [
      { id: 'a', qty: 3, price: 1000, customPrice: null },
      { id: 'b', qty: 1, price: 1500 },
    ]
    const merged = mergeCarts(server, guest)
    expect(merged).toHaveLength(2)
    // Server line wins for everything but quantity.
    expect(merged.find((i) => i.id === 'a')).toMatchObject({ qty: 5, customPrice: 900 })
    expect(merged.find((i) => i.id === 'b')).toMatchObject({ qty: 1 })
  })

  it('tolerates empty inputs', () => {
    expect(mergeCarts([], [])).toEqual([])
    expect(mergeCarts(undefined, [{ id: 'a', qty: 1 }])).toHaveLength(1)
  })
})

describe('guest cart (localStorage)', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.setState({ clientId: null, guest: false, items: [], updatedAt: null, loaded: false })
  })

  it('loadForUser(null, {guest:true}) restores the saved guest cart', async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify([{ ...A, qty: 2 }]))
    await useCartStore.getState().loadForUser(null, { guest: true })
    const s = useCartStore.getState()
    expect(s.guest).toBe(true)
    expect(s.loaded).toBe(true)
    expect(s.items).toHaveLength(1)
    expect(s.items[0]).toMatchObject({ id: 'a', qty: 2 })
  })

  it('guest mutations persist to localStorage (no Supabase)', async () => {
    const { supabase } = await import('../lib/supabase')
    const from = vi.spyOn(supabase, 'from')
    try {
      await useCartStore.getState().loadForUser(null, { guest: true })
      const s = useCartStore.getState()
      s.addItem(A, 1)
      s.increment('a')
      s.addItem(B, 1)
      s.removeItem('b')
      const saved = JSON.parse(localStorage.getItem(GUEST_CART_KEY))
      expect(saved).toHaveLength(1)
      expect(saved[0]).toMatchObject({ id: 'a', qty: 2 })
      expect(from).not.toHaveBeenCalled()
      await s.clear()
      expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull()
    } finally {
      from.mockRestore()
    }
  })

  it('a non-guest null load (staff) ignores the saved guest cart', async () => {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify([{ ...A, qty: 2 }]))
    await useCartStore.getState().loadForUser(null)
    expect(useCartStore.getState().items).toEqual([])
    expect(useCartStore.getState().guest).toBe(false)
  })

  it('logging in merges the guest cart into the account cart and clears localStorage', async () => {
    const useData = await import('../hooks/useData')
    const getUserCart = vi
      .spyOn(useData, 'getUserCart')
      .mockResolvedValue({ items: [{ ...A, qty: 1, customPrice: null, sellMode: null }] })
    const { supabase } = await import('../lib/supabase')
    const upserts = []
    const from = vi.spyOn(supabase, 'from').mockImplementation(() => ({
      upsert: (row) => {
        upserts.push(row)
        return Promise.resolve({ error: null })
      },
    }))
    try {
      localStorage.setItem(
        GUEST_CART_KEY,
        JSON.stringify([
          { ...A, qty: 2 },
          { ...B, qty: 1 },
        ]),
      )
      await useCartStore.getState().loadForUser('u1')
      await new Promise((r) => setTimeout(r, 0))
      const s = useCartStore.getState()
      expect(s.guest).toBe(false)
      expect(s.clientId).toBe('u1')
      expect(s.items.find((i) => i.id === 'a').qty).toBe(3)
      expect(s.items.find((i) => i.id === 'b').qty).toBe(1)
      // Merged lines were written back to Supabase.
      expect(upserts.map((r) => [r.product_id, r.quantity]).sort()).toEqual([
        ['a', 3],
        ['b', 1],
      ])
      expect(localStorage.getItem(GUEST_CART_KEY)).toBeNull()
      expect(getUserCart).toHaveBeenCalledWith('u1')
    } finally {
      from.mockRestore()
      getUserCart.mockRestore()
    }
  })
})
