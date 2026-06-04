import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UNITS } from '../lib/constants'
import { saveProduct } from '../hooks/useData'
import { uploadProductImage, deleteProductImage } from '../lib/storage'
import PriceHistory from './PriceHistory'

const EMPTY = { name: '', categoryId: '', price: '', unit: 'dona', image: null }

/**
 * Modal form for creating / editing a product. Image is optional — saving
 * without one is always allowed.
 *
 * Images go to Supabase Storage (the "product-images" bucket), not the DB: on
 * pick we compress + upload immediately and keep only the public URL in
 * `form.image`. We track the image the form opened with (`originalImageRef`) so
 * a successful replace/remove deletes the old file, and the freshly-uploaded
 * URL (`freshUploadRef`) so cancelling cleans up the orphan it would leave.
 */
export default function ProductForm({ open, onClose, product, categories }) {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Image the form opened with (to delete after a successful replace/remove).
  const originalImageRef = useRef(null)
  // Most recent uploaded-but-not-yet-saved URL (orphan candidate on cancel).
  const freshUploadRef = useRef(null)

  useEffect(() => {
    if (open) {
      setForm(product ? { ...product } : { ...EMPTY, categoryId: categories[0]?.id ?? '' })
      setError('')
      setUploading(false)
      originalImageRef.current = product?.image ?? null
      freshUploadRef.current = null
    }
  }, [open, product, categories])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleImage(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the user re-pick the same file after a remove
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const url = await uploadProductImage(file, { productId: product?.id })
      // A previous fresh (uncommitted) upload is now superseded — drop it.
      if (freshUploadRef.current && freshUploadRef.current !== originalImageRef.current) {
        deleteProductImage(freshUploadRef.current)
      }
      freshUploadRef.current = url
      set('image', url)
    } catch (err) {
      console.error('[product-form] image upload failed:', err)
      setError("Rasmni yuklab bo'lmadi. Qaytadan urinib ko'ring.")
    } finally {
      setUploading(false)
    }
  }

  function removeImage() {
    // If the shown image is a fresh (uncommitted) upload, delete it right away.
    if (freshUploadRef.current && form.image === freshUploadRef.current) {
      deleteProductImage(freshUploadRef.current)
      freshUploadRef.current = null
    }
    set('image', null)
  }

  // Closing without saving: clean up any orphan upload we created this session.
  function handleClose() {
    if (freshUploadRef.current && freshUploadRef.current !== originalImageRef.current) {
      deleteProductImage(freshUploadRef.current)
    }
    freshUploadRef.current = null
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Mahsulot nomini kiriting.')
    if (!form.categoryId) return setError('Kategoriyani tanlang.')
    setBusy(true)
    try {
      await saveProduct(form)
      // Saved OK: if the original image was replaced or removed, delete it.
      const original = originalImageRef.current
      if (original && original !== form.image) deleteProductImage(original)
      freshUploadRef.current = null
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
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={handleClose} />

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
                    disabled={uploading}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500/20 file:px-3 file:py-2 file:text-brand-200 hover:file:bg-brand-500/30 disabled:opacity-50"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Telefonda kamera ham ochiladi · rasm yuklashdan oldin avtomatik siqiladi
                  </p>
                </div>
              </div>

              {uploading && (
                <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
                  Rasm yuklanmoqda…
                </div>
              )}

              {!uploading && form.image && (
                <div className="flex items-center gap-3">
                  <img
                    src={form.image}
                    alt=""
                    loading="lazy"
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                  <button type="button" onClick={removeImage} className="btn-ghost px-3 py-1.5 text-xs">
                    Rasmni olib tashlash
                  </button>
                </div>
              )}

              {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}

              {product?.id && <PriceHistory productId={product.id} />}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={handleClose} className="btn-ghost">Bekor qilish</button>
                <button type="submit" disabled={busy || uploading} className="btn-primary">
                  {busy ? 'Saqlanmoqda…' : uploading ? 'Rasm yuklanmoqda…' : 'Saqlash'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
