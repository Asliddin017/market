import { describe, it, expect } from 'vitest'
import {
  PRICE_SORT,
  NAME_SORT,
  SORT_OPTIONS,
  DEFAULT_SORT,
  sortLabel,
  priceOf,
  nameOf,
  sortByPrice,
  sortByName,
  sortProducts,
  formatPriceListRow,
  buildPriceListGroups,
} from './priceList'

const names = (list) => list.map((p) => p.name)
// formatSom groups thousands with a non-breaking space (U+00A0); normalise to a
// plain space so assertions read naturally (matches utils.test.js).
const norm = (s) => String(s).replace(/\s/g, ' ')

describe('priceOf', () => {
  it('reads a finite numeric price', () => {
    expect(priceOf({ price: 18000 })).toBe(18000)
  })
  it('coerces numeric strings and defaults junk to 0', () => {
    expect(priceOf({ price: '5000' })).toBe(5000)
    expect(priceOf({ price: null })).toBe(0)
    expect(priceOf({})).toBe(0)
    expect(priceOf({ price: 'abc' })).toBe(0)
  })
})

describe('sortByPrice — ascending (default)', () => {
  it('orders cheapest → most expensive', () => {
    const list = [
      { name: 'B', price: 30000 },
      { name: 'A', price: 10000 },
      { name: 'C', price: 20000 },
    ]
    expect(names(sortByPrice(list, PRICE_SORT.ASC))).toEqual(['A', 'C', 'B'])
  })
  it('defaults to ascending when no order is given', () => {
    const list = [
      { name: 'B', price: 30000 },
      { name: 'A', price: 10000 },
    ]
    expect(names(sortByPrice(list))).toEqual(['A', 'B'])
  })
})

describe('sortByPrice — descending', () => {
  it('orders most expensive → cheapest', () => {
    const list = [
      { name: 'B', price: 30000 },
      { name: 'A', price: 10000 },
      { name: 'C', price: 20000 },
    ]
    expect(names(sortByPrice(list, PRICE_SORT.DESC))).toEqual(['B', 'C', 'A'])
  })
})

describe('sortByPrice — tie-break by name A→Z', () => {
  it('breaks equal prices by name A→Z in ASCENDING mode', () => {
    const list = [
      { name: 'Zebra', price: 5000 },
      { name: 'Apple', price: 5000 },
      { name: 'Mango', price: 5000 },
    ]
    expect(names(sortByPrice(list, PRICE_SORT.ASC))).toEqual(['Apple', 'Mango', 'Zebra'])
  })
  it('STILL breaks equal prices by name A→Z in DESCENDING mode (tie-break is not reversed)', () => {
    const list = [
      { name: 'Zebra', price: 5000 },
      { name: 'Apple', price: 5000 },
      { name: 'Mango', price: 5000 },
    ]
    expect(names(sortByPrice(list, PRICE_SORT.DESC))).toEqual(['Apple', 'Mango', 'Zebra'])
  })
  it('combines price order with the A→Z tie-break', () => {
    const list = [
      { name: 'Cheap-B', price: 1000 },
      { name: 'Pricey', price: 9000 },
      { name: 'Cheap-A', price: 1000 },
    ]
    expect(names(sortByPrice(list, PRICE_SORT.ASC))).toEqual(['Cheap-A', 'Cheap-B', 'Pricey'])
    expect(names(sortByPrice(list, PRICE_SORT.DESC))).toEqual(['Pricey', 'Cheap-A', 'Cheap-B'])
  })
  it('sorts Cyrillic names sensibly on a tie', () => {
    const list = [
      { name: 'Докторская', price: 40000 },
      { name: 'Бекон', price: 40000 },
    ]
    expect(names(sortByPrice(list, PRICE_SORT.ASC))).toEqual(['Бекон', 'Докторская'])
  })
})

describe('sortByPrice — purity', () => {
  it('does not mutate the input array', () => {
    const list = [
      { name: 'B', price: 2 },
      { name: 'A', price: 1 },
    ]
    const before = [...list]
    sortByPrice(list, PRICE_SORT.ASC)
    expect(list).toEqual(before)
  })
})

describe('nameOf', () => {
  it('trims and defaults to empty string', () => {
    expect(nameOf({ name: '  Cola  ' })).toBe('Cola')
    expect(nameOf({})).toBe('')
    expect(nameOf(null)).toBe('')
  })
})

