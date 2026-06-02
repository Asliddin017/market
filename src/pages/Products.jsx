import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useProducts, useCategories, deleteProduct } from '../hooks/useData'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import { useUiStore } from '../store/uiStore'
import { can } from '../lib/roles'
import { smartSearch } from '../lib/search'
import { resolveThemeKey } from '../lib/categoryThemes'
import SearchBar from '../components/SearchBar'
import ProductCard from '../components/ProductCard'
import ProductForm from '../components/ProductForm'
import ConfirmDialog from '../components/ConfirmDialog'

// How many products to render at once. Keeps the DOM light even with thousands
// of products; "Ko'proq" reveals the next page. Avoids long main-thread work.
const PAGE_SIZE = 24

export default function Products() {
  const productsData = useProducts()
  const categoriesData = useCategories()
  // `undefined` => still loading from IndexedDB; coalesce to a safe array so
  // every downstream memo/render works whether loading, empty, or populated.
  const loading = productsData === undefined || categoriesData === undefined
  const products = productsData ?? []
  const categories = categoriesData ?? []
  const role = useAuthStore((s) => s.role)
  const addToCart = useCartStore((s) => s.addItem)
  const setThemeKey = useUiStore((s) => s.setThemeKey)

  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState(null) // categoryId | null
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [toast, setToast] = useState('')

  const canManage = can(role, 'manageProducts')
  const canDelete = can(role, 'deleteProducts')
  const canAddToCart = can(role, 'useCart')

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )

  // Defer the query so typing stays buttery: the input updates instantly while
  // the (heavier) fuzzy filtering runs against the deferred value.
  const deferredQuery = useDeferredValue(query)

  // Smart fuzzy search (relevance-sorted) + category-chip filter.
  const results = useMemo(() => {
    let list = smartSearch(deferredQuery, products, categories)
    if (activeCat != null) list = list.filter((p) => p.categoryId === activeCat)
    return list
  }, [deferredQuery, products, categories, activeCat])

  // Reset pagination whenever the result set changes.
  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [deferredQuery, activeCat])

  // Background follows the selected category (default when "Barchasi").
  useEffect(() => {
    const slug = activeCat != null ? catById.get(activeCat)?.slug : null
    setThemeKey(resolveThemeKey(slug))
    return () => setThemeKey('default')
  }, [activeCat, catById, setThemeKey])

  const shown = results.slice(0, visible)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(p) {
    setEditing(p)
    setFormOpen(true)
  }
  async function confirmDelete() {
    if (toDelete) {
      await deleteProduct(toDelete.id)
      setToDelete(null)
    }
  }
  function handleAddToCart(p) {
    addToCart(p, 1)
    setToast(`"${p.name}" savatga qo'shildi`)
    setTimeout(() => setToast(''), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Mahsulotlar</h1>
          <p className="text-sm text-slate-400">{products.length} ta mahsulot · {categories.length} ta kategoriya</p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="btn-primary">➕ Yangi mahsulot</button>
        )}
      </div>

      <SearchBar value={query} onChange={setQuery} resultCount={results.length} />

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCat(null)}
          className={`chip ${activeCat == null ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/5 text-slate-300'}`}
        >
          🌐 Barchasi
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
            className={`chip ${activeCat === c.id ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
          >
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="glass flex flex-col items-center justify-center rounded-3xl py-20 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-400" />
          <p className="mt-3 text-sm text-slate-400">Mahsulotlar yuklanmoqda…</p>
        </div>
      ) : results.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-3xl py-20 text-center">
          <span className="text-5xl">🔍</span>
          <p className="mt-3 text-lg font-semibold">Hech narsa topilmadi</p>
          <p className="text-sm text-slate-400">Boshqa so'z bilan urinib ko'ring.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((p) => {
              const cat = catById.get(p.categoryId)
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  categoryName={cat?.name ?? '—'}
                  categoryIcon={cat?.icon ?? '📦'}
                  canManage={canManage}
                  canDelete={canDelete}
                  canAddToCart={canAddToCart}
                  onEdit={openEdit}
                  onDelete={setToDelete}
                  onAddToCart={handleAddToCart}
                />
              )
            })}
          </div>

          {visible < results.length && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="btn-ghost"
              >
                Ko'proq ko'rsatish ({results.length - visible} ta qoldi)
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
        categories={categories}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Mahsulotni o'chirish"
        message={`"${toDelete?.name}" o'chirilsinmi? Bu amalni qaytarib bo'lmaydi.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-ink-950 shadow-glow"
          >
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
