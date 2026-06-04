import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// ---- Mock the data layer + storage so no network/canvas is needed ----------
let productsState
let categoriesState
vi.mock('../hooks/useData', () => ({
  useProducts: () => productsState,
  useCategories: () => categoriesState,
  setProductImage: vi.fn(() => Promise.resolve()),
}))
vi.mock('../lib/storage', () => ({
  uploadProductImage: vi.fn(() => Promise.resolve('https://cdn/x.jpg')),
}))

import BulkImages from './BulkImages'

const CATS = [
  { id: 'c1', name: 'Shokolad', slug: 'shokolad', icon: '🍫' },
  { id: 'c2', name: 'Choy', slug: 'choy', icon: '🍵' },
]
const mk = (id, name, categoryId, image, t) => ({
  id, name, categoryId, image, price: 1000, unit: 'dona',
  createdAt: `2026-01-0${t}T00:00:00Z`, updatedAt: `2026-01-0${t}T00:00:00Z`,
})

describe('BulkImages page', () => {
  beforeEach(() => {
    categoriesState = { data: CATS, loading: false, error: null }
  })

  it('lists only products without an image and shows the running counter', () => {
    productsState = {
      data: [
        mk('p1', 'Snickers', 'c1', null, 1),
        mk('p2', 'Twix', 'c1', 'https://cdn/twix.jpg', 2),
        mk('p3', 'Lipton', 'c2', null, 3),
      ],
      loading: false,
      error: null,
    }
    render(<BulkImages />)
    expect(screen.getByText('Snickers')).toBeInTheDocument()
    expect(screen.getByText('Lipton')).toBeInTheDocument()
    expect(screen.queryByText('Twix')).toBeNull() // already has an image
    // Counter: 0 done / 2 to do
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText(/\/ 2 mahsulotga rasm qo'shildi/)).toBeInTheDocument()
  })

  it('shows the celebration empty state when every product has an image', () => {
    productsState = {
      data: [mk('p2', 'Twix', 'c1', 'https://cdn/twix.jpg', 2)],
      loading: false,
      error: null,
    }
    render(<BulkImages />)
    expect(screen.getByText('Barcha mahsulotlarda rasm bor')).toBeInTheDocument()
  })

  it('shows the loading state while data is undefined', () => {
    productsState = { data: undefined, loading: true, error: null }
    categoriesState = { data: undefined, loading: true, error: null }
    render(<BulkImages />)
    expect(screen.getByText('Mahsulotlar yuklanmoqda…')).toBeInTheDocument()
  })

  it('shows the error state with a retry when a query fails', () => {
    productsState = { data: undefined, loading: false, error: new Error('boom'), refetch: vi.fn() }
    categoriesState = { data: CATS, loading: false, error: null }
    render(<BulkImages />)
    expect(screen.getByText("Ma'lumotlarni yuklab bo'lmadi")).toBeInTheDocument()
    expect(screen.getByText('🔄 Qayta urinish')).toBeInTheDocument()
  })
})
