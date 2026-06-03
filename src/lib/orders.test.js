import { describe, it, expect } from 'vitest'
import {
  ORDER_STATUS,
  statusMeta,
  nextStatus,
  effectivePrice,
  lineTotal,
  orderTotal,
  splitAvailability,
  isReceiptReady,
  normalizeCustomPrice,
} from './orders'

const line = (over = {}) => ({
  id: 'i1',
  name: 'Cola',
  unit: 'dona',
  originalPrice: 13000,
  customPrice: null,
  quantity: 2,
  isAvailable: true,
  ...over,
})

describe('effectivePrice / lineTotal', () => {
  it('uses the original price when there is no custom price', () => {
    expect(effectivePrice(line())).toBe(13000)
    expect(lineTotal(line())).toBe(26000)
  })

  it('uses the custom price when set (client override)', () => {
    expect(effectivePrice(line({ customPrice: 18000 }))).toBe(18000)
    expect(lineTotal(line({ customPrice: 18000 }))).toBe(36000)
  })

  it('treats a 0 custom price as a real override, not "unset"', () => {
    expect(effectivePrice(line({ customPrice: 0 }))).toBe(0)
  })
})

describe('orderTotal', () => {
  it('sums available lines using the effective price', () => {
    const items = [
      line({ id: 'a', originalPrice: 1000, quantity: 2 }), // 2000
      line({ id: 'b', originalPrice: 5000, customPrice: 4000, quantity: 1 }), // 4000
    ]
    expect(orderTotal(items)).toBe(6000)
  })

  it('excludes unavailable ("yo\'q") lines from the total', () => {
    const items = [
      line({ id: 'a', originalPrice: 1000, quantity: 2 }), // 2000 ok
      line({ id: 'b', originalPrice: 9000, quantity: 1, isAvailable: false }), // excluded
    ]
    expect(orderTotal(items)).toBe(2000)
  })

  it('is 0 for an empty list', () => {
    expect(orderTotal([])).toBe(0)
  })
})

describe('splitAvailability', () => {
  it('separates available vs unavailable lines', () => {
    const items = [line({ id: 'a' }), line({ id: 'b', isAvailable: false })]
    const { available, unavailable } = splitAvailability(items)
    expect(available.map((i) => i.id)).toEqual(['a'])
    expect(unavailable.map((i) => i.id)).toEqual(['b'])
  })
})

describe('status helpers', () => {
  it('statusMeta returns Uzbek labels for known statuses', () => {
    expect(statusMeta(ORDER_STATUS.PLACED).label).toBe('Buyurtma berildi')
    expect(statusMeta(ORDER_STATUS.READY).label).toBe('Buyurtmangiz tayyor')
  })

  it('statusMeta falls back gracefully for an unknown status', () => {
    const m = statusMeta('???')
    expect(m.label).toBe('???')
    expect(m.badge).toContain('text-slate-300')
  })

  it('nextStatus advances through the flow and stops at the end', () => {
    expect(nextStatus(ORDER_STATUS.PLACED)).toBe(ORDER_STATUS.PREPARING)
    expect(nextStatus(ORDER_STATUS.PREPARING)).toBe(ORDER_STATUS.READY)
    expect(nextStatus(ORDER_STATUS.READY)).toBeNull()
    expect(nextStatus('unknown')).toBeNull()
  })

  it('isReceiptReady is true only when ready', () => {
    expect(isReceiptReady(ORDER_STATUS.READY)).toBe(true)
    expect(isReceiptReady(ORDER_STATUS.PLACED)).toBe(false)
  })
})

describe('normalizeCustomPrice', () => {
  it('returns null for empty / blank input (use real price)', () => {
    expect(normalizeCustomPrice('')).toBeNull()
    expect(normalizeCustomPrice('   ')).toBeNull()
    expect(normalizeCustomPrice(null)).toBeNull()
  })

  it('returns a rounded non-negative number for valid input', () => {
    expect(normalizeCustomPrice('18000')).toBe(18000)
    expect(normalizeCustomPrice(' 1500 ')).toBe(1500)
    expect(normalizeCustomPrice(99.6)).toBe(100)
    expect(normalizeCustomPrice('0')).toBe(0)
  })

  it('returns undefined (invalid) for negatives / non-numbers', () => {
    expect(normalizeCustomPrice('-5')).toBeUndefined()
    expect(normalizeCustomPrice('abc')).toBeUndefined()
  })
})
