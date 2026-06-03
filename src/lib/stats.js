// ---------------------------------------------------------------------------
// Sales statistics + best-seller ranking (framework-free, pure).
//
// This is the JS reference for the numbers; the Supabase SECURITY DEFINER
// functions in supabase/update_2026_06.sql MIRROR these rules so the heavy
// aggregation can run in the DB (efficient, RLS-safe) while the logic stays
// unit-tested here. Money math goes through lib/pricing.js (single source of
// truth), so piece/kg/fixed pricing is applied consistently.
//
// Rules:
//   * Only COMPLETED orders (status = 'tayyor') count toward revenue/stats.
//   * Only AVAILABLE lines (is_available !== false) are counted, at final price.
//   * Best-sellers rank by total quantity sold; ties broken by higher revenue,
//     then by product id (stable, deterministic).
// ---------------------------------------------------------------------------

import { lineTotal } from './pricing'

export const COMPLETED_STATUS = 'tayyor'

const intQty = (it) => Math.max(0, Math.floor(Number(it?.quantity ?? it?.qty) || 0))

/** True for a fully completed (ready) order. */
export function isCompleted(order) {
  return order?.status === COMPLETED_STATUS
}

/** Available (not "yo'q") lines of an order. */
export function availableItems(order) {
  return (order?.items ?? []).filter((i) => i.isAvailable !== false)
}

/** Revenue of one order from its available lines (matches orders.total). */
export function orderRevenue(order) {
  return availableItems(order).reduce((sum, it) => sum + lineTotal(it), 0)
}

/**
 * Rank best-selling products across COMPLETED orders' available lines.
 * @returns {Array<{productId, qtySold, revenue}>} sorted, sliced to `limit`.
 */
export function rankBestSellers(orders = [], { limit = 8 } = {}) {
  const map = new Map()
  for (const order of orders) {
    if (!isCompleted(order)) continue
    for (const it of availableItems(order)) {
      const pid = it.productId ?? it.id
      if (pid == null) continue
      const cur = map.get(pid) ?? { productId: pid, qtySold: 0, revenue: 0 }
      cur.qtySold += intQty(it)
      cur.revenue += lineTotal(it)
      map.set(pid, cur)
    }
  }
  const ranked = Array.from(map.values()).sort(
    (a, b) =>
      b.qtySold - a.qtySold ||
      b.revenue - a.revenue ||
      String(a.productId).localeCompare(String(b.productId)),
  )
  return limit > 0 ? ranked.slice(0, limit) : ranked
}

const startOfDay = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
// Week starts Monday (matches Postgres date_trunc('week')).
const startOfWeek = (d) => {
  const x = startOfDay(d)
  const dow = (x.getDay() + 6) % 7 // 0 = Monday
  x.setDate(x.getDate() - dow)
  return x
}
const startOfMonth = (d) => {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

/** Date an order's revenue is attributed to: ready_at, else created_at. */
export function revenueDate(order) {
  return new Date(order?.readyAt ?? order?.createdAt ?? Date.now())
}

/**
 * Headline revenue + order-count stats from COMPLETED orders only. Prefers the
 * authoritative `order.total` when present, else recomputes from the lines.
 * Mirrors the SQL sales_stats() function.
 */
export function revenueStats(orders = [], now = new Date()) {
  const dayS = startOfDay(now)
  const weekS = startOfWeek(now)
  const monthS = startOfMonth(now)
  const acc = {
    revenueToday: 0,
    revenueWeek: 0,
    revenueMonth: 0,
    revenueTotal: 0,
    ordersToday: 0,
    ordersMonth: 0,
    ordersTotal: 0,
  }
  for (const o of orders) {
    if (!isCompleted(o)) continue
    const rev = o.total != null ? Number(o.total) || 0 : orderRevenue(o)
    const ev = revenueDate(o)
    acc.revenueTotal += rev
    acc.ordersTotal += 1
    if (ev >= monthS) {
      acc.revenueMonth += rev
      acc.ordersMonth += 1
    }
    if (ev >= weekS) acc.revenueWeek += rev
    if (ev >= dayS) {
      acc.revenueToday += rev
      acc.ordersToday += 1
    }
  }
  return acc
}
