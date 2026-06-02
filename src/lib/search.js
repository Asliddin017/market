import Fuse from 'fuse.js'
import { toTime } from './utils'

// ---------------------------------------------------------------------------
// Smart search for ASL_ZIYO.
//
// Goals:
//  - typo tolerant ("energtik", "energetic", "energtic" -> "energetik")
//  - searches product name AND category name
//  - typing a category name returns ALL products in that category
//  - flexible with Uzbek letters (o', g', sh, ch, cyrillic ў/ғ/қ/ҳ)
//  - results sorted by relevance (best match first)
// ---------------------------------------------------------------------------

/**
 * Normalise a string so spelling variants collapse to one canonical form.
 * This is the key to "Uzbek-flexible" matching: we fold the many ways people
 * write the same word (oʻ / o' / ў, gʻ / g' / ғ, latin/cyrillic) together.
 */
export function normalize(str = '') {
  let s = String(str).toLowerCase().trim()

  // Unify the various apostrophe / tovush belgisi characters, then drop them.
  s = s.replace(/[`'ʻʼ’‘´]/g, '')

  // Cyrillic -> latin folding for the common Uzbek-specific letters.
  const cyr = {
    ў: 'o', ғ: 'g', қ: 'q', ҳ: 'h', а: 'a', б: 'b', в: 'v', г: 'g',
    д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k',
    л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'x', ц: 's', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '',
    ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  }
  s = s.replace(/[а-яёўғқҳ]/g, (ch) => cyr[ch] ?? ch)

  // Strip remaining diacritics (é -> e, ö -> o, etc).
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '')

  // Common digraph + foreign-spelling folding so "energetic" ~ "energetik".
  s = s
    .replace(/sh/g, 's')
    .replace(/ch/g, 'c')
    .replace(/ck/g, 'k')
    .replace(/c/g, 'k') // "energetic" -> "energetik"
    .replace(/x/g, 'h')
    .replace(/ц/g, 's')

  // Collapse whitespace.
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

/**
 * Build the searchable dataset. Each product is augmented with its category
 * name and normalised fields used purely for matching.
 *
 * @param {Array} products  products from the DB
 * @param {Array} categories categories from the DB
 */
function buildIndexData(products, categories) {
  const catById = new Map(categories.map((c) => [c.id, c]))
  return products.map((p) => {
    const cat = catById.get(p.categoryId)
    const categoryName = cat?.name ?? ''
    return {
      ...p,
      categoryName,
      _name: normalize(p.name),
      _category: normalize(categoryName),
    }
  })
}

/**
 * Run a smart search.
 *
 * @returns {Array} products sorted by relevance. Empty query returns all
 *                  products (newest first) untouched.
 */
export function smartSearch(query, products, categories) {
  const data = buildIndexData(products, categories)

  const q = normalize(query)
  if (!q) return products.slice().sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))

  // 1) Does the query look like a category? If a category name fuzzily matches,
  //    we want EVERY product in that category included.
  const catFuse = new Fuse(categories, {
    keys: [{ name: 'name', getFn: (c) => normalize(c.name) }],
    includeScore: true,
    threshold: 0.45,
    ignoreLocation: true,
  })
  const catMatches = catFuse.search(q)
  const matchedCategoryIds = new Set(
    catMatches.filter((m) => m.score <= 0.45).map((m) => m.item.id),
  )

  // 2) Fuzzy search across product name + category name.
  const productFuse = new Fuse(data, {
    keys: [
      { name: '_name', weight: 0.7 },
      { name: '_category', weight: 0.3 },
    ],
    includeScore: true,
    threshold: 0.5, // generous -> typo tolerant
    distance: 200,
    minMatchCharLength: 1,
    ignoreLocation: true,
  })
  const productMatches = productFuse.search(q)

  // Score map: lower is better. Start from fuzzy product scores.
  const scored = new Map()
  for (const m of productMatches) {
    scored.set(m.item.id, { item: m.item, score: m.score ?? 1 })
  }

  // Fold in every product belonging to a matched category (strong relevance).
  if (matchedCategoryIds.size) {
    for (const item of data) {
      if (matchedCategoryIds.has(item.categoryId)) {
        const prev = scored.get(item.id)
        // Give category hits a solid score, but keep direct name hits ahead.
        const catScore = 0.2
        if (!prev || catScore < prev.score) {
          scored.set(item.id, { item, score: prev ? Math.min(prev.score, catScore) : catScore })
        }
      }
    }
  }

  return Array.from(scored.values())
    .sort((a, b) => a.score - b.score)
    .map((s) => s.item)
}
