import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useUsers,
  updateUserRole,
  getUserCart,
  useLoginEvents,
  setUserActive,
  cleanupInactiveUsers,
} from '../hooks/useData'
import { toTime, formatDuration } from '../lib/utils'

const ONLINE_MS = 2 * 60_000 // heartbeat is every minute
import { deviceLabel } from '../lib/device'
import { useAuthStore } from '../store/authStore'
import { useThemeKey } from '../hooks/useThemeKey'
import { ROLES, ROLE_META } from '../lib/roles'
import { cartTotals, cartLineTotal } from '../store/cartStore'
import { unitPrice, displayUnit } from '../lib/pricing'
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncStates'
import { formatSom, formatDateTime } from '../lib/utils'

const ROLE_OPTIONS = [ROLES.CLIENT, ROLES.SELLER, ROLES.ADMIN]

const roleBadge = {
  [ROLES.ADMIN]: 'bg-rose-500/20 text-rose-200',
  [ROLES.SELLER]: 'bg-brand-500/20 text-brand-200',
  [ROLES.CLIENT]: 'bg-gold-500/20 text-gold-400',
}

const KIND_LABEL = { login: '🔑 Kirdi', visit: '👁️ Ochdi' }
const EMPTY = []

/** One login-log line: time · kind · device. */
function LogLine({ ev, showUser = false, now = 0 }) {
  const online = now > 0 && now - toTime(ev.lastActiveAt) < ONLINE_MS
  const dur = formatDuration(toTime(ev.lastActiveAt) - toTime(ev.createdAt))
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs">
      <span className="tabular-nums text-slate-300">{formatDateTime(ev.createdAt)}</span>
      {showUser && <span className="font-semibold text-slate-100">{ev.username ?? '—'}</span>}
      <span className={ev.kind === 'login' ? 'text-brand-300' : 'text-slate-400'}>
        {KIND_LABEL[ev.kind] ?? ev.kind}
      </span>
      <span className="text-slate-300" title={ev.userAgent ?? ''}>{deviceLabel(ev)}</span>
      {ev.ip && <span className="font-mono text-slate-400" title="IP manzil">🌐 {ev.ip}</span>}
      {online ? (
        <span className="text-emerald-300" title="Hozir tizimda">🟢 onlayn · {dur}</span>
      ) : (
        <span className="text-slate-400" title="Tizimda bo'lgan vaqti">⏱ {dur}</span>
      )}
      {ev.screen && <span className="text-slate-500">{ev.screen}</span>}
      {ev.language && <span className="text-slate-500">{ev.language}</span>}
    </div>
  )
}

