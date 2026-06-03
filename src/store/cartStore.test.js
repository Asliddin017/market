import { describe, it, expect, beforeEach } from 'vitest'
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

  it('cartTotals uses the custom price when a line has one', () => {
    const items = [
      { id: 'x', qty: 2, price: 1000, customPrice: 1500 }, // 2 * 1500
      { id: 'y', qty: 1, price: 750, customPrice: null }, // 1 * 750
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
})