describe('sortByName — A→Z (default) and Z→A', () => {
  it('orders names A→Z by default', () => {
    const list = [
      { name: 'Mango', price: 1 },
      { name: 'Apple', price: 1 },
      { name: 'Zebra', price: 1 },
    ]
    expect(names(sortByName(list))).toEqual(['Apple', 'Mango', 'Zebra'])
    expect(names(sortByName(list, NAME_SORT.ASC))).toEqual(['Apple', 'Mango', 'Zebra'])
  })
  it('orders names Z→A in descending mode', () => {
    const list = [
      { name: 'Mango', price: 1 },
      { name: 'Apple', price: 1 },
      { name: 'Zebra', price: 1 },
    ]
    expect(names(sortByName(list, NAME_SORT.DESC))).toEqual(['Zebra', 'Mango', 'Apple'])
  })
  it('is case-insensitive', () => {
    const list = [
      { name: 'banana', price: 1 },
      { name: 'Apple', price: 1 },
      { name: 'cherry', price: 1 },
    ]
    expect(names(sortByName(list, NAME_SORT.ASC))).toEqual(['Apple', 'banana', 'cherry'])
  })
  it('orders Cyrillic names naturally (А→Я) and reverses on Z→A', () => {
    const list = [
      { name: 'Докторская', price: 1 },
      { name: 'Бекон', price: 1 },
      { name: 'Сосиски', price: 1 },
    ]
    expect(names(sortByName(list, NAME_SORT.ASC))).toEqual(['Бекон', 'Докторская', 'Сосиски'])
    expect(names(sortByName(list, NAME_SORT.DESC))).toEqual(['Сосиски', 'Докторская', 'Бекон'])
  })
})

describe('sortByName — price tie-break for equal names', () => {
  it('breaks equal names by price ASCENDING in A→Z mode', () => {
    const list = [
      { name: 'Cola', price: 9000 },
      { name: 'Cola', price: 3000 },
      { name: 'Cola', price: 6000 },
    ]
    expect(sortByName(list, NAME_SORT.ASC).map((p) => p.price)).toEqual([3000, 6000, 9000])
  })
  it('STILL breaks equal names by price ASCENDING in Z→A mode (tie-break not reversed)', () => {
    const list = [
      { name: 'Cola', price: 9000 },
      { name: 'Cola', price: 3000 },
      { name: 'Cola', price: 6000 },
    ]
    expect(sortByName(list, NAME_SORT.DESC).map((p) => p.price)).toEqual([3000, 6000, 9000])
  })
  it('combines name order with the price tie-break', () => {
    const list = [
      { name: 'Suv', price: 5000 },
      { name: 'Cola', price: 9000 },
      { name: 'Cola', price: 4000 },
    ]
    expect(
      sortByName(list, NAME_SORT.ASC).map((p) => `${p.name}:${p.price}`),
    ).toEqual(['Cola:4000', 'Cola:9000', 'Suv:5000'])
  })
})

describe('sortByName — purity', () => {
  it('does not mutate the input array', () => {
    const list = [
      { name: 'B', price: 1 },
      { name: 'A', price: 1 },
    ]
    const before = [...list]
    sortByName(list, NAME_SORT.ASC)
    expect(list).toEqual(before)
  })
})

describe('sortProducts — dispatcher', () => {
  const list = [
    { name: 'Banana', price: 30000 },
    { name: 'Apple', price: 10000 },
    { name: 'Cherry', price: 20000 },
  ]
  it('routes price values to the price sort', () => {
    expect(names(sortProducts(list, PRICE_SORT.ASC))).toEqual(['Apple', 'Cherry', 'Banana'])
    expect(names(sortProducts(list, PRICE_SORT.DESC))).toEqual(['Banana', 'Cherry', 'Apple'])
  })
  it('routes name values to the name sort', () => {
    expect(names(sortProducts(list, NAME_SORT.ASC))).toEqual(['Apple', 'Banana', 'Cherry'])
    expect(names(sortProducts(list, NAME_SORT.DESC))).toEqual(['Cherry', 'Banana', 'Apple'])
  })
  it('defaults to price ascending', () => {
    expect(names(sortProducts(list))).toEqual(['Apple', 'Cherry', 'Banana'])
    expect(DEFAULT_SORT).toBe(PRICE_SORT.ASC)
  })
})

