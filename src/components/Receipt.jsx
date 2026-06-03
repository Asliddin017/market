import { formatSom, formatDateTime } from '../lib/utils'
import { formatPhone } from '../lib/phone'
import { effectivePrice, lineTotal, orderTotal, splitAvailability } from '../lib/orders'
import { canSellByPiece, isPieceMode, displayUnit } from '../lib/pricing'

// ---------------------------------------------------------------------------
// Printable receipt (chek). Shown to the client when the order is ready. The
// `.receipt-area` class is what the print stylesheet (index.css) isolates, so
// window.print() prints ONLY this block — not the navbar / buttons.
// ---------------------------------------------------------------------------

export default function Receipt({ order }) {
  const items = order?.items ?? []
  const { available, unavailable } = splitAvailability(items)
  const total = orderTotal(items)

  return (
    <div className="receipt-area glass-strong rounded-2xl p-6 text-slate-100">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">ASL ZIYO</h2>
        <p className="text-xs text-slate-400">Olib ketish cheki (pickup)</p>
        <p className="mt-1 text-xs text-slate-400">{formatDateTime(order?.readyAt || order?.createdAt)}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Buyurtma №: {String(order?.id ?? '').slice(0, 8).toUpperCase()}
        </p>
        {(order?.customerName || order?.customerPhone) && (
          <p className="mt-0.5 text-[11px] text-slate-400">
            {order?.customerName}
            {order?.customerName && order?.customerPhone && ' · '}
            {order?.customerPhone && formatPhone(order.customerPhone)}
          </p>
        )}
      </div>

      <div className="my-4 border-t border-dashed border-white/20" />

      {/* Available lines */}
      {available.length === 0 ? (
        <p className="text-center text-sm text-slate-400">Mavjud mahsulot yo'q.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="pb-2">Mahsulot</th>
              <th className="pb-2 text-right">Narx</th>
              <th className="pb-2 text-center">Soni</th>
              <th className="pb-2 text-right">Jami</th>
            </tr>
          </thead>
          <tbody>
            {available.map((it) => (
              <tr key={it.id} className="border-t border-white/5 align-top">
                <td className="py-2 pr-2">
                  {it.name}
                  {canSellByPiece(it) && (
                    <span className="ml-1 text-[10px] text-slate-400">
                      ({isPieceMode(it) ? 'dona' : 'pachka'})
                    </span>
                  )}
                  {it.unit === 'kg' && it.customPrice != null && (
                    <span className="ml-1 text-[10px] text-gold-300">(maxsus narx)</span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">{formatSom(effectivePrice(it))}</td>
                <td className="py-2 text-center tabular-nums">
                  {it.quantity} {displayUnit(it)}
                </td>
                <td className="py-2 text-right tabular-nums">{formatSom(lineTotal(it))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Excluded ("yo'q") lines */}
      {unavailable.length > 0 && (
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/5 p-3">
          <p className="text-xs font-semibold text-rose-300">Mavjud emas (yo'q):</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
            {unavailable.map((it) => (
              <li key={it.id} className="flex justify-between">
                <span className="line-through">{it.name}</span>
                <span>{it.quantity} {displayUnit(it)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="my-4 border-t border-dashed border-white/20" />

      {/* Grand total */}
      <div className="flex items-center justify-between">
        <span className="text-base font-bold">JAMI</span>
        <span className="text-2xl font-extrabold text-brand-300 tabular-nums">{formatSom(total)}</span>
      </div>

      <p className="mt-4 text-center text-[11px] text-slate-500">Xaridingiz uchun rahmat! 🛍️</p>
    </div>
  )
}
