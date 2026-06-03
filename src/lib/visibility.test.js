import { describe, it, expect } from 'vitest'
import {
  isStaff,
  isCategoryHiddenForClient,
  hiddenCategoryIds,
  visibleCategories,
  visibleProducts,
} from './visibility'
import { ROLES } from './roles'

const cats = [
  { id: 'c-drinks', name: 'Ichimliklar — Banka', hiddenForClients: false },
  { id: 'c-cig', name: 'Sigaretlar', hiddenForClients: true },
  { id: 'c-cheese', name: 'Pishloq', hiddenForClients: false },
]
const products = [
  { id: 'p1', name: 'Cola', categoryId: 'c-drinks' },
  { id: 'p2', name: 'Marlboro', categoryId: 'c-cig' },
  { id: 'p3', name: 'Pampers', categoryId: 'c-cheese' },
]

describe('isStaff', () => {
  it('is true for admin/seller, false for client', () => {
    expect(isStaff(ROLES.ADMIN)).toBe(true)
    expect(isStaff(ROLES.SELLER)).toBe(true)
    expect(isStaff(ROLES.CLIENT)).toBe(false)
    expect(isStaff(undefined)).toBe(false)
  })
})

describe('isCategoryHiddenForClient / hiddenCategoryIds', () => {
  it('detects the hidden flag', () => {
    expect(isCategoryHiddenForClient(cats[1])).toBe(true)
    expect(isCategoryHiddenForClient(cats[0])).toBe(false)
  })
  it('collects hidden ids', () => {
    expect(hiddenCategoryIds(cats)).toEqual(new Set(['c-cig']))
  })
})

describe('visibleCategories', () => {
  it('hides cigarettes from clients', () => {
    const out = visibleCategories(cats, ROLES.CLIENT)
    expect(out.map((c) => c.id)).toEqual(['c-drinks', 'c-cheese'])
  })
  it('shows everything to staff', () => {
    expect(visibleCategories(cats, ROLES.ADMIN)).toHaveLength(3)
    expect(visibleCategories(cats, ROLES.SELLER)).toHaveLength(3)
  })
})

describe('visibleProducts', () => {
  it('drops products in hidden categories for clients', () => {
    const out = visibleProducts(products, cats, ROLES.CLIENT)
    expect(out.map((p) => p.id)).toEqual(['p1', 'p3'])
    expect(out.find((p) => p.name === 'Marlboro')).toBeUndefined()
  })
  it('keeps all products for staff', () => {
    expect(visibleProducts(products, cats, ROLES.ADMIN)).toHaveLength(3)
  })
  it('is a no-op when nothing is hidden', () => {
    const visible = cats.map((c) => ({ ...c, hiddenForClients: false }))
    expect(visibleProducts(products, visible, ROLES.CLIENT)).toHaveLength(3)
  })
})
