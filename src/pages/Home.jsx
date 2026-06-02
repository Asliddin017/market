import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProducts, useCategories } from '../hooks/useData'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import { ROLE_META, can } from '../lib/roles'
import ProductCard from '../components/ProductCard'
import { formatSom, toTime } from '../lib/utils'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
}

export default function Home() {
  const products = useProducts() ?? []
  const categories = useCategories() ?? []
  const role = useAuthStore((s) => s.role)
  const addToCart = useCartStore((s) => s.addItem)
  const meta = ROLE_META[role]

  const canAddToCart = can(role, 'useCart')

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  // Price-focused figures (no stock tracking).
  const { avgPrice, minPrice } = useMemo(() => {
    if (!products.length) return { avgPrice: 0, minPrice: 0 }
    const prices = products.map((p) => p.price || 0)
    const sum = prices.reduce((a, b) => a + b, 0)
    return { avgPrice: Math.round(sum / prices.length), minPrice: Math.min(...prices) }
  }, [products])

  // A few highlighted products (newest first).
  const featured = useMemo(
    () => products.slice().sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt)).slice(0, 4),
    [products],
  )

  const stats = [
    { label: 'Mahsulotlar', value: products.length, icon: '📦', accent: 'text-brand-300' },
    { label: 'Kategoriyalar', value: categories.length, icon: '🏷️', accent: 'text-gold-400' },
    { label: "O'rtacha narx", value: formatSom(avgPrice), icon: '💰', accent: 'text-brand-300', small: true },
    { label: 'Eng arzon', value: formatSom(minPrice), icon: '🏷️', accent: 'text-gold-400', small: true },
  ]

  return (
    <div className="space-y-10">
      {/* Hero / welcome */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl glass-strong p-7 sm:p-10"
      >
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-xs font-semibold text-brand-200">
            {meta?.icon} {meta?.label} sifatida kirdingiz
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-5xl">
            Xush kelibsiz <span className="bg-gradient-to-r from-brand-300 to-gold-400 bg-clip-text text-transparent">ASL ZIYO</span> marketiga
          </h1>
          <p className="mt-3 max-w-xl text-balance text-slate-300">
            {canAddToCart
              ? "Mahsulotlarni ko'ring, aqlli qidiruv bilan toping va savatchaga qo'shing."
              : "Do'kon mahsulotlarini boshqaring, kategoriyalarga ajrating va zaxirani kuzating."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/products" className="btn-primary">📦 Mahsulotlar</Link>
            <Link to="/categories" className="btn-ghost">🏷️ Kategoriyalar</Link>
            {canAddToCart && <Link to="/cart" className="btn-gold">🛒 Savatcha</Link>}
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={i}
            whileHover={{ y: -4 }}
            className="glass rounded-2xl p-5 shadow-card"
          >
            <div className="mb-2 text-2xl">{s.icon}</div>
            <div className={`font-display font-extrabold ${s.small ? 'text-lg' : 'text-3xl'} ${s.accent}`}>
              {s.value}
            </div>
            <div className="text-xs uppercase tracking-wide text-slate-400">{s.label}</div>
          </motion.div>
        ))}
      </section>

      {/* Category quick links */}
      <section>
        <h2 className="mb-4 font-display text-xl font-bold">Kategoriyalar bo'yicha ko'rish</h2>
        <div className="flex flex-wrap gap-2.5">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/products"
              className="glass flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition hover:bg-white/10"
            >
              <span className="text-lg">{c.icon}</span> {c.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Yangi qo'shilganlar</h2>
            <Link to="/products" className="text-sm text-brand-300 hover:underline">Barchasi →</Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => {
              const cat = catById.get(p.categoryId)
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  categoryName={cat?.name ?? '—'}
                  categoryIcon={cat?.icon ?? '📦'}
                  canManage={false}
                  canDelete={false}
                  canAddToCart={canAddToCart}
                  onAddToCart={(prod) => addToCart(prod, 1)}
                />
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
