import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore, selectTotal, selectCount, cartLineTotal } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { createOrderFromCart } from '../hooks/useData'
import ProductImage from '../components/ProductImage'
import ConfirmDialog from '../components/ConfirmDialog'
import { LoadingState, ErrorState } from '../components/AsyncStates'
import { formatSom, formatDateTime } from '../lib/utils'
import { SELL_MODE, canEditPrice, canSellByPiece, isPieceMode, pieceModeLabel } from '../lib/pricing'

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const increment = useCartStore((s) => s.increment)
  const decrement = useCartStore((s) => s.decrement)
  const setQty = useCartStore((s) => s.setQty)
  const setCustomPrice = useCartStore((s) => s.setCustomPrice)
  const setSellMode = useCartStore((s) => s.setSellMode)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)
  const total = useCartStore(selectTotal)
  const count = useCartStore(selectCount)
  const updatedAt = useCartStore((s) => s.updatedAt)
  const loaded = useCartStore((s) => s.loaded)
  const error = useCartStore((s) => s.error)
  const reload = useCartStore((s) => s.reload)
  const userId = useAuthStore((s) => s.user?.id)
  const navigate = useNavigate()

  const [confirmClear, setConfirmClear] = useState(false)
  const [done, setDone] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState('')

  async function checkout() {
    if (placing || items.length === 0) return
    setPlaceError('')
    setPlacing(true)
    // Snapshot the items BEFORE clearing the cart (clear empties the store).
    const snapshot = items.map((i) => ({ ...i }))
    try {
      const orderId = await createOrderFromCart({ clientId: userId, items: snapshot })
      setDone(true)
      await clear()
      // Brief success flash, then jump to the new order (receipt-to-be).
      setTimeout(() => navigate(`/orders/${orderId}`), 900)
    } catch (err) {
      console.error('[cart] order failed:', err)
      setPlaceError("Buyurtma berishda xatolik yuz berdi. Qayta urinib ko'ring.")
    } finally {
      setPlacing(false)
    }
  }

  // Saved cart still loading from Supabase — show a spinner, not an empty cart.
  if (!loaded && !done) {
    return <LoadingState label="Savatcha yuklanmoqda…" />
  }

  // Failed to load the saved cart — offer a retry instead of "savatcha bo'sh".
  if (error && !done) {
    return <ErrorState onRetry={reload} message="Savatchani yuklab bo'lmadi" />
  }

  if (items.length === 0 && !done) {
    return (
      <div className="glass flex flex-col items-center justify-center rounded-3xl py-24 text-center">
        <span className="text-6xl">🛒</span>
        <p className="mt-4 text-xl font-semibold">Savatcha bo'sh</p>
        <p className="text-sm text-slate-400">Mahsulotlarni qo'shish uchun do'konni ko'rib chiqing.</p>
        <Link to="/products" className="btn-primary mt-6">📦 Mahsulotlarga o'tish</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Savatcha</h1>
          <p className="text-sm text-slate-400">
            {count} ta mahsulot
            {updatedAt && ` · oxirgi yangilanish: ${formatDateTime(updatedAt)}`}
          </p>
        </div>
        {items.length > 0 && (
          <button onClick={() => setConfirmClear(true)} className="btn-ghost text-xs">Tozalash</button>
        )}
      </div>

      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass-strong rounded-2xl border-brand-400/40 p-5 text-center"
          >
            <span className="text-3xl">🎉</span>
            <p className="mt-2 font-semibold text-brand-200">Buyurtma qabul qilindi! Rahmat.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Items */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                className="glass flex items-center gap-4 rounded-2xl p-3"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                  <ProductImage product={item} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{item.name}</h3>

                  {/* Price line: kg-custom (struck), piece (dona), or fixed. */}
                  {canEditPrice(item) && item.customPrice != null ? (
                    <p className="text-sm">
                      <span className="text-slate-500 line-through">{formatSom(item.price)}</span>{' '}
                      <span className="text-gold-300">{formatSom(item.customPrice)}</span>
                      <span className="text-slate-500"> / {item.unit}</span>
                    </p>
                  ) : isPieceMode(item) ? (
                    <p className="text-sm text-brand-300">{pieceModeLabel(item)}</p>
                  ) : (
                    <p className="text-sm text-brand-300">
                      {formatSom(item.price)} / {canSellByPiece(item) ? 'pachka' : item.unit}
                    </p>
                  )}

                  {/* Cigarettes: switch between Pachka (pack) and Dona (piece). */}
                  {canSellByPiece(item) && (
                    <div className="mt-1.5 inline-flex gap-1">
                      <button
                        onClick={() => setSellMode(item.id, SELL_MODE.PACK)}
                        className={`chip justify-center px-2.5 py-0.5 text-[11px] ${item.sellMode !== SELL_MODE.PIECE ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/5 text-slate-300'}`}
                      >
                        📦 Pachka
                      </button>
                      <button
                        onClick={() => setSellMode(item.id, SELL_MODE.PIECE)}
                        className={`chip justify-center px-2.5 py-0.5 text-[11px] ${item.sellMode === SELL_MODE.PIECE ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/5 text-slate-300'}`}
                      >
                        🚬 Dona
                      </button>
                    </div>
                  )}

                  {/* Custom price override — ONLY for kg (scale) items (Change A). */}
                  {canEditPrice(item) && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <label className="text-[11px] text-slate-400">Maxsus narx:</label>
                      <input
                        type="number"
                        min="0"
                        placeholder={String(item.price)}
                        value={item.customPrice ?? ''}
                        onChange={(e) => setCustomPrice(item.id, e.target.value)}
                        className="w-24 rounded-lg bg-ink-900/60 px-2 py-1 text-xs"
                      />
                      {item.customPrice != null && (
                        <button
                          onClick={() => setCustomPrice(item.id, '')}
                          className="text-[11px] text-slate-400 hover:text-rose-300"
                          title="Asl narxga qaytarish"
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  )}

                  <p className="mt-1 text-xs text-slate-400">
                    Jami: {formatSom(cartLineTotal(item))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => decrement(item.id)} className="h-8 w-8 rounded-lg bg-white/10 text-lg leading-none hover:bg-white/20">−</button>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => setQty(item.id, Number(e.target.value))}
                    className="w-12 rounded-lg bg-ink-900/60 py-1 text-center text-sm"
                  />
                  <button onClick={() => increment(item.id)} className="h-8 w-8 rounded-lg bg-white/10 text-lg leading-none hover:bg-white/20">+</button>
                </div>
                <button onClick={() => removeItem(item.id)} className="ml-1 rounded-lg p-2 text-rose-400 hover:bg-rose-500/10">🗑️</button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="glass-strong space-y-4 rounded-2xl p-5">
              <h3 className="font-semibold">Buyurtma xulosasi</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Mahsulotlar ({count})</span>
                  <span>{formatSom(total)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Olib ketish</span>
                  <span className="text-brand-300">Do'kondan</span>
                </div>
              </div>
              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Jami</span>
                  <span className="text-2xl font-extrabold text-brand-300">{formatSom(total)}</span>
                </div>
              </div>
              {placeError && <p className="text-xs text-rose-300">{placeError}</p>}
              <button onClick={checkout} disabled={placing} className="btn-gold w-full">
                {placing ? 'Yuborilmoqda…' : '✓ Buyurtma berish'}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Savatchani tozalash"
        message="Barcha mahsulotlar savatchadan olib tashlansinmi?"
        confirmLabel="Tozalash"
        onConfirm={() => { clear(); setConfirmClear(false) }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
