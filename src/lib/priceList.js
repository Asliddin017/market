// ---------------------------------------------------------------------------
// Price-list helpers (framework-free, pure) for the "Bo'lim bo'yicha PDF" export.
//
// These shape the data that the PDF generator (priceListPdf.js) draws:
//   * sort each category's products by the chosen order — BY PRICE (asc/desc,
//     keeping a product's size/variants together, see sortByPriceGrouped) or BY
//     NAME (A→Z / Z→A, tie-break by price asc), and
//   * format each row's price label ("40 000 so'm", "/ kg" for scale goods).
//
// Kept separate from the jsPDF code so the sorting / formatting can be unit
// tested without a DOM or the (heavy) PDF library.
// ---------------------------------------------------------------------------

import { formatSom } from './utils'

export const PRICE_SORT = { ASC: 'asc', DESC: 'desc' }
export const NAME_SORT = { ASC: 'name-asc', DESC: 'name-desc' }

// Every sort the export modal offers, in display order. `value` is what gets
// threaded through buildPriceListGroups / generatePriceListPdf; `label` is the
// Uzbek caption shown in the modal AND in the PDF header ("Saralash: …").
export const SORT_OPTIONS = [
  { value: PRICE_SORT.ASC, label: 'Narx (arzondan qimmatga)' },
  { value: PRICE_SORT.DESC, label: 'Narx (qimmatdan arzonga)' },
  { value: NAME_SORT.ASC, label: 'Nom (A → Z)' },
  { value: NAME_SORT.DESC, label: 'Nom (Z → A)' },
]

/** Default sort: price ascending (cheapest first). */
export const DEFAULT_SORT = PRICE_SORT.ASC

const SORT_LABELS = Object.fromEntries(SORT_OPTIONS.map((o) => [o.value, o.label]))

/** Human label for a sort value (falls back to the default's label). */
export function sortLabel(sort) {
  return SORT_LABELS[sort] ?? SORT_LABELS[DEFAULT_SORT]
}

/** Numeric price used for sorting/labels — a product's listed (pack) price. */
export function priceOf(product) {
  const n = Number(product?.price)
  return Number.isFinite(n) ? n : 0
}

/** A product's trimmed display name. */
export function nameOf(product) {
  return String(product?.name ?? '').trim()
}

