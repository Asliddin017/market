import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { useCartStore, selectCount } from '../store/cartStore'
import { ROLE_META, can } from '../lib/roles'

export default function Navbar() {
  const role = useAuthStore((s) => s.role)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const cartCount = useCartStore(selectCount)
  const navigate = useNavigate()
  const meta = ROLE_META[role]

  const links = [
    { to: '/', label: 'Bosh sahifa', icon: '🏠', show: true },
    { to: '/products', label: 'Mahsulotlar', icon: '📦', show: true },
    { to: '/categories', label: 'Kategoriyalar', icon: '🏷️', show: true },
    {
      to: '/orders',
      label: can(role, 'manageOrders') ? 'Buyurtmalar' : 'Buyurtmalarim',
      icon: '🧾',
      show: can(role, 'viewOrders'),
    },
    { to: '/statistika', label: 'Statistika', icon: '📊', show: can(role, 'viewStats') },
    { to: '/users', label: 'Foydalanuvchilar', icon: '👥', show: can(role, 'manageUsers') },
    { to: '/contact', label: 'Aloqa', icon: '📞', show: true },
    { to: '/cart', label: 'Savatcha', icon: '🛒', show: can(role, 'useCart') },
  ].filter((l) => l.show)

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2">
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
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `relative rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'text-brand-200' : 'text-slate-300 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <span className="relative flex items-center gap-1.5">
                  <span>{l.icon}</span>
                  {l.label}
                  {l.to === '/cart' && cartCount > 0 && (
                    <span className="ml-1 rounded-full bg-gold-500 px-1.5 text-[10px] font-bold text-ink-950">
                      {cartCount}
                    </span>
                  )}
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

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs font-semibold text-slate-200 sm:flex">
            <span>{meta?.icon}</span>
            <span className="max-w-[8rem] truncate">{user?.username}</span>
            <span className="text-slate-400">· {meta?.label}</span>
          </span>
          <button onClick={handleLogout} className="btn-ghost px-3 py-2 text-xs">
            Chiqish
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center justify-around border-t border-white/10 px-2 py-1.5 md:hidden">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex flex-col items-center rounded-lg px-3 py-1 text-[11px] font-medium transition ${
                isActive ? 'text-brand-300' : 'text-slate-400'
              }`
            }
          >
            <span className="relative text-lg">
              {l.icon}
              {l.to === '/cart' && cartCount > 0 && (
                <span className="absolute -right-2 -top-1 rounded-full bg-gold-500 px-1 text-[9px] font-bold text-ink-950">
                  {cartCount}
                </span>
              )}
            </span>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
