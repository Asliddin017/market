import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useCartStore } from './store/cartStore'
import { can } from './lib/roles'
import { isSupabaseConfigured } from './lib/supabase'
import Layout from './components/Layout'
import CategoryBackground from './components/CategoryBackground'
import Login from './pages/Login'
import Home from './pages/Home'
import Products from './pages/Products'
import Categories from './pages/Categories'
import CartPage from './pages/CartPage'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Users from './pages/Users'

export default function App() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const ready = useAuthStore((s) => s.ready)
  const bootstrap = useAuthStore((s) => s.bootstrap)

  // Resolve the Supabase session once, before rendering routes.
  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  // Load the logged-in client's saved cart (clients only; clear otherwise).
  useEffect(() => {
    if (!ready) return
    useCartStore.getState().loadForUser(can(role, 'useCart') ? user?.id ?? null : null)
  }, [ready, user?.id, role])

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

      {!user ? (
        // Not logged in -> login / registration screen only.
        <Login />
      ) : (
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route
              path="/cart"
              element={can(role, 'useCart') ? <CartPage /> : <Forbidden />}
            />
            <Route
              path="/orders"
              element={can(role, 'viewOrders') ? <Orders /> : <Forbidden />}
            />
            <Route
              path="/orders/:id"
              element={can(role, 'viewOrders') ? <OrderDetail /> : <Forbidden />}
            />
            <Route
              path="/users"
              element={can(role, 'manageUsers') ? <Users /> : <Forbidden />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      )}
    </>
  )
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
