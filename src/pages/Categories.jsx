import { useDeferredValue, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCategories, useProducts, saveCategory, deleteCategory } from '../hooks/useData'
import { useAuthStore } from '../store/authStore'
import { can } from '../lib/roles'
import { isStaff } from '../lib/visibility'
import { searchCategories } from '../lib/search'
import SearchBar from '../components/SearchBar'
import ConfirmDialog from '../components/ConfirmDialog'
import QuickAddProducts from '../components/QuickAddProducts'
import PriceListExport from '../components/PriceListExport'
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncStates'
import { formatDateTime } from '../lib/utils'
import { resolveCategoryIcon } from '../lib/categoryIcons'

// Stable empty fallback so the counts memo keeps identity while data loads.
const EMPTY = []

export default function Categories() {
  const categoriesQuery = useCategories()
  const productsQuery = useProducts()
  const categories = categoriesQuery.data ?? EMPTY
  const products = productsQuery.data ?? EMPTY
  const loading = categoriesQuery.loading || productsQuery.loading
  const error = categoriesQuery.error || productsQuery.error
  const retry = () => {
    categoriesQuery.refetch?.()
    productsQuery.refetch?.()
  }
  const role = useAuthStore((s) => s.role)

  const canManage = can(role, 'manageCategories')
  const canDelete = can(role, 'deleteCategories')
  const canAddProducts = can(role, 'manageProducts') // admin + seller

  const [editing, setEditing] = useState(null) // category | {} for new | null
  const [name, setName] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [warn, setWarn] = useState('')
  const [addingTo, setAddingTo] = useState(null) // category for quick-add mode
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const map = new Map()
    for (const p of products) map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + 1)
    return map
  }, [products])

  // Defer the query so typing stays smooth while the fuzzy filter runs against
  // the deferred value (same approach as the Products page). `categories` is
  // already role-visible (useCategories drops client-hidden ones), so search
  // never surfaces a hidden category.
  const deferredQuery = useDeferredValue(query)
  const filtered = useMemo(
    () => searchCategories(deferredQuery, categories),
    [deferredQuery, categories],
  )

  function startNew() {
    setEditing({})
    setName('')
  }
  function startEdit(c) {
    setEditing(c)
    setName(c.name)
  }
  function cancel() {
    setEditing(null)
    setName('')
  }
  function flashWarn(text) {
    setWarn(text)
    setTimeout(() => setWarn(''), 4000)
  }
  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await saveCategory({ id: editing?.id, name })
      cancel()
    } catch (err) {
      console.error('[categories] save failed:', err)
      flashWarn(
        String(err?.message ?? '').toLowerCase().includes('duplicate')
          ? 'Bu nomli kategoriya allaqachon mavjud.'
          : 'Saqlashda xatolik yuz berdi.',
      )
    }
  }
  async function confirmDelete() {
    const target = toDelete
    setToDelete(null)
    try {
      const res = await deleteCategory(target.id)
      if (!res.ok) {
        flashWarn(`"${target.name}" ichida ${res.used} ta mahsulot bor. Avval ularni o'chiring yoki ko'chiring.`)
      }
    } catch (err) {
      console.error('[categories] delete failed:', err)
      flashWarn("O'chirishda xatolik yuz berdi.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Kategoriyalar</h1>
          <p className="text-sm text-slate-400">
            {categories.length} ta kategoriya
            {canAddProducts && " · kartani bosing → o'sha kategoriyaga ketma-ket mahsulot qo'shing"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isStaff(role) && <PriceListExport products={products} categories={categories} />}
          {canManage && !editing && (
            <button onClick={startNew} className="btn-primary">➕ Yangi kategoriya</button>
          )}
        </div>
      </div>

      <SearchBar
        value={query}
        onChange={setQuery}
        resultCount={filtered.length}
        resultNoun="kategoriya"
        placeholder="Kategoriya qidirish… (masalan: shokolad, choy)"
      />

      {warn && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          ⚠️ {warn}
        </motion.p>
      )}

      {/* Inline editor */}
      <AnimatePresence>
        {editing && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-strong overflow-hidden rounded-2xl p-5"
          >
            <h3 className="mb-3 font-semibold">{editing.id ? 'Tahrirlash' : 'Yangi kategoriya'}</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="label">Nomi</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Energetik ichimliklar" autoFocus />
              </div>
              <div>
                <label className="label">Belgi (avtomatik)</label>
                <div className="flex h-[46px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4">
                  <span className="text-2xl">{resolveCategoryIcon(name)}</span>
                  <span className="text-xs text-slate-400">nomdan tanlanadi</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={cancel} className="btn-ghost">Bekor qilish</button>
              <button type="submit" className="btn-primary">Saqlash</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Grid of categories — explicit loading / error / empty / data states */}
      {error ? (
        <ErrorState onRetry={retry} />
      ) : loading ? (
        <LoadingState label="Kategoriyalar yuklanmoqda…" />
      ) : categories.length === 0 ? (
        <EmptyState icon="🏷️" title="Hech narsa topilmadi" hint="Hozircha kategoriyalar yo'q." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔍" title="Hech narsa topilmadi" hint="Boshqa so'z bilan urinib ko'ring." />
      ) : (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((c) => (
          <motion.div
            key={c.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            onClick={canAddProducts ? () => setAddingTo(c) : undefined}
            role={canAddProducts ? 'button' : undefined}
            tabIndex={canAddProducts ? 0 : undefined}
            onKeyDown={
              canAddProducts
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setAddingTo(c)
                    }
                  }
                : undefined
            }
            className={`glass group flex flex-col items-center gap-2 rounded-2xl p-5 text-center shadow-card ${
              canAddProducts ? 'cursor-pointer transition hover:bg-white/10 hover:ring-1 hover:ring-brand-400/40' : ''
            }`}
          >
            <span className="text-4xl">{c.icon}</span>
            <h3 className="font-semibold leading-tight">{c.name}</h3>
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-slate-400">
              {counts.get(c.id) ?? 0} ta mahsulot
            </span>
            {c.createdAt && (
              <span className="text-[10px] text-slate-500">🕒 {formatDateTime(c.createdAt)}</span>
            )}

            {canAddProducts && (
              <span className="text-[11px] font-semibold text-brand-300 opacity-0 transition group-hover:opacity-100">
                ➕ Mahsulot qo'shish
              </span>
            )}

            {(canManage || canDelete) && (
              <div className="mt-1 flex gap-1.5">
                {canManage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startEdit(c)
                    }}
                    className="btn-ghost px-2.5 py-1 text-xs"
                  >
                    ✏️
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setToDelete(c)
                    }}
                    className="btn-danger px-2.5 py-1 text-xs"
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Kategoriyani o'chirish"
        message={`"${toDelete?.name}" o'chirilsinmi?`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      {addingTo && (
        <QuickAddProducts category={addingTo} onClose={() => setAddingTo(null)} />
      )}
    </div>
  )
}
