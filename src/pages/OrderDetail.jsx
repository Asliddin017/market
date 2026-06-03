import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useOrder,
  setOrderStatus,
  setOrderItemAvailable,
  setOrderItemQuantity,
  setOrderItemCustomPrice,
  deleteOrder,
} from '../hooks/useData'
import { useAuthStore } from '../store/authStore'
import { can } from '../lib/roles'
import { formatSom, formatDateTime } from '../lib/utils'
import {
  ORDER_STATUS,
  ORDER_STATUS_FLOW,
  effectivePrice,
  lineTotal,
  orderTotal,
  statusMeta,
  isReceiptReady,
} from '../lib/orders'
import { canEditPrice, canSellByPiece, isPieceMode, displayUnit, pieceModeLabel } from '../lib/pricing'
import { formatPhone, telHref } from '../lib/phone'
import OrderStatusBadge from '../components/OrderStatusBadge'
import Receipt from '../components/Receipt'
import ConfirmDialog from '../components/ConfirmDialog'
import { LoadingState, ErrorState, EmptyState } from '../components/AsyncStates'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const isStaff = can(role, 'manageOrders')
  const isAdmin = can(role, 'deleteOrders')

  const { data: order, loading, error, refetch } = useOrder(id)

  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  if (loading) return <LoadingState label="Buyurtma yuklanmoqda…" />
  if (error) return <ErrorState onRetry={refetch} message="Buyurtmani yuklab bo'lmadi" />
  if (!order) {
    return (
      <EmptyState icon="🔍" title="Buyurtma topilmadi" hint="U o‘chirilgan bo‘lishi mumkin." />
    )
  }

  const items = order.items ?? []
  const total = orderTotal(items)
  const unavailableCount = items.filter((i) => i.isAvailable === false).length
  const ready = isReceiptReady(order.status)

  // Forward statuses the seller can move to from the current one.
  const currentIdx = ORDER_STATUS_FLOW.indexOf(order.status)
  const forward = currentIdx === -1 ? [] : ORDER_STATUS_FLOW.slice(currentIdx + 1)

  async function changeStatus(status) {
    setBusy(true)
    try {
      await setOrderStatus(order.id, status)
      flash(`Holat: ${statusMeta(status).label}`)
    } catch (err) {
      console.error('[order] status change failed:', err)
      flash('Holatni o‘zgartirib bo‘lmadi')
    } finally {
      setBusy(false)
    }
  }

  async function toggleAvailable(item) {
    setBusy(true)
    try {
      await setOrderItemAvailable(item.id, !item.isAvailable)
      flash(item.isAvailable ? `"${item.name}" — yo'q deb belgilandi` : `"${item.name}" — qaytarildi`)
    } catch (err) {
      console.error('[order] availability toggle failed:', err)
      flash('O‘zgartirib bo‘lmadi')
    } finally {
      setBusy(false)
    }
  }

  async function changeQty(item, nextQty) {
    const q = Math.max(1, Math.floor(Number(nextQty) || 1))
    if (q === item.quantity) return
    setBusy(true)
    try {
      await setOrderItemQuantity(item.id, q)
    } catch (err) {
      console.error('[order] quantity change failed:', err)
      flash('Sonini o‘zgartirib bo‘lmadi')
    } finally {
      setBusy(false)
    }
  }

  async function changePrice(item, value) {
    setBusy(true)
    try {
      await setOrderItemCustomPrice(item.id, value)
    } catch (err) {
      console.error('[order] price change failed:', err)
      flash('Narxni o‘zgartirib bo‘lmadi')
    } finally {
      setBusy(false)
    }
  }

  async function doDelete() {
    setConfirmDelete(false)
    try {
      await deleteOrder(order.id)
      navigate('/orders')
    } catch (err) {
      console.error('[order] delete failed:', err)
      flash("O'chirib bo'lmadi")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header (hidden on print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="min-w-0">
          <Link to="/orders" className="text-sm text-slate-400 hover:text-brand-300">
            ← Buyurtmalar
          </Link>
          <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">
            Buyurtma №{String(order.id).slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-slate-400">
            {formatDateTime(order.createdAt)}
            {isStaff && order.clientName && ` · 👤 ${order.clientName}`}
          </p>

          {/* Staff: customer's checkout name + tap-to-call phone. */}
          {isStaff && (order.customerName || order.customerPhone) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {order.customerName && (
                <span className="font-semibold text-slate-200">🙍 {order.customerName}</span>
              )}
              {order.customerPhone && (
                <a
                  href={`tel:${telHref(order.customerPhone)}`}
                  className="font-semibold text-brand-300 hover:underline"
                >
                  📞 {formatPhone(order.customerPhone)}
                </a>
              )}
            </div>
          )}
        </div>
        <OrderStatusBadge status={order.status} className="text-sm" />
      </div>

      {/* Client notice: some items unavailable */}
      {unavailableCount > 0 && !isStaff && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200 print:hidden">
          ⚠️ {unavailableCount} ta mahsulot hozir <b>yo'q</b> — ular umumiy summadan chiqarildi.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Items */}
        <div className="space-y-3 print:hidden">
          {items.length === 0 ? (
            <EmptyState icon="📦" title="Bu buyurtmada mahsulot yo‘q" />
          ) : (
            items.map((it) => {
              const gone = it.isAvailable === false
              const piece = isPieceMode(it)
              const hasCustom = canEditPrice(it) && it.customPrice != null
              const unitWord = displayUnit(it)
              const editable = isStaff && !gone
              return (
                <div
                  key={it.id}
                  className={`glass flex flex-wrap items-center gap-4 rounded-2xl p-3 ${gone ? 'opacity-60' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <h3 className={`truncate font-semibold ${gone ? 'line-through' : ''}`}>
                      {it.name}
                      {canSellByPiece(it) && (
                        <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                          {piece ? '🚬 dona' : '📦 pachka'}
                        </span>
                      )}
                      {gone && <span className="ml-2 text-xs font-bold text-rose-300">YO'Q</span>}
                    </h3>
                    <p className="text-sm">
                      {piece ? (
                        <span className="text-brand-300">{pieceModeLabel(it)}</span>
                      ) : hasCustom ? (
                        <>
                          <span className="text-slate-500 line-through">{formatSom(it.originalPrice)}</span>{' '}
                          <span className="text-gold-300">{formatSom(effectivePrice(it))}</span>{' '}
                          <span className="text-[10px] text-gold-300">(maxsus narx)</span>
                          <span className="text-slate-500"> / {unitWord}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-brand-300">{formatSom(effectivePrice(it))}</span>
                          <span className="text-slate-500"> / {unitWord}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {it.quantity} {unitWord} · Jami:{' '}
                      <span className={gone ? 'text-slate-500 line-through' : ''}>
                        {formatSom(lineTotal(it))}
                      </span>
                    </p>

                    {/* Seller/admin: edit the kg price right on the order (Change A). */}
                    {editable && canEditPrice(it) && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <label className="text-[11px] text-slate-400">Narx (kg):</label>
                        <input
                          type="number"
                          min="0"
                          defaultValue={it.customPrice ?? ''}
                          placeholder={String(it.originalPrice)}
                          onBlur={(e) => changePrice(it, e.target.value)}
                          disabled={busy}
                          className="w-24 rounded-lg bg-ink-900/60 px-2 py-1 text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Seller/admin: edit quantity for ANY line (Change A #3). */}
                  {editable && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeQty(it, it.quantity - 1)}
                        disabled={busy || it.quantity <= 1}
                        className="h-8 w-8 rounded-lg bg-white/10 text-lg leading-none hover:bg-white/20 disabled:opacity-40"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => changeQty(it, e.target.value)}
                        disabled={busy}
                        className="w-12 rounded-lg bg-ink-900/60 py-1 text-center text-sm"
                      />
                      <button
                        onClick={() => changeQty(it, it.quantity + 1)}
                        disabled={busy}
                        className="h-8 w-8 rounded-lg bg-white/10 text-lg leading-none hover:bg-white/20"
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* Seller/admin: mark a line unavailable / restore */}
                  {isStaff && (
                    <button
                      onClick={() => toggleAvailable(it)}
                      disabled={busy}
                      className={gone ? 'btn-ghost px-3 py-2 text-xs' : 'btn-danger px-3 py-2 text-xs'}
                    >
                      {gone ? '↩︎ Qaytarish' : "✕ Yo'q"}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Summary + actions */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start print:hidden">
          <div className="glass-strong space-y-4 rounded-2xl p-5">
            <h3 className="font-semibold">Xulosa</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Mahsulotlar</span>
                <span>{items.filter((i) => i.isAvailable !== false).length} ta</span>
              </div>
              {unavailableCount > 0 && (
                <div className="flex justify-between text-rose-300">
                  <span>Yo'q (chiqarildi)</span>
                  <span>{unavailableCount} ta</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Olib ketish</span>
                <span className="text-brand-300">Do'kondan</span>
              </div>
            </div>
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Jami</span>
                <span className="text-2xl font-extrabold text-brand-300 tabular-nums">
                  {formatSom(total)}
                </span>
              </div>
            </div>

            {/* Seller/admin status controls */}
            {isStaff && forward.length > 0 && (
              <div className="space-y-2 border-t border-white/10 pt-3">
                <p className="label">Holatni o'zgartirish</p>
                {forward.map((st) => (
                  <button
                    key={st}
                    onClick={() => changeStatus(st)}
                    disabled={busy}
                    className={st === ORDER_STATUS.READY ? 'btn-primary w-full' : 'btn-ghost w-full'}
                  >
                    {statusMeta(st).icon} {statusMeta(st).label}
                  </button>
                ))}
              </div>
            )}

            {ready && (
              <button onClick={() => window.print()} className="btn-gold w-full">
                🖨️ Chekni chop etish
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn-danger w-full"
              >
                🗑️ Buyurtmani o'chirish
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Receipt — shown once ready (printable). Client's main goal. */}
      {ready && (
        <div className="mx-auto max-w-lg">
          <Receipt order={order} />
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Buyurtmani o'chirish"
        message="Bu buyurtma butunlay o'chiriladi. Davom etilsinmi?"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-ink-950 shadow-glow print:hidden"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