// Locale-aware, case-insensitive name compare. We pass uz THEN ru as preferred
// locales so both Uzbek-Latin and Cyrillic order naturally (the engine picks the
// best supported); `sensitivity: 'base'` makes it case-insensitive and `numeric`
// sorts embedded numbers ("Cola 2" before "Cola 10").
const NAME_LOCALES = ['uz', 'ru']
function compareName(a, b) {
  return nameOf(a).localeCompare(nameOf(b), NAME_LOCALES, {
    sensitivity: 'base',
    numeric: true,
  })
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
 * Sort products BY NAME for a price list. `order` is NAME_SORT.ASC (A→Z, the
 * default) or NAME_SORT.DESC (Z→A). Equal names break by price ASCENDING (never
 * reversed) so identical names stay in a stable, sensible order. Pure: returns a
 * new array and never mutates the input.
 */
export function sortByName(products = [], order = NAME_SORT.ASC) {
  const dir = order === NAME_SORT.DESC ? -1 : 1
  return [...products].sort((a, b) => {
    const cmp = compareName(a, b)
    if (cmp !== 0) return dir * cmp
    // Tie-break ALWAYS by price ascending, regardless of the name direction.
    return priceOf(a) - priceOf(b)
  })
}

// ---- base-name / variant grouping ----------------------------------------
//
// Many products exist as several size/package variants ("Флэш Котта", "Флэш
// Ортача", "Флэш Кичкина"). Sorting purely by price scatters them across the
// list; instead we group variants by their BASE NAME (the product name without
// the size/package qualifier) so they always print consecutively.

// Size words stripped (with their Latin forms) when computing the base name.
// Matched case-insensitively against whole whitespace tokens.
const SIZE_WORDS = new Set([
  'кичкина', 'ортача', 'котта', // Uzbek-Cyrillic: small / medium / large
  'kichkina', 'ortacha', 'katta', 'kotta', // common Latin spellings
])

// A bare volume/quantity token, e.g. "0.5", "1,0", "0.33", "330ml", "1л", "5kg".
const VOLUME_RE = /^\d+(?:[.,]\d+)?(?:л|l|мл|ml|кг|kg|гр|г|g)?$/i

/** Is this whitespace token a size word or a bare volume token (→ stripped)? */
function isQualifierToken(token) {
  const t = String(token).toLocaleLowerCase()
  return SIZE_WORDS.has(t) || VOLUME_RE.test(t)
}

/**
 * The BASE name of a product (or raw name string) used to group variants:
 *   "Флэш Котта"        → "Флэш"
 *   "18+ Кичкина"       → "18+"
 *   "Кока кола (Banka)" → "Кока кола"
 *   "Pepsi 0.33"        → "Pepsi"
 * Parenthetical tags "(…)" are removed entirely, then TRAILING size/volume
 * qualifier tokens are stripped. A name with no recognisable qualifier keeps its
 * full name (it forms a group of one). Never strips down to nothing.
 */
export function baseName(nameOrProduct) {
  const raw = (typeof nameOrProduct === 'string' ? nameOrProduct : nameOf(nameOrProduct)).trim()
  // Drop parenthetical tags: "(Banka)", "(baklashka)", "(0.5)".
  const noParens = raw.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  const tokens = noParens.split(' ').filter(Boolean)
  // Strip trailing qualifier tokens, but never remove the last remaining token.
  while (tokens.length > 1 && isQualifierToken(tokens[tokens.length - 1])) tokens.pop()
  return tokens.join(' ').trim() || raw
}

/** Normalised grouping key for a product's base name (case-insensitive). */
function baseKey(product) {
  return baseName(product).toLocaleLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Sort products BY PRICE while keeping each product's size/variants TOGETHER.
 * Variants are bucketed by base name; within a bucket they're price-sorted in
 * the chosen direction (name A→Z tie-break). The buckets themselves are ordered
 * by their REPRESENTATIVE price — the bucket's min price for ASC, max for DESC
 * (i.e. its leading variant) — with an A→Z base-name tie-break. So a single
 * product slots in by its own price, and a multi-variant product stays
 * consecutive, positioned by its cheapest (asc) / priciest (desc) variant. Pure.
 */
export function sortByPriceGrouped(products = [], order = PRICE_SORT.ASC) {
  const dir = order === PRICE_SORT.DESC ? -1 : 1
  const groups = new Map() // key -> { base, items }
  for (const p of products) {
    const key = baseKey(p)
    if (!groups.has(key)) groups.set(key, { base: baseName(p), items: [] })
    groups.get(key).items.push(p)
  }
  const ordered = [...groups.values()].map((g) => {
    const items = sortByPrice(g.items, order)
    const prices = items.map(priceOf)
    const rep = dir === 1 ? Math.min(...prices) : Math.max(...prices)
    return { ...g, items, rep }
  })
  ordered.sort((a, b) => {
    const diff = a.rep - b.rep
    if (diff !== 0) return dir * diff
    return a.base.localeCompare(b.base, NAME_LOCALES, { sensitivity: 'base', numeric: true })
  })
  return ordered.flatMap((g) => g.items)
}

/**
 * Sort products by any SORT_OPTIONS value (defaults to price asc). Price modes
 * keep variants together (sortByPriceGrouped); name modes sort by full name, so
 * variants are already adjacent via their shared prefix.
 */
export function sortProducts(products = [], sort = DEFAULT_SORT) {
  if (sort === NAME_SORT.ASC || sort === NAME_SORT.DESC) return sortByName(products, sort)
  return sortByPriceGrouped(products, sort)
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
 * the chosen `sort` (any SORT_OPTIONS value). Category order follows the
 * `categories` array; only ids in `selectedIds` are kept. Returns:
 *   [{ category, products: [...sorted], count }]
 * Empty selected categories are included (count 0) so the user sees every
 * section they ticked.
 */
export function buildPriceListGroups(products = [], categories = [], selectedIds, sort = DEFAULT_SORT) {
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
      const list = sortProducts(byCat.get(category.id) ?? [], sort)
      return { category, products: list, count: list.length }
    })
}
