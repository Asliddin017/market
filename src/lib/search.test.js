import { describe, it, expect } from 'vitest'
import { normalize, smartSearch, searchCategories } from './search'

describe('normalize', () => {
  it('folds apostrophe variants and case', () => {
    expect(normalize("O'simlik")).toBe('osimlik')
    expect(normalize('Oʻsimlik')).toBe('osimlik')
  })

  it('folds Uzbek-specific Cyrillic + Latin to one canonical form', () => {
    // ў/o', ғ/g', қ/q, ҳ/h
    expect(normalize('ғalaba')).toBe(normalize("g'alaba"))
    expect(normalize('ўrik')).toBe(normalize("o'rik"))
  })

  it('folds foreign spelling so "energetic" ~ "energetik"', () => {
    expect(normalize('energetic')).toBe(normalize('energetik'))
  })

  it('maps a full Cyrillic word to its Latin canonical form', () => {
    // горилла -> g o r i l l a
    expect(normalize('Горилла')).toBe('gorilla')
  })
})

const categories = [
  { id: 'c1', name: 'Energetik ichimliklar', slug: 'energetik-ichimliklar' },
  { id: 'c2', name: 'Sut mahsulotlari', slug: 'sut-mahsulotlari' },
]
const products = [
  { id: 'p1', name: 'Red Bull Energetik', categoryId: 'c1', price: 18000, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'p2', name: 'Adrenalin Rush', categoryId: 'c1', price: 16000, createdAt: '2026-01-02T00:00:00Z' },
  { id: 'p3', name: 'Sut 1L', categoryId: 'c2', price: 12000, createdAt: '2026-01-03T00:00:00Z' },
  { id: 'p4', name: 'Gorilla', categoryId: 'c1', price: 15000, createdAt: '2026-01-04T00:00:00Z' },
]

describe('smartSearch', () => {
  it('returns all products (newest first) for an empty query', () => {
    const res = smartSearch('', products, categories)
    expect(res.map((p) => p.id)).toEqual(['p4', 'p3', 'p2', 'p1'])
  })

  it('is typo tolerant ("energtik" finds the energetik product)', () => {
    const res = smartSearch('energtik', products, categories)
    const ids = res.map((p) => p.id)
    expect(ids).toContain('p1')
  })

  it('matches a category name and returns every product in that category', () => {
    const res = smartSearch('energetik ichimliklar', products, categories)
    const ids = res.map((p) => p.id)
    expect(ids).toEqual(expect.arrayContaining(['p1', 'p2', 'p4']))
    expect(ids).not.toContain('p3') // dairy product excluded
  })

  it('matches a Cyrillic query against a Latin product name (горила ~ Gorilla)', () => {
    const res = smartSearch('горила', products, categories)
    expect(res.map((p) => p.id)).toContain('p4')
  })

  it('returns nothing for a clearly unrelated query', () => {
    const res = smartSearch('xyzqwertyuiop', products, categories)
    expect(res).toHaveLength(0)
  })
})

describe('searchCategories', () => {
  const cats = [
    { id: 'c1', name: 'Shokolad' },
    { id: 'c2', name: 'Choy' },
    { id: 'c3', name: 'Sut mahsulotlari' },
    { id: 'c4', name: 'Энергетик' },
  ]

  it('returns all categories (unchanged order) for an empty query', () => {
    expect(searchCategories('', cats)).toBe(cats)
    expect(searchCategories('   ', cats).map((c) => c.id)).toEqual(['c1', 'c2', 'c3', 'c4'])
  })

  it('matches by name, case-insensitive', () => {
    expect(searchCategories('shokolad', cats).map((c) => c.id)).toContain('c1')
    expect(searchCategories('CHOY', cats).map((c) => c.id)).toContain('c2')
  })

  it('is typo tolerant ("shokalad" finds Shokolad)', () => {
    expect(searchCategories('shokalad', cats).map((c) => c.id)).toContain('c1')
  })

  it('matches a Latin query against a Cyrillic category name', () => {
    expect(searchCategories('energetik', cats).map((c) => c.id)).toContain('c4')
  })

  it('returns an empty array when nothing matches', () => {
    expect(searchCategories('xyzqwertyuiop', cats)).toHaveLength(0)
  })
})
