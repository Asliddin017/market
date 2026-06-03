import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useOrders } from '../hooks/useData'
import { useAuthStore } from '../store/authStore'
import { can } from '../lib/roles'
import { formatSom, formatDateTime } from '../lib/utils'
import { ORDER_STATUS, ORDER_STATUS_META, orderTotal, splitAvailability } from '../lib/orders'
import OrderStatusBadge from '../components/OrderStatusBadge'
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncStates'

const EMPTY = []

export default function Orders() {
  const role = useAuthStore((s) => s.role)
  const isStaff = can(role, 'manageOrders')

  const ordersQuery = useOrders()
  const orders = ordersQuery.data ?? EMPTY
  const { loading, error, refetch } = ordersQuery

  const [filter, setFilter] = useState('all') // 'all' | status

  const shown = useMemo(() => {
    if (filter === 'all') return orders
    return orders.filter((o) => o.status === filter)
  }, [orders, filter])

  const heading = isStaff ? 'Buyurtmalar' : 'Buyurtmalarim'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">🧾 {heading}</h1>
          <p className="text-sm text-slate-400">
            {orders.length} ta buyurtma
            {isStaff && ' · barcha mijozlar'}
          </p>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`chip ${filter === 'all' ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/5 text-slate-300'}`}
        >
          🌐 Barchasi
        </button>
        {Object.entries(ORDER_STATUS_META).map(([value, meta]) => (
          <button
            key={value}
            onClick={() => setFilter(filter === value ? 'all' : value)}
            className={`chip ${filter === value ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
          >
            {meta.icon} {meta.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState onRetry={refetch} message="Buyurtmalarni yuklab bo'lmadi" />
      ) : loading ? (
        <LoadingState label="Buyurtmalar yuklanmoqda…" />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="🧾"
          title={orders.length === 0 ? 'Hozircha buyurtma yo‘q' : 'Bu holatda buyurtma yo‘q'}
          hint={
            isStaff
              ? 'Yangi buyurtmalar bu yerda jonli paydo bo‘ladi.'
              : 'Savatchadan buyurtma bering — u shu yerda ko‘rinadi.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {shown.map((o) => {
              const items = o.items ?? []
              const { available, unavailable } = splitAvailability(items)
              const total = items.length ? orderTotal(items) : o.total
              return (
                <motion.div
                  key={o.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <Link
                    to={`/orders/${o.id}`}
                    className="glass block rounded-2xl p-4 transition hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <OrderStatusBadge status={o.status} />
                      <span className="text-[11px] text-slate-500">
                        №{String(o.id).slice(0, 8).toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-3 flex items-end justify-between">
                      <div className="min-w-0">
                        {isStaff && o.clientName && (
                          <p className="truncate text-sm font-semibold">👤 {o.clientName}</p>
                        )}
                        <p className="text-xs text-slate-400">
                          {available.length} ta mahsulot
                          {unavailable.length > 0 && (
                            <span className="text-rose-300"> · {unavailable.length} yo‘q</span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500">{formatDateTime(o.createdAt)}</p>
                      </div>
                      <p className="shrink-0 text-lg font-extrabold text-brand-300 tabular-nums">
                        {formatSom(total)}
                      </p>
                    </div>

                    {o.status === ORDER_STATUS.READY && !isStaff && (
                      <p className="mt-2 text-xs font-semibold text-brand-300">✅ Tayyor — chekni ko‘ring</p>
                    )}
                  </Link>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