function UserRow({ user, isSelf, events = EMPTY, onFlash, now = 0 }) {
  const [open, setOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const lastEvent = events[0] ?? null
  const [busyActive, setBusyActive] = useState(false)

  async function toggleActive() {
    setBusyActive(true)
    try {
      await setUserActive(user.id, !user.isActive)
      onFlash?.(
        user.isActive
          ? `"${user.username}" faolsizlantirildi — 30 kun kirmasa o'chiriladi.`
          : `"${user.username}" qayta faollashtirildi.`,
      )
    } catch (err) {
      console.error('[users] status change failed:', err)
      onFlash?.("Statusni o'zgartirib bo'lmadi.")
    } finally {
      setBusyActive(false)
    }
  }
  const [cart, setCart] = useState(null)
  const [loadingCart, setLoadingCart] = useState(false)
  const [cartError, setCartError] = useState(false)
  // Optimistic role so the <select> reflects the change immediately (and reverts
  // if the update fails). The override is remembered together with the server
  // value it replaced, so a fresh server value wins automatically.
  const [pending, setPending] = useState(null) // { base, value } | null
  const role = pending && pending.base === user.role ? pending.value : user.role
  const meta = ROLE_META[role]

  async function changeRole(next) {
    setPending({ base: user.role, value: next }) // optimistic
    try {
      await updateUserRole(user.id, next)
    } catch (err) {
      console.error('[users] role update failed:', err)
      setPending(null) // revert on failure
    }
  }

  async function toggleCart() {
    const next = !open
    setOpen(next)
    if (next && cart === null) {
      setLoadingCart(true)
      setCartError(false)
      try {
        const row = await getUserCart(user.id)
        setCart(row?.items ?? [])
      } catch (err) {
        console.error('[users] cart load failed:', err)
        setCartError(true)
        setCart([])
      } finally {
        setLoadingCart(false)
      }
    }
  }

  const totals = cartTotals(cart ?? [])

  return (
    <motion.div layout className={`glass rounded-2xl p-4 ${user.isActive ? '' : 'opacity-70 ring-1 ring-rose-400/40'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-lg">
          {meta?.icon ?? '👤'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{user.username}</span>
            {isSelf && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">siz</span>}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                user.isActive ? 'bg-brand-500/15 text-brand-300' : 'bg-rose-500/15 text-rose-300'
              }`}
            >
              {user.isActive ? '● Faol' : '○ Faolsiz'}
            </span>
          </div>
          <p className="text-xs text-slate-400">Ro'yxatdan o'tgan: {formatDateTime(user.createdAt)}</p>
          <p className="text-xs text-slate-400">
            {lastEvent
              ? `Oxirgi faollik: ${formatDateTime(lastEvent.createdAt)} · ${deviceLabel(lastEvent)}`
              : 'Oxirgi faollik: hali yozilmagan'}
          </p>
        </div>

        <span className={`hidden rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline ${roleBadge[role]}`}>
          {meta?.label ?? role}
        </span>

        {/* Role change */}
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Rol:
          <select
            value={role}
            disabled={isSelf}
            onChange={(e) => changeRole(e.target.value)}
            title={isSelf ? "O'z rolingizni o'zgartira olmaysiz" : 'Rolni o\'zgartirish'}
            className="rounded-lg border border-white/10 bg-ink-900/60 px-2 py-1.5 text-xs text-slate-100 disabled:opacity-40"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{ROLE_META[r].label}</option>
            ))}
          </select>
        </label>

        {role === ROLES.CLIENT && (
          <button onClick={toggleCart} className="btn-ghost px-3 py-1.5 text-xs">
            🛒 Savatcha {open ? '▲' : '▼'}
          </button>
        )}
        <button onClick={() => setLogOpen((v) => !v)} className="btn-ghost px-3 py-1.5 text-xs">
          🕒 Loglar ({events.length}) {logOpen ? '▲' : '▼'}
        </button>
        {!isSelf && (
          <button
            onClick={toggleActive}
            disabled={busyActive}
            className={`${user.isActive ? 'btn-danger' : 'btn-primary'} px-3 py-1.5 text-xs`}
            title={user.isActive ? 'Hisobni faolsizlantirish (kira olmaydi)' : 'Hisobni qayta faollashtirish'}
          >
            {user.isActive ? '⛔ Faolsizlantirish' : '✅ Faollashtirish'}
          </button>
        )}
      </div>

      {/* Per-user login log */}
      <AnimatePresence>
        {logOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden border-t border-white/10 pt-3"
          >
            {events.length === 0 ? (
              <p className="text-sm text-slate-400">Bu foydalanuvchi uchun kirish yozuvi yo'q.</p>
            ) : (
              <div className="max-h-64 space-y-1.5 overflow-auto">
                {events.map((ev) => (
                  <LogLine key={ev.id} ev={ev} now={now} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client cart viewer */}
      <AnimatePresence>
        {open && role === ROLES.CLIENT && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden border-t border-white/10 pt-3"
          >
            {loadingCart ? (
              <p className="text-sm text-slate-400">Yuklanmoqda…</p>
            ) : cartError ? (
              <p className="text-sm text-rose-300">Savatchani yuklab bo'lmadi.</p>
            ) : !cart || cart.length === 0 ? (
              <p className="text-sm text-slate-400">Savatcha bo'sh.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                    <span className="truncate">{i.name}</span>
                    <span className="shrink-0 text-slate-300">
                      {i.qty} {displayUnit(i)} × {formatSom(unitPrice(i))} ={' '}
                      <span className="font-semibold text-brand-300">{formatSom(cartLineTotal(i))}</span>
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
  const retry = () => usersQuery.refetch?.()
  const me = useAuthStore((s) => s.user)
  useThemeKey('default')

  // Login log (admin-only table; RLS). Grouped per user for the rows below and
  // shown as one recent list at the bottom.
  const logQuery = useLoginEvents(300)
  const events = logQuery.data ?? EMPTY
  const eventsByUser = useMemo(() => {
    const m = new Map()
    for (const ev of events) {
      if (!m.has(ev.userId)) m.set(ev.userId, [])
      m.get(ev.userId).push(ev)
    }
    return m
  }, [events])
  const [logFilter, setLogFilter] = useState('all') // 'all' | 'login' | 'visit'

  // Order: admins first, then whoever was seen most recently (last_seen_at
  // from the DB, else the newest log row), newest registration as tie-break.
  const lastSeenOf = (u) =>
    Math.max(toTime(u.lastSeenAt), toTime(eventsByUser.get(u.id)?.[0]?.createdAt))
  const sortedUsers = useMemo(
    () =>
      users.slice().sort((a, b) => {
        const adminA = a.role === ROLES.ADMIN ? 1 : 0
        const adminB = b.role === ROLES.ADMIN ? 1 : 0
        if (adminA !== adminB) return adminB - adminA
        const seen = lastSeenOf(b) - lastSeenOf(a)
        if (seen !== 0) return seen
        return toTime(b.createdAt) - toTime(a.createdAt)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users, eventsByUser],
  )

  // "Now" for the online badge, refreshed once a minute (state, not Date.now()
  // in render, so rendering stays pure).
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const [flash, setFlash] = useState('')
  function showFlash(msg) {
    setFlash(msg)
    setTimeout(() => setFlash(''), 4000)
  }

  // Housekeeping: deactivated accounts unseen for 30 days are deleted when an
  // admin opens this page (pg_cron also runs it nightly when available).
  useEffect(() => {
    cleanupInactiveUsers(30)
      .then((n) => {
        if (n > 0) showFlash(`${n} ta faolsiz (30 kun kirmagan) hisob o'chirildi.`)
      })
      .catch((err) => console.error('[users] cleanup failed:', err))
  }, [])
  const recent = useMemo(
    () => (logFilter === 'all' ? events : events.filter((e) => e.kind === logFilter)).slice(0, 100),
    [events, logFilter],
  )

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
          {users.some((u) => !u.isActive) && ` · ○ ${users.filter((u) => !u.isActive).length} faolsiz`}
        </p>
      </div>

      {flash && (
        <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300">ℹ️ {flash}</p>
      )}

      {error ? (
        <ErrorState onRetry={retry} />
      ) : loading ? (
        <LoadingState label="Foydalanuvchilar yuklanmoqda…" />
      ) : users.length === 0 ? (
        <EmptyState icon="👥" title="Hech narsa topilmadi" hint="Hozircha foydalanuvchilar yo'q." />
      ) : (
        <div className="space-y-3">
          {sortedUsers.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              isSelf={me?.id === u.id}
              events={eventsByUser.get(u.id) ?? EMPTY}
              onFlash={showFlash}
              now={now}
            />
          ))}
        </div>
      )}

      {/* Recent login log across all users */}
      <section className="glass rounded-2xl p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold">🕒 Kirish tarixi</h2>
            <p className="text-xs text-slate-400">
              Kim, qachon, qaysi qurilma, brauzer va IP manzildan kirgan (so'nggi {recent.length} ta).
            </p>
          </div>
          <div className="flex gap-1.5">
            {[
              ['all', 'Barchasi'],
              ['login', '🔑 Kirganlar'],
              ['visit', '👁️ Ochganlar'],
            ].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setLogFilter(v)}
                className={`chip ${logFilter === v ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/5 text-slate-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {logQuery.error ? (
          <p className="text-sm text-rose-300">
            Loglarni yuklab bo'lmadi. `supabase/login_events.sql` ishga tushirilganini tekshiring.
          </p>
        ) : logQuery.loading ? (
          <p className="text-sm text-slate-400">Yuklanmoqda…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-slate-400">Hozircha yozuv yo'q — foydalanuvchilar kirgach paydo bo'ladi.</p>
        ) : (
          <div className="space-y-1.5">
            {recent.map((ev) => (
              <LogLine key={ev.id} ev={ev} showUser now={now} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
