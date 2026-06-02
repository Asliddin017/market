import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUsers, updateUserRole, getUserCart } from '../hooks/useData'
import { useAuthStore } from '../store/authStore'
import { useThemeKey } from '../hooks/useThemeKey'
import { ROLES, ROLE_META } from '../lib/roles'
import { cartTotals } from '../store/cartStore'
import { formatSom, formatDateTime } from '../lib/utils'

const ROLE_OPTIONS = [ROLES.CLIENT, ROLES.SELLER, ROLES.ADMIN]

const roleBadge = {
  [ROLES.ADMIN]: 'bg-rose-500/20 text-rose-200',
  [ROLES.SELLER]: 'bg-brand-500/20 text-brand-200',
  [ROLES.CLIENT]: 'bg-gold-500/20 text-gold-400',
}

function UserRow({ user, isSelf }) {
  const [open, setOpen] = useState(false)
  const [cart, setCart] = useState(null)
  const [loadingCart, setLoadingCart] = useState(false)
  const meta = ROLE_META[user.role]

  async function toggleCart() {
    const next = !open
    setOpen(next)
    if (next && cart === null) {
      setLoadingCart(true)
      const row = await getUserCart(user.id)
      setCart(row?.items ?? [])
      setLoadingCart(false)
    }
  }

  const totals = cartTotals(cart ?? [])

  return (
    <motion.div layout className="glass rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-lg">
          {meta?.icon ?? '👤'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{user.username}</span>
            {isSelf && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">siz</span>}
          </div>
          <p className="text-xs text-slate-400">Ro'yxatdan o'tgan: {formatDateTime(user.createdAt)}</p>
        </div>

        <span className={`hidden rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline ${roleBadge[user.role]}`}>
          {meta?.label ?? user.role}
        </span>

        {/* Role change */}
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Rol:
          <select
            value={user.role}
            disabled={isSelf}
            onChange={(e) => updateUserRole(user.id, e.target.value)}
            title={isSelf ? "O'z rolingizni o'zgartira olmaysiz" : 'Rolni o\'zgartirish'}
            className="rounded-lg border border-white/10 bg-ink-900/60 px-2 py-1.5 text-xs text-slate-100 disabled:opacity-40"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{ROLE_META[r].label}</option>
            ))}
          </select>
        </label>

        {user.role === ROLES.CLIENT && (
          <button onClick={toggleCart} className="btn-ghost px-3 py-1.5 text-xs">
            🛒 Savatcha {open ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Client cart viewer */}
      <AnimatePresence>
        {open && user.role === ROLES.CLIENT && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden border-t border-white/10 pt-3"
          >
            {loadingCart ? (
              <p className="text-sm text-slate-400">Yuklanmoqda…</p>
            ) : !cart || cart.length === 0 ? (
              <p className="text-sm text-slate-400">Savatcha bo'sh.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                    <span className="truncate">{i.name}</span>
                    <span className="shrink-0 text-slate-300">
                      {i.qty} × {formatSom(i.price)} ={' '}
                      <span className="font-semibold text-brand-300">{formatSom(i.qty * i.price)}</span>
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm">
                  <span className="font-semibold">Jami ({totals.count} ta)</span>
                  <span className="text-lg font-extrabold text-brand-300">{formatSom(totals.total)}</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Users() {
  const usersQuery = useUsers()
  const users = usersQuery.data ?? []
  const loading = usersQuery.loading
  const error = usersQuery.error
  const me = useAuthStore((s) => s.user)
  useThemeKey('default')

  const counts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Foydalanuvchilar</h1>
        <p className="text-sm text-slate-400">
          {users.length} ta hisob · 🛡️ {counts[ROLES.ADMIN] ?? 0} admin · 🧑‍💼 {counts[ROLES.SELLER] ?? 0} sotuvchi · 🛒 {counts[ROLES.CLIENT] ?? 0} mijoz
        </p>
      </div>

      {error ? (
        <div className="glass flex flex-col items-center justify-center rounded-3xl py-20 text-center">
          <span className="text-5xl">⚠️</span>
          <p className="mt-3 text-lg font-semibold">Ma'lumotlarni yuklab bo'lmadi</p>
          <p className="text-sm text-slate-400">Sahifani qayta yuklab ko'ring.</p>
        </div>
      ) : loading ? (
        <div className="glass flex flex-col items-center justify-center rounded-3xl py-20 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-400" />
          <p className="mt-3 text-sm text-slate-400">Foydalanuvchilar yuklanmoqda…</p>
        </div>
      ) : users.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-3xl py-20 text-center">
          <span className="text-5xl">👥</span>
          <p className="mt-3 text-lg font-semibold">Hech narsa topilmadi</p>
          <p className="text-sm text-slate-400">Hozircha foydalanuvchilar yo'q.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <UserRow key={u.id} user={u} isSelf={me?.id === u.id} />
          ))}
        </div>
      )}
    </div>
  )
}
