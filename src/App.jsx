import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useCartStore } from './store/cartStore'
import { useUiStore } from './store/uiStore'
import { can } from './lib/roles'
import { isSupabaseConfigured } from './lib/supabase'
import Layout from './components/Layout'
import CategoryBackground from './components/CategoryBackground'
import { LoadingState } from './components/AsyncStates'
import Login from './pages/Login'
import Home from './pages/Home'
import Products from './pages/Products'
import CartPage from './pages/CartPage'
import Orders from './pages/Orders'

// Less-frequent pages load on demand, so the first paint ships only the code
// for the screens everyone opens (login / home / products / cart / orders).
const BulkImages = lazy(() => import('./pages/BulkImages'))
const Categories = lazy(() => import('./pages/Categories'))
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const Users = lazy(() => import('./pages/Users'))
const Contact = lazy(() => import('./pages/Contact'))
const Statistika = lazy(() => import('./pages/Statistika'))

export default function App() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const ready = useAuthStore((s) => s.ready)
  const bootstrap = useAuthStore((s) => s.bootstrap)

  // Resolve the Supabase session once, before rendering routes.
  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  // Colour mode -> <html class="light|dark"> (+ native form controls).
  const mode = useUiStore((s) => s.mode)
  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('light', mode === 'light')
    el.classList.toggle('dark', mode !== 'light')
    el.style.colorScheme = mode === 'light' ? 'light' : 'dark'
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', mode === 'light' ? '#f4f7f5' : '#022c22')
  }, [mode])

  // Cart: a guest keeps a local (browser) cart; a client loads their saved
  // cart (merging the guest one on login); staff have no cart.
  const userId = user?.id ?? null
  useEffect(() => {
    if (!ready) return
    const cart = useCartStore.getState()
    if (!userId) cart.loadForUser(null, { guest: true })
    else cart.loadForUser(can(role, 'useCart') ? userId : null)
  }, [ready, userId, role])

  if (!isSupabaseConfigured) {
    return (
      <>
        <CategoryBackground />
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="glass-strong max-w-lg rounded-3xl p-8 text-center">
            <span className="text-5xl">🔌</span>
            <h1 className="mt-4 font-display text-2xl font-extrabold">Supabase sozlanmagan</h1>
            <p className="mt-2 text-sm text-slate-400">
              <code className="text-brand-300">VITE_SUPABASE_URL</code> va{' '}
              <code className="text-brand-300">VITE_SUPABASE_ANON_KEY</code> ni{' '}
              <code>.env.local</code> ga qo'shing (README ga qarang), so'ng qayta ishga tushiring.
            </p>
          </div>
        </div>
      </>
    )
  }

  if (!ready) {
    return (
      <>
        <CategoryBackground />
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-400" />
            <p className="text-sm text-slate-400">Yuklanmoqda…</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* App-wide lightweight animated background (CSS only). */}
      <CategoryBackground />

      {/*
        Anyone can browse the storefront (products, categories, contacts)
        without an account — like a marketplace. Signing in is only required
        to place an order (and for staff pages); <Protected> sends a guest to
        /login and brings them back afterwards.
      */}
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            {/* The shop opens on the product list for everyone; the welcome page lives at /home. */}
            <Route path="/" element={<Navigate to="/products" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/contact" element={<Contact />} />
            {/* Guests can fill a cart; the checkout button itself asks them to sign in. */}
            <Route path="/cart" element={can(role, 'useCart') ? <CartPage /> : <Forbidden />} />
            <Route path="/rasm-qoshish" element={<Protected cap="manageProducts"><BulkImages /></Protected>} />
            <Route path="/orders" element={<Protected cap="viewOrders"><Orders /></Protected>} />
            <Route path="/orders/:id" element={<Protected cap="viewOrders"><OrderDetail /></Protected>} />
            <Route path="/users" element={<Protected cap="manageUsers"><Users /></Protected>} />
            <Route path="/statistika" element={<Protected cap="viewStats"><Statistika /></Protected>} />
            <Route path="*" element={<Navigate to="/products" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

/**
 * Signed-in + capability gate. A guest is sent to /login (and returned here
 * afterwards); a signed-in user without the capability sees "Ruxsat yo'q".
 */
function Protected({ cap, children }) {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (cap && !can(role, cap)) return <Forbidden />
  return children
}

function Forbidden() {
  const location = useLocation()
  return (
    <div className="glass flex flex-col items-center justify-center rounded-3xl py-24 text-center">
      <span className="text-5xl">🚫</span>
      <p className="mt-3 text-lg font-semibold">Ruxsat yo'q</p>
      <p className="text-sm text-slate-400">Sizning rolingiz uchun "{location.pathname}" sahifasi mavjud emas.</p>
    </div>
  )
}
