import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SORT_OPTIONS, DEFAULT_SORT } from '../lib/priceList'

// ---------------------------------------------------------------------------
// Staff-only "Bo'lim bo'yicha PDF yuklab olish": pick one/several/all
// categories, choose the sort order (by price or name), and download a PDF.
//
// `products` + `categories` arrive ALREADY role-visible from the page (the data
// hooks drop client-hidden categories), so this never exports a hidden section.
// Render this only for staff at the call site.
// ---------------------------------------------------------------------------
export default function PriceListExport({ products = [], categories = [] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [sort, setSort] = useState(DEFAULT_SORT)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  // Product counts per category, so the picker shows how many rows each holds.
  const counts = useMemo(() => {
    const map = new Map()
    for (const p of products) map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + 1)
    return map
  }, [products])

  const allSelected = categories.length > 0 && selected.size === categories.length

  function openPanel() {
    // Pre-select every category — the common case is "print everything".
    setSelected(new Set(categories.map((c) => c.id)))
    setSort(DEFAULT_SORT)
    setError('')
    setMsg('')
    setOpen(true)
  }
  function closePanel() {
    if (busy) return
    setOpen(false)
  }
  function toggle(id) {
    setError('')
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAll() {
    setError('')
    setSelected(allSelected ? new Set() : new Set(categories.map((c) => c.id)))
  }

  async function handleDownload() {
    if (selected.size === 0) {
      setError("Kamida bitta bo'lim tanlang")
      return
    }
    setBusy(true)
    setError('')
    try {
      // Lazy-load the generator (jsPDF) so it stays out of the initial bundle —
      // it's only fetched when staff actually exports a PDF.
      const { generatePriceListPdf } = await import('../lib/priceListPdf')
      const res = await generatePriceListPdf({
        products,
        categories,
        selectedIds: selected,
        sortOrder: sort,
      })
      setMsg(`✓ ${res.products} mahsulot, ${res.categories} bo'lim yuklab olindi`)
      setTimeout(() => setMsg(''), 3500)
      setOpen(false)
    } catch (err) {
      console.error('[price-list] PDF generation failed:', err)
      setError("PDF yaratishda xatolik yuz berdi. Qaytadan urinib ko'ring.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button onClick={openPanel} className="btn-ghost text-xs" title="Narxlar ro'yxatini PDF qilib yuklab olish">
        🧾 PDF yuklab olish
      </button>
      {msg && <span className="text-xs text-brand-300">{msg}</span>}

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={closePanel} />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="glass-strong relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col rounded-3xl p-6 shadow-card"
            >
              <h2 className="mb-1 text-xl font-bold">🧾 Bo'lim bo'yicha PDF</h2>
              <p className="mb-4 text-xs text-slate-400">
                Bo'limlarni tanlang — narxlar ro'yxati PDF holida yuklab olinadi.
              </p>

              {/* Sort order — price asc/desc + name A→Z / Z→A */}
              <div className="mb-4">
                <label className="label">Saralash</label>
                <div className="grid grid-cols-2 gap-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSort(opt.value)}
                      aria-pressed={sort === opt.value}
                      className={`chip justify-center ${
                        sort === opt.value
                          ? 'border-brand-400/60 bg-brand-500/15 text-brand-200'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select all */}
              <label className="mb-2 flex cursor-pointer items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-brand-500"
                />
                Barchasini tanlash
                <span className="ml-auto text-xs font-normal text-slate-400">
                  {selected.size}/{categories.length} tanlandi
                </span>
              </label>

              {/* Category checkboxes */}
              <div className="-mx-1 flex-1 overflow-y-auto px-1">
                {categories.length === 0 ? (
                  <p className="px-1 py-3 text-sm text-slate-400">Kategoriyalar yo'q.</p>
                ) : (
                  <ul className="space-y-1">
                    {categories.map((c) => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                          <input
                            type="checkbox"
                            checked={selected.has(c.id)}
                            onChange={() => toggle(c.id)}
                            className="h-4 w-4 accent-brand-500"
                          />
                          <span>{c.icon}</span>
                          <span className="truncate">{c.name}</span>
                          <span className="ml-auto shrink-0 text-xs text-slate-400">
                            {counts.get(c.id) ?? 0} ta
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error && (
                <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={closePanel} disabled={busy} className="btn-ghost">
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={busy || selected.size === 0}
                  className="btn-primary"
                >
                  {busy ? 'Yaratilmoqda…' : 'Yuklab olish (PDF)'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
