import { describe, it, expect } from 'vitest'
import { mapProduct, mapCategory, mapProfile } from './useData'

describe('row <-> app mappers (snake_case -> camelCase)', () => {
  it('mapProduct maps every field and defaults image to null', () => {
    const row = {
      id: 'p1',
      name: 'Olma',
      category_id: 'c1',
      price: 12000,
      unit: 'kg',
      image_url: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    }
    expect(mapProduct(row)).toEqual({
      id: 'p1',
      name: 'Olma',
      categoryId: 'c1',
      price: 12000,
      unit: 'kg',
      image: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    })
  })

  it('mapProduct passes through an image_url when present', () => {
    expect(mapProduct({ id: 'p', image_url: 'data:abc' }).image).toBe('data:abc')
  })

  it('mapCategory maps fields and defaults the icon emoji', () => {
    const row = { id: 'c1', name: 'Sut', slug: 'sut', emoji: null, created_at: 't', updated_at: 't2' }
    expect(mapCategory(row)).toEqual({
      id: 'c1',
      name: 'Sut',
      slug: 'sut',
      icon: '📦',
      createdAt: 't',
      updatedAt: 't2',
    })
    expect(mapCategory({ id: 'c2', emoji: '⚡' }).icon).toBe('⚡')
  })

  it('mapProfile maps username/role/createdAt', () => {
    const row = { id: 'u1', username: 'asliddin', role: 'admin', created_at: 't' }
    expect(mapProfile(row)).toEqual({ id: 'u1', username: 'asliddin', role: 'admin', createdAt: 't' })
  })
})
