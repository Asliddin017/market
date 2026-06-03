import { describe, it, expect, beforeEach } from 'vitest'
import { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Layout from './Layout'
import { useAuthStore } from '../store/authStore'

// Each stub page records when it mounts, so we can assert that navigation
// actually mounts the destination page (where its data fetch would fire).
const mounts = []
function Page({ name }) {
  useEffect(() => {
    mounts.push(name)
  }, [name])
  return <div>{`page:${name}`}</div>
}

beforeEach(() => {
  mounts.length = 0
  useAuthStore.setState({
    user: { id: 'u1', username: 'admin', role: 'admin' },
    role: 'admin',
    ready: true,
  })
})

function renderApp(initial = '/') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Page name="home" />} />
          <Route path="/products" element={<Page name="products" />} />
          <Route path="/categories" element={<Page name="categories" />} />
          <Route path="/users" element={<Page name="users" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const link = (re) => screen.getAllByRole('link', { name: re })[0]

describe('Layout navigation never leaves a blank body', () => {
  it('renders the destination route content on every tab click', async () => {
    const user = userEvent.setup()
    renderApp('/')
    expect(screen.getByText('page:home')).toBeInTheDocument()

    await user.click(link(/Mahsulotlar/i))
    expect(await screen.findByText('page:products')).toBeInTheDocument()

    await user.click(link(/Kategoriyalar/i))
    expect(await screen.findByText('page:categories')).toBeInTheDocument()

    await user.click(link(/Foydalanuvchilar/i))
    expect(await screen.findByText('page:users')).toBeInTheDocument()

    await user.click(link(/Bosh sahifa/i))
    expect(await screen.findByText('page:home')).toBeInTheDocument()
  })

  it('mounts each destination page on navigation (fetch fires on mount)', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(link(/Kategoriyalar/i))
    await screen.findByText('page:categories')
    await user.click(link(/Mahsulotlar/i))
    await screen.findByText('page:products')

    expect(mounts).toContain('home')
    expect(mounts).toContain('categories')
    expect(mounts).toContain('products')
  })

  it('survives rapid back-and-forth navigation without going blank', async () => {
    const user = userEvent.setup()
    renderApp('/')

    for (let i = 0; i < 6; i++) {
      await user.click(link(/Mahsulotlar/i))
      await screen.findByText('page:products')
      await user.click(link(/Foydalanuvchilar/i))
      await screen.findByText('page:users')
      await user.click(link(/Bosh sahifa/i))
      await screen.findByText('page:home')
    }
    // Body always has the active page; never an empty <main>.
    expect(screen.getByText('page:home')).toBeInTheDocument()
  })
})
