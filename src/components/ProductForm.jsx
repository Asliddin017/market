import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UNITS } from '../lib/constants'
import { saveProduct } from '../hooks/useData'
import { fileToDataUrl } from '../lib/utils'
import PriceHistory from './PriceHistory'

const EMPTY = { name: '', categoryId: '', price: '', unit: 'dona', image: null }

/**
 * Modal form for creating / editing a product. Image is optional — saving
 * without one is always allowed.
 */
export default function ProductForm({ open, onClose, product, categories }) {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(product ? { ...product } : { ...EMPTY, categoryId: categories[0]?.id ?? '' })
      setError('')
    }
  }, [open, product, categories])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await fileToDataUrl(file)
      set('image', dataUrl)
    } catch {
      setError("Rasmni yuklab bo'lmadi.")
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Mahsulot nomini kiriting.')
    if (!form.categoryId) return setError('Kategoriyani tanlang.')
    setBusy(true)
    try {
      await saveProduct(form)
      onClose()
    } catch (err) {
      console.error('[product-form] save failed:', err)
      setError('Saqlashda xatolik yuz berdi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="glass-strong relative z-10 w-full max-w-lg rounded-3xl p-6 shadow-card"
          >
            <h2 className="mb-5 text-xl font-bold">
              {product ? '✏️ Mahsulotni tahrirlash' : '➕ Yangi mahsulot'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nomi *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Masalan: Red Bull Energetik 0.25L"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Kategoriya *</label>
                  <select
                    className="input"
                    value={form.categoryId}
                    onChange={(e) => set('categoryId', e.target.value)}
                  >
                    <option value="" disabled>Tanlang…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

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

                <div className="col-span-2">
                  <label className="label">Rasm (ixtiyoriy)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImage}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500/20 file:px-3 file:py-2 file:text-brand-200 hover:file:bg-brand-500/30"
                  />
                </div>
              </div>

              {form.image && (
                <div className="flex items-center gap-3">
                  <img src={form.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  <button type="button" onClick={() => set('image', null)} className="btn-ghost px-3 py-1.5 text-xs">
                    Rasmni olib tashlash
                  </button>
                </div>
              )}

              {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}

              {product?.id && <PriceHistory productId={product.id} />}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn-ghost">Bekor qilish</button>
                <button type="submit" disabled={busy} className="btn-primary">
                  {busy ? 'Saqlanmoqda…' : 'Saqlash'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
