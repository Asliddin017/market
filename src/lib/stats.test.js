import { describe, it, expect } from 'vitest'
import {
  isCompleted,
  availableItems,
  orderRevenue,
  rankBestSellers,
  revenueStats,
  COMPLETED_STATUS,
} from './stats'

// Minimal order-item shape (as produced by mapOrderItem): dona/fixed lines here.
const line = (productId, quantity, originalPrice, extra = {}) => ({
  id: `${productId}-${quantity}`,
  productId,
  quantity,
  unit: 'dona',
  originalPrice,
  isAvailable: true,
  ...extra,
})

describe('isCompleted / availableItems / orderRevenue', () => {
  it('only "tayyor" is completed', () => {
    expect(COMPLETED_STATUS).toBe('tayyor')
    expect(isCompleted({ status: 'tayyor' })).toBe(true)
    expect(isCompleted({ status: 'buyurtma_berildi' })).toBe(false)
  })
  it('availableItems drops unavailable ("yo\'q") lines', () => {
    const order = { items: [line('p1', 1, 1000), line('p2', 1, 2000, { isAvailable: false })] }
    expect(availableItems(order)).toHaveLength(1)
    expect(orderRevenue(order)).toBe(1000) // unavailable line excluded
  })
})

describe('rankBestSellers (completed orders, available lines)', () => {
  const orders = [
    { status: 'tayyor', items: [line('p1', 2, 1000)] },
    {
      status: 'tayyor',
      items: [line('p1', 3, 1000), line('p2', 1, 5000, { isAvailable: false })],
    },
    // Not completed -> fully ignored (even though p2 has big quantity here).
    { status: 'buyurtma_berildi', items: [line('p2', 10, 5000)] },
  ]

  it('ranks by total quantity across completed+available lines only', () => {
    const ranked = rankBestSellers(orders)
    expect(ranked).toEqual([{ productId: 'p1', qtySold: 5, revenue: 5000 }])
  })

  it('breaks ties by higher revenue, then product id', () => {
    const tie = [
      {
        status: 'tayyor',
        items: [line('a', 4, 1000), line('b', 4, 3000), line('c', 4, 2000)],
      },
    ]
    // same qty (4) -> order by revenue desc: b(12000) > c(8000) > a(4000)
    expect(rankBestSellers(tie).map((r) => r.productId)).toEqual(['b', 'c', 'a'])
  })

  it('respects the limit', () => {
    const many = [
      { status: 'tayyor', items: [line('a', 5, 1), line('b', 4, 1), line('c', 3, 1)] },
    ]
    expect(rankBestSellers(many, { limit: 2 }).map((r) => r.productId)).toEqual(['a', 'b'])
  })
})

describe('revenueStats (completed-orders-only, bucketed by ready date)', () => {
  const now = new Date('2026-06-17T12:00:00') // Wednesday
  const orders = [
    { status: 'tayyor', total: 10000, readyAt: '2026-06-17T08:00:00' }, // today
    { status: 'tayyor', total: 20000, readyAt: '2026-06-16T10:00:00' }, // this week (Mon-based)
    { status: 'tayyor', total: 5000, readyAt: '2026-06-03T10:00:00' }, // this month, before week
    { status: 'tayyor', total: 7000, readyAt: '2026-05-20T10:00:00' }, // older
    { status: 'buyurtma_berildi', total: 99999, readyAt: '2026-06-17T09:00:00' }, // ignored
  ]

  it('sums revenue + counts only completed orders, by bucket', () => {
    expect(revenueStats(orders, now)).toEqual({
      revenueToday: 10000,
      revenueWeek: 30000,
      revenueMonth: 35000,
      revenueTotal: 42000,
      ordersToday: 1,
      ordersMonth: 3,
      ordersTotal: 4,
    })
  })

  it('falls back to line totals when order.total is absent', () => {
    const o = [{ status: 'tayyor', readyAt: '2026-06-17T08:00:00', items: [line('p1', 2, 1500)] }]
    expect(revenueStats(o, now).revenueTotal).toBe(3000)
  })
})
