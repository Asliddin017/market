import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProducts, useCategories, setProductImage } from '../hooks/useData'
import { uploadProductImage } from '../lib/storage'
import { smartSearch } from '../lib/search'
import { selectBulkRows } from '../lib/bulkImages'
import { formatSom } from '../lib/utils'
import SearchBar from '../components/SearchBar'
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncStates'

// Stable empty fallback so memo deps keep identity while data loads.
const EMPTY = []

/**
 * "Rasm qo'shish rejimi" — staff-only fast pass to add photos to the products
 * that don't have one yet. Pick a photo (mobile camera via accept="image/*"),
 * it compresses + uploads to the product-images bucket (reusing storage.js),
 * saves image_url, then focus auto-advances to the next imageless product.
 */
export default function BulkImages() {
  const productsQuery = useProducts()
  const categoriesQuery = useCategories()
  const products = productsQuery.data ?? EMPTY
  const categories = categoriesQuery.data ?? EMPTY
  const loading = productsQuery.loading || categoriesQuery.loading
  const error = productsQuery.error || categoriesQuery.error
  const retry = () => {
    productsQuery.refetch?.()
    categoriesQuery.refetch?.()
  }

  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState(null) // categoryId | null
  const [done, setDone] = useState({}) // productId -> uploaded URL (this session)
  const [uploadingId, setUploadingId] = useState(null)
  const [errors, setErrors] = useState({}) // productId -> message

  const deferredQuery = useDeferredValue(query)

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  // Only categories that still contain at least one imageless product are worth
  // showing as filter chips.
  const imagelessCategoryIds = useMemo(() => {
    const set = new Set()
    for (const p of products) if (!p.image) set.add(p.categoryId)
    return set
  }, [products])

  const filteredCategories = useMemo(
    () => categories.filter((c) => imagelessCategoryIds.has(c.id)),
    [categories, imagelessCategoryIds],
  )

  // Smart fuzzy search + category-chip filter (same engine as Products).
  const results = useMemo(() => {
    let list = smartSearch(deferredQuery, products, categories)
    if (activeCat != null) list = list.filter((p) => p.categoryId === activeCat)
    return list
  }, [deferredQuery, products, categories, activeCat])

  const { rows, completed, total } = useMemo(() => selectBulkRows(results, done), [results, done])

  // Ordered list of ids still needing a photo (display order) — drives focus
  // auto-advance. Kept in a ref so the async upload handler reads the latest.
  const pendingIds = useMemo(
    () => rows.filter((p) => !p.image && !done[p.id]).map((p) => p.id),
    [rows, done],
  )
  const pendingRef = useRef(pendingIds)
  pendingRef.current = pendingIds

  // Refs to each row's pick button so we can move focus to the next one.
  const btnRefs = useRef(new Map())
  const inputRefs = useRef(new Map())

  // If the active category no longer has imageless products, drop the filter.
  useEffect(() => {
    if (activeCat != null && !imagelessCategoryIds.has(activeCat)) setActiveCat(null)
  }, [activeCat, imagelessCategoryIds])

  async function handlePick(product, e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking after an error
    if (!file) return
    setUploadingId(product.id)
    setErrors((prev) => {
      if (!prev[product.id]) return prev
      const next = { ...prev }
      delete next[product.id]
      return next
    })
    try {
      const url = await uploadProductImage(file, { productId: product.id })
      await setProductImage(product.id, url)
      // Find the next pending product BEFORE marking this one done.
      const order = pendingRef.current
      const idx = order.indexOf(product.id)
      const nextId = idx >= 0 ? order[idx + 1] : undefined
      setDone((d) => ({ ...d, [product.id]: url }))
      if (nextId) {
        requestAnimationFrame(() => {
          const btn = btnRefs.current.get(nextId)
          btn?.focus()
          btn?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        })
      }
    } catch (err) {
      console.error('[bulk-images] upload failed:', err)
      setErrors((prev) => ({ ...prev, [product.id]: "Yuklab bo'lmadi. Qaytadan urinib ko'ring." }))
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + running counter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">📸 Rasm qo'shish rejimi</h1>
          <p className="text-sm text-slate-400">
            Rasmsiz mahsulotlarga tez rasm qo'shing — rasm tanlang (telefonda kamera ochiladi),
            keyingisiga avtomatik o'tadi.
          </p>
        </div>
        <div className="glass rounded-2xl px-4 py-2 text-sm font-semibold">
          ✅ <span className="text-brand-300">{completed}</span> / {total} mahsulotga rasm qo'shildi
        </div>
      </div>

      <SearchBar
        value={query}
        onChange={setQuery}
        resultCount={total}
        resultNoun="rasmsiz mahsulot"
        placeholder="Rasmsiz mahsulotni qidirish… (masalan: shokolad, choy)"
      />

      {/* Category filter chips — only categories that still need photos */}
      {filteredCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCat(null)}
            className={`chip ${activeCat == null ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/5 text-slate-300'}`}
          >
            🌐 Barchasi
          </button>
          {filteredCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
              className={`chip ${activeCat === c.id ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      )}

      {/* States: error / loading / empty / list */}
      {error ? (
        <ErrorState onRetry={retry} />
      ) : loading ? (
        <LoadingState label="Mahsulotlar yuklanmoqda…" />
      ) : rows.length === 0 ? (
        query || activeCat != null ? (
          <EmptyState title="Hech narsa topilmadi" hint="Boshqa so'z yoki kategoriya bilan urinib ko'ring." />
        ) : (
          <EmptyState icon="🎉" title="Barcha mahsulotlarda rasm bor" hint="Rasmsiz mahsulot qolmadi." />
        )
      ) : (
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {rows.map((p) => {
              const cat = catById.get(p.categoryId)
              const thumb = done[p.id] ?? p.image
              const isDone = Boolean(thumb)
              const isUploading = uploadingId === p.id
              const err = errors[p.id]
              return (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`glass flex items-center gap-3 rounded-2xl p-3 ${isDone ? 'ring-1 ring-emerald-400/40' : ''}`}
                >
                  {/* Thumbnail / placeholder */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/5">
                    {thumb ? (
                      <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">
                        {cat?.icon ?? '📦'}
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-ink-950/60">
                        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight">{p.name}</p>
                    <p className="truncate text-xs text-slate-400">
                      {cat?.icon} {cat?.name ?? '—'} · {formatSom(p.price)}
                    </p>
                    {err && <p className="mt-0.5 text-xs text-rose-300">⚠️ {err}</p>}
                  </div>

                  {/* Pick button + hidden input */}
                  <div className="shrink-0">
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current.set(p.id, el)
                        else inputRefs.current.delete(p.id)
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePick(p, e)}
                    />
                    <button
                      type="button"
                      ref={(el) => {
                        if (el) btnRefs.current.set(p.id, el)
                        else btnRefs.current.delete(p.id)
                      }}
                      onClick={() => inputRefs.current.get(p.id)?.click()}
                      disabled={isUploading}
                      className={`${isDone ? 'btn-ghost' : 'btn-primary'} px-3 py-2 text-xs disabled:opacity-60`}
                    >
                      {isUploading ? 'Yuklanmoqda…' : isDone ? '🔄 Almashtirish' : '📷 Rasm'}
                    </button>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
