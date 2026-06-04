import { describe, it, expect } from 'vitest'
import { selectBulkRows } from './bulkImages'

const mk = (id, image) => ({ id, image })

describe('selectBulkRows', () => {
  const products = [
    mk('p1', null),
    mk('p2', 'https://cdn/twix.jpg'), // already has an image
    mk('p3', null),
  ]

  it('shows only imageless products and counts none done initially', () => {
    const { rows, completed, total } = selectBulkRows(products, {})
    expect(rows.map((p) => p.id)).toEqual(['p1', 'p3'])
    expect(completed).toBe(0)
    expect(total).toBe(2)
  })

  it('keeps a just-completed product visible and counts it done', () => {
    const { rows, completed, total } = selectBulkRows(products, { p1: 'https://cdn/new.jpg' })
    expect(rows.map((p) => p.id)).toEqual(['p1', 'p3']) // p1 stays; p2 (pre-existing img) excluded
    expect(completed).toBe(1)
    expect(total).toBe(2)
  })

  it('still counts done even after the live row flips its image on', () => {
    const flipped = [mk('p1', 'https://cdn/new.jpg'), mk('p3', null)]
    const { rows, completed } = selectBulkRows(flipped, { p1: 'https://cdn/new.jpg' })
    expect(rows.map((p) => p.id)).toEqual(['p1', 'p3'])
    expect(completed).toBe(1)
  })

  it('is safe with default args', () => {
    expect(selectBulkRows()).toEqual({ rows: [], completed: 0, total: 0 })
  })
})
