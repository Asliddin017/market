import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { useCartStore, selectCount } from '../store/cartStore'
import { useUiStore } from '../store/uiStore'
import { ROLE_META, can } from '../lib/roles'

// ---------------------------------------------------------------------------
// App navigation.
//   * Desktop: slim top bar with the tabs inline.
//   * Phone:   the tabs live in a FIXED bottom bar (thumb zone, like a native
//              app); the top bar keeps only the brand + account. The bar
//              scrolls sideways when a role has more tabs than fit (admin: 9).
// The top-bar height is exposed as --nav-h so sticky page headers (search)
// can sit right under it.
// ---------------------------------------------------------------------------
export default function Navbar() {
  const role = useAuthStore((s) => s.role)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const cartCount = useCartStore(selectCount)
  const mode = useUiStore((s) => s.mode)
  const toggleMode = useUiStore((s) => s.toggleMode)
  const navigate = useNavigate()
  const meta = ROLE_META[role]

  const links = [
    { to: '/products', label: 'Mahsulotlar', icon: '📦', show: true },
    { to: '/cart', label: 'Savatcha', icon: '🛒', show: can(role, 'useCart') },
    {
      to: '/orders',
      label: can(role, 'manageOrders') ? 'Buyurtmalar' : 'Buyurtmalarim',
      icon: '🧾',
      show: can(role, 'viewOrders'),
    },
    { to: '/categories', label: "Bo'limlar", icon: '🏷️', show: true },
    { to: '/rasm-qoshish', label: 'Rasm', icon: '📸', show: can(role, 'manageProducts') },
    { to: '/statistika', label: 'Statistika', icon: '📊', show: can(role, 'viewStats') },
    { to: '/users', label: 'Foydalanuvchilar', icon: '👥', show: can(role, 'manageUsers') },
    { to: '/home', label: 'Bosh sahifa', icon: '🏠', show: true },
    { to: '/contact', label: 'Aloqa', icon: '📞', show: true },
  ].filter((l) => l.show)

  function handleLogout() {
    logout()
    navigate('/products')
  }

  const Badge = ({ className }) =>
    cartCount > 0 ? (
      <span className={`rounded-full bg-gold-500 px-1.5 text-[10px] font-extrabold leading-4 text-ink-950 ${className}`}>
        {cartCount}
      </span>
    ) : null

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/80 backdrop-blur-md lg:backdrop-blur-xl">
        <div className="mx-auto flex h-[var(--nav-h)] max-w-7xl items-center gap-4 px-4">
          <NavLink to="/products" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-lg shadow-glow">
              🛍️
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-brand-300 to-gold-400 bg-clip-text text-transparent">
                ASL_ZIYO
              </span>
            </span>
          </NavLink>

          {/* Desktop nav */}
          <nav className="no-scrollbar ml-4 hidden min-w-0 items-center gap-1 overflow-x-auto md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `relative shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'text-brand-200' : 'text-slate-300 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <span className="relative flex items-center gap-1.5">
                    <span>{l.icon}</span>
                    {l.label}
                    {l.to === '/cart' && <Badge className="ml-1" />}
                    {isActive && (
                      <motion.span
                        layoutId="navUnderline"
                        className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-brand-400"
                      />
                    )}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleMode}
              className="btn-ghost h-9 w-9 rounded-full px-0 py-0 text-base"
              title={mode === 'light' ? "Qorong'i rejim" : "Yorug' rejim"}
              aria-label={mode === 'light' ? "Qorong'i rejimga o'tish" : "Yorug' rejimga o'tish"}
            >
              {mode === 'light' ? '🌙' : '☀️'}
            </button>
            <span className="flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs font-semibold text-slate-200">
              <span>{meta?.icon}</span>
              <span className="max-w-[7rem] truncate">{user?.username}</span>
              <span className="hidden text-slate-400 sm:inline">· {meta?.label}</span>
            </span>
            <button onClick={handleLogout} className="btn-ghost px-3 py-2 text-xs" title="Chiqish">
              <span className="sm:hidden">⎋</span>
              <span className="hidden sm:inline">Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      {/* Phone: fixed bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Asosiy menyu"
      >
        <div className="no-scrollbar flex w-max min-w-full items-stretch justify-around gap-0.5 overflow-x-auto px-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `relative flex min-w-[4.25rem] shrink-0 flex-col items-center gap-0.5 whitespace-nowrap rounded-xl px-2 pb-1.5 pt-2 text-[10px] font-semibold transition ${
                  isActive ? 'text-brand-300' : 'text-slate-400 active:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`relative flex h-7 w-11 items-center justify-center rounded-full text-lg transition ${
                      isActive ? 'bg-brand-500/20' : ''
                    }`}
                  >
                    {l.icon}
                    {l.to === '/cart' && <Badge className="absolute -right-1 -top-1" />}
                  </span>
                  {l.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
