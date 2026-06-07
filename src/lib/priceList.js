// ---------------------------------------------------------------------------
// Price-list helpers (framework-free, pure) for the "Bo'lim bo'yicha PDF" export.
//
// These shape the data that the PDF generator (priceListPdf.js) draws:
//   * sort each category's products BY PRICE (asc/desc) with an A→Z name
//     tie-break, and
//   * format each row's price label ("40 000 so'm", "/ kg" for scale goods).
//
// Kept separate from the jsPDF code so the sorting / formatting can be unit
// tested without a DOM or the (heavy) PDF library.
// ---------------------------------------------------------------------------

import { formatSom } from './utils'

export const PRICE_SORT = { ASC: 'asc', DESC: 'desc' }

/** Numeric price used for sorting/labels — a product's listed (pack) price. */
export function priceOf(product) {
  const n = Number(product?.price)
  return Number.isFinite(n) ? n : 0
}

/**
 * Sort products BY PRICE for a price list. `order` is PRICE_SORT.ASC (cheapest
 * first, the default) or PRICE_SORT.DESC. Ties (equal price) break by name A→Z
 * using a locale-aware compare so Cyrillic / Uzbek-Latin order sensibly. Pure:
 * returns a new array and never mutates the input.
 */
export function sortByPrice(products = [], order = PRICE_SORT.ASC) {
  const dir = order === PRICE_SORT.DESC ? -1 : 1
  return [...products].sort((a, b) => {
    const diff = priceOf(a) - priceOf(b)
    if (diff !== 0) return dir * diff
    // Tie-break ALWAYS A→Z by name, regardless of the price direction.
    return String(a?.name ?? '').localeCompare(String(b?.name ?? ''), undefined, {
      sensitivity: 'base',
      numeric: true,
    })
  })
}

/**
 * One product's display fields for a price-list line:
 *   { name, price } e.g. { name: 'Dlya zavtrak', price: "40 000 so'm" }
 * kg (scale-weighed) goods get a "/ kg" suffix so the unit is unambiguous.
 */
export function formatPriceListRow(product) {
  const name = String(product?.name ?? '').trim() || '—'
  let price = formatSom(priceOf(product))
  if (product?.unit === 'kg') price += ' / kg'
  return { name, price }
}

/**
 * Group products under the SELECTED categories, each group's products sorted by
 * price. Category order follows the `categories` array; only ids in
 * `selectedIds` are kept. Returns:
 *   [{ category, products: [...sorted], count }]
 * Empty selected categories are included (count 0) so the user sees every
 * section they ticked.
 */
export function buildPriceListGroups(products = [], categories = [], selectedIds, order = PRICE_SORT.ASC) {
  const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds ?? [])
  const byCat = new Map()
  for (const p of products) {
    if (!selected.has(p.categoryId)) continue
    if (!byCat.has(p.categoryId)) byCat.set(p.categoryId, [])
    byCat.get(p.categoryId).push(p)
  }
  return categories
    .filter((c) => selected.has(c.id))
    .map((category) => {
      const list = sortByPrice(byCat.get(category.id) ?? [], order)
      return { category, products: list, count: list.length }
    })
}
