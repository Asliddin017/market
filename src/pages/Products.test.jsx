import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// ---- Mock the data layer so we control loading/empty/data states ----------
let productsState
let categoriesState
vi.mock('../hooks/useData', () => ({
  useProducts: () => productsState,
  useCategories: () => categoriesState,
  deleteProduct: vi.fn(() => Promise.resolve()),
}))

import Products from './Products'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'

const CATS = [{ id: 'c1', name: 'Energetik', slug: 'energetik-ichimliklar', icon: '⚡' }]
const PRODS = [
  { id: 'p1', name: 'Red Bull', categoryId: 'c1', price: 18000, unit: 'dona', image: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'p2', name: 'Adrenalin', categoryId: 'c1', price: 16000, unit: 'dona', image: null, createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' },
]

function setRole(role) {
  useAuthStore.setState({ user: { id: 'u1', username: 'tester', role }, role })
}

beforeEach(() => {
  productsState = { data: PRODS, loading: false, error: null }
  categoriesState = { data: CATS, loading: false, error: null }
  useCartStore.setState({ clientId: null, items: [], updatedAt: null, loaded: false })
  setRole('admin')
})

describe('Products page states', () => {
  it('shows a loading state before data arrives', () => {
    productsState = { data: undefined, loading: true, error: null }
    categoriesState = { data: undefined, loading: true, error: null }
    render(<Products />)
    expect(screen.getByText(/yuklanmoqda/i)).toBeInTheDocument()
  })

  it('renders products once loaded', () => {
    render(<Products />)
    expect(screen.getByText('Red Bull')).toBeInTheDocument()
    expect(screen.getByText('Adrenalin')).toBeInTheDocument()
  })

  it('shows an empty state when there are no products', () => {
    productsState = { data: [], loading: false, error: null }
    render(<Products />)
    expect(screen.getByText(/Hech narsa topilmadi/i)).toBeInTheDocument()
  })

  it('shows an error state when the query fails', () => {
    productsState = { data: undefined, loading: false, error: new Error('boom') }
    render(<Products />)
    expect(screen.getByText(/yuklab bo'lmadi/i)).toBeInTheDocument()
  })
})

describe('Products page role gating', () => {
  it('admin sees manage + delete controls, no add-to-cart', () => {
    setRole('admin')
    render(<Products />)
    expect(screen.getByText(/Yangi mahsulot/i)).toBeInTheDocument()
    expect(screen.getAllByText('🗑️').length).toBeGreaterThan(0)
    expect(screen.queryByText(/Savatga/i)).not.toBeInTheDocument()
  })

  it('seller can manage but cannot delete', () => {
    setRole('seller')
    render(<Products />)
    expect(screen.getByText(/Yangi mahsulot/i)).toBeInTheDocument()
    expect(screen.queryByText('🗑️')).not.toBeInTheDocument()
  })

  it('client gets add-to-cart but no manage/delete controls', () => {
    setRole('client')
    render(<Products />)
    expect(screen.queryByText(/Yangi mahsulot/i)).not.toBeInTheDocument()
    expect(screen.queryByText('🗑️')).not.toBeInTheDocument()
    expect(screen.getAllByText(/Savatga/i).length).toBeGreaterThan(0)
  })
})
