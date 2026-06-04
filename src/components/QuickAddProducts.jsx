import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UNITS } from '../lib/constants'
import { saveProduct } from '../hooks/useData'
import { uploadProductImage, deleteProductImage } from '../lib/storage'
import { formatSom } from '../lib/utils'

// ---------------------------------------------------------------------------
// "Add many products into ONE locked category" mode (admin / seller).
//
// The category is pre-selected and locked for the whole session. After each
// save the form resets but stays open, keeps the chosen unit, and refocuses the
// name field — so you can add product after product without re-picking the
// category. A running session list + counter is shown; "Tugatish" exits.
// ---------------------------------------------------------------------------

const emptyForm = (unit = 'dona') => ({ name: '', price: '', unit, image: null })

export default function QuickAddProducts({ category, onClose }) {
  const [form, setForm] = useState(() => emptyForm())
  const [added, setAdded] = useState([]) // session list (most recent first)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const nameRef = useRef(null)
  // Uploaded-but-not-yet-saved image URL (orphan candidate on remove/close).
  const freshUploadRef = useRef(null)

  // Focus the name field on open.
  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const url = await uploadProductImage(file, { productId: null })
      if (freshUploadRef.current) deleteProductImage(freshUploadRef.current) // drop superseded orphan
      freshUploadRef.current = url
      set('image', url)
    } catch (err) {
      console.error('[quick-add] image upload failed:', err)
      setError("Rasmni yuklab bo'lmadi. Qaytadan urinib ko'ring.")
    } finally {
      setUploading(false)
    }
  }

  function removeImage() {
    if (freshUploadRef.current && form.image === freshUploadRef.current) {
      deleteProductImage(freshUploadRef.current)
      freshUploadRef.current = null
    }
    set('image', null)
  }

  // Closing: clean up an image uploaded for an item that was never saved.
  function handleClose() {
    if (freshUploadRef.current) deleteProductImage(freshUploadRef.current)
    freshUploadRef.current = null
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Mahsulot nomini kiriting.')
      nameRef.current?.focus()
      return
    }
    setBusy(true)
    try {
      await saveProduct({ ...form, categoryId: category.id })
      freshUploadRef.current = null // committed to the saved product now
      // Record in the session list (price/unit snapshot for display).
      setAdded((list) => [
        { name: form.name.trim(), price: Number(form.price) || 0, unit: form.unit },
        ...list,
      ])
      // Reset but KEEP the unit; stay open and refocus name for the next one.
      setForm((f) => emptyForm(f.unit))
      setError('')
      nameRef.current?.focus()
    } catch {
      setError('Saqlashda xatolik yuz berdi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={handleClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="glass-strong relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl shadow-card"
        >
          {/* Header — locked category */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-slate-400">Tezkor qo'shish</p>
              <h2 className="flex items-center gap-2 truncate text-lg font-bold">
                <span className="text-2xl">{category.icon}</span>
                <span className="truncate">{category.name}</span>
                <span className="shrink-0 rounded-full bg-brand-500/20 px-2 py-0.5 text-[11px] font-semibold text-brand-200">
                  🔒 tanlangan
                </span>
              </h2>
            </div>
            <button onClick={handleClose} className="btn-primary shrink-0 px-3 py-2 text-xs">
              ✓ Tugatish
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* Running counter */}
            <div className="mb-4 rounded-xl border border-white/10 bg-ink-950/40 px-4 py-2.5 text-sm">
              <span className="font-semibold text-brand-300">Qo'shildi: {added.length} ta</span>
              <span className="text-slate-400"> → {category.name}</span>
            </div>

            {/* Fast add form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Mahsulot nomi *</label>
                <input
                  ref={nameRef}
                  className="input"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Masalan: Red Bull Energetik 0.25L"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Narxi (so'm)</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    placeholder="18000"
                  />
                </div>
                <div>
                  <label className="label">O'lcham birligi</label>
                  <select className="input" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Rasm (ixtiyoriy)</label>
                <input
                  // Remount per added item so the chosen filename clears after save.
                  key={added.length}
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  disabled={uploading}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500/20 file:px-3 file:py-2 file:text-brand-200 hover:file:bg-brand-500/30 disabled:opacity-50"
                />
                {uploading && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
                    Rasm yuklanmoqda…
                  </div>
                )}
                {!uploading && form.image && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={form.image} alt="" loading="lazy" className="h-14 w-14 rounded-xl object-cover" />
                    <button type="button" onClick={removeImage} className="btn-ghost px-3 py-1.5 text-xs">
                      Olib tashlash
                    </button>
                  </div>
                )}
              </div>

              {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}

              <button type="submit" disabled={busy || uploading} className="btn-primary w-full">
                {busy ? 'Saqlanmoqda…' : uploading ? 'Rasm yuklanmoqda…' : '➕ Saqlash va keyingisi'}
              </button>
              <p className="text-center text-xs text-slate-500">
                Saqlangach forma tozalanadi va kursor nom maydoniga qaytadi.
              </p>
            </form>

            {/* Session list */}
            {added.length > 0 && (
              <div className="mt-5">
                <p className="label">Shu sessiyada qo'shilganlar</p>
                <ul className="space-y-1.5">
                  <AnimatePresence initial={false}>
                    {added.map((p, i) => (
                      <motion.li
                        key={`${p.name}-${added.length - i}`}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
                      >
                        <span className="truncate">✓ {p.name}</span>
                        <span className="shrink-0 text-brand-300">{formatSom(p.price)} / {p.unit}</span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