describe('SORT_OPTIONS / sortLabel', () => {
  it('exposes the four options in display order', () => {
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual([
      PRICE_SORT.ASC,
      PRICE_SORT.DESC,
      NAME_SORT.ASC,
      NAME_SORT.DESC,
    ])
  })
  it('maps each value to its Uzbek label', () => {
    expect(sortLabel(PRICE_SORT.ASC)).toBe('Narx (arzondan qimmatga)')
    expect(sortLabel(PRICE_SORT.DESC)).toBe('Narx (qimmatdan arzonga)')
    expect(sortLabel(NAME_SORT.ASC)).toBe('Nom (A → Z)')
    expect(sortLabel(NAME_SORT.DESC)).toBe('Nom (Z → A)')
  })
  it('falls back to the default label for unknown values', () => {
    expect(sortLabel('nope')).toBe(sortLabel(DEFAULT_SORT))
  })
})

describe('formatPriceListRow', () => {
  it('formats a dona item as "<price> so\'m" (grouped thousands, no /kg)', () => {
    const row = formatPriceListRow({ name: 'Dlya zavtrak', price: 40000, unit: 'dona' })
    expect(row.name).toBe('Dlya zavtrak')
    expect(norm(row.price)).toBe("40 000 so'm")
  })
  it('appends " / kg" for kg (scale) items', () => {
    const row = formatPriceListRow({ name: 'Kazy', price: 120000, unit: 'kg' })
    expect(row.name).toBe('Kazy')
    expect(norm(row.price)).toBe("120 000 so'm / kg")
  })
  it('does NOT append /kg for litr', () => {
    expect(norm(formatPriceListRow({ name: 'Sut', price: 12000, unit: 'litr' }).price)).toBe("12 000 so'm")
  })
  it('trims the name and falls back to "—" when missing', () => {
    expect(formatPriceListRow({ name: '  Cola  ', price: 8000 }).name).toBe('Cola')
    expect(formatPriceListRow({ price: 0 }).name).toBe('—')
  })
  it('renders a zero / missing price as "0 so\'m"', () => {
    expect(norm(formatPriceListRow({ name: 'X' }).price)).toBe("0 so'm")
  })
})

describe('buildPriceListGroups', () => {
  const categories = [
    { id: 'c1', name: 'Kolbasa' },
    { id: 'c2', name: 'Ichimliklar' },
    { id: 'c3', name: 'Boshqa' },
  ]
  const products = [
    { name: 'Докторская', price: 40000, unit: 'kg', categoryId: 'c1' },
    { name: 'Bekon', price: 55000, unit: 'kg', categoryId: 'c1' },
    { name: 'Cola', price: 9000, unit: 'dona', categoryId: 'c2' },
    { name: 'Suv', price: 3000, unit: 'dona', categoryId: 'c2' },
  ]

  it('keeps only selected categories, in the categories[] order', () => {
    const groups = buildPriceListGroups(products, categories, ['c2', 'c1'], PRICE_SORT.ASC)
    expect(groups.map((g) => g.category.id)).toEqual(['c1', 'c2'])
  })
  it('sorts each group by price and reports the count', () => {
    const groups = buildPriceListGroups(products, categories, new Set(['c1', 'c2']), PRICE_SORT.ASC)
    const kolbasa = groups.find((g) => g.category.id === 'c1')
    expect(names(kolbasa.products)).toEqual(['Докторская', 'Bekon']) // 40k < 55k
    expect(kolbasa.count).toBe(2)
    const drinks = groups.find((g) => g.category.id === 'c2')
    expect(names(drinks.products)).toEqual(['Suv', 'Cola']) // 3k < 9k
  })
  it('honours the descending order', () => {
    const groups = buildPriceListGroups(products, categories, ['c1'], PRICE_SORT.DESC)
    expect(names(groups[0].products)).toEqual(['Bekon', 'Докторская'])
  })
  it('honours a NAME sort within each category', () => {
    const groups = buildPriceListGroups(products, categories, ['c1', 'c2'], NAME_SORT.ASC)
    // Latin sorts before Cyrillic; within c2 names go A→Z by name (not price).
    expect(names(groups.find((g) => g.category.id === 'c1').products)).toEqual([
      'Bekon',
      'Докторская',
    ])
    expect(names(groups.find((g) => g.category.id === 'c2').products)).toEqual(['Cola', 'Suv'])
  })
  it('includes a selected-but-empty category with count 0', () => {
    const groups = buildPriceListGroups(products, categories, ['c3'], PRICE_SORT.ASC)
    expect(groups).toHaveLength(1)
    expect(groups[0].count).toBe(0)
    expect(groups[0].products).toEqual([])
  })
  it('returns nothing when no category is selected', () => {
    expect(buildPriceListGroups(products, categories, [], PRICE_SORT.ASC)).toEqual([])
  })
})
