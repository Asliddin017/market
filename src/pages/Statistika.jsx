import { motion } from 'framer-motion'
import { useStats } from '../hooks/useData'
import { formatSom } from '../lib/utils'
import MiniBarChart from '../components/MiniBarChart'
import { LoadingState, ErrorState } from '../components/AsyncStates'

// Read a stat value (json keys are snake_case) as a number.
const n = (v) => Number(v) || 0

function StatCard({ icon, label, value, accent = 'text-brand-300', sub }) {
  return (
    <div className="glass rounded-2xl p-5 shadow-card">
      <div className="mb-2 text-2xl">{icon}</div>
      <div className={`font-display text-2xl font-extrabold tabular-nums sm:text-3xl ${accent}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      {sub != null && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

function RankList({ title, rows, emptyText }) {
  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyText}</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.productId ?? r.categoryId ?? i} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-slate-300">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
              <span className="shrink-0 text-xs text-slate-400">{r.qtySold} dona</span>
              <span className="shrink-0 w-28 text-right font-semibold tabular-nums text-brand-300">
                {formatSom(r.revenue)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default function Statistika() {
  const { data, loading, error, refetch } = useStats({ days: 30, topN: 5 })

  if (loading) return <LoadingState label="Statistika hisoblanmoqda…" />
  if (error) return <ErrorState onRetry={refetch} message="Statistikani yuklab bo'lmadi" />

  const stats = data?.stats ?? {}
  const daily = data?.daily ?? []
  const products = data?.products ?? []
  const categories = data?.categories ?? []
  const noSales = n(stats.orders_total) === 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">📊 Statistika</h1>
        <p className="text-sm text-slate-400">
          Faqat yakunlangan (tayyor) buyurtmalar bo'yicha hisoblanadi
        </p>
      </div>

      {noSales && (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          Hali yakunlangan buyurtmalar yo'q — sotuvlar boshlangach, bu yerda daromad va
          eng ko'p sotilganlar ko'rinadi.
        </p>
      )}

      {/* Revenue */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="💰" label="Bugun" value={formatSom(stats.revenue_today)} sub={`${n(stats.orders_today)} ta buyurtma`} />
        <StatCard icon="📆" label="Shu hafta" value={formatSom(stats.revenue_week)} accent="text-gold-400" />
        <StatCard icon="🗓️" label="Shu oy" value={formatSom(stats.revenue_month)} sub={`${n(stats.orders_month)} ta buyurtma`} />
        <StatCard icon="🏆" label="Jami daromad" value={formatSom(stats.revenue_total)} accent="text-gold-400" sub={`${n(stats.orders_total)} ta buyurtma`} />
      </section>

      {/* 30-day revenue chart */}
      {!noSales && daily.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5"
        >
          <h2 className="mb-3 font-display text-lg font-bold">So'nggi 30 kun daromadi</h2>
          <MiniBarChart data={daily} height={170} />
          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span>{daily[0]?.day}</span>
            <span>{daily[daily.length - 1]?.day}</span>
          </div>
        </motion.section>
      )}

      {/* Top products + categories */}
      <div className="grid gap-5 lg:grid-cols-2">
        <RankList title="🔥 Eng ko'p sotilgan mahsulotlar" rows={products} emptyText="Hali sotuv yo'q." />
        <RankList title="🏷️ Eng daromadli kategoriyalar" rows={categories} emptyText="Hali sotuv yo'q." />
      </div>
    </div>
  )
}
