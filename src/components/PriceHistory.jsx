import { useEffect, useState } from 'react'
import { getPriceHistory } from '../hooks/useData'
import { formatSom, formatDateTime } from '../lib/utils'

/**
 * "Narx tarixi" — shows the recorded price changes for a product (newest
 * first). Rows are written automatically by a DB trigger whenever the price
 * changes (see supabase/schema.sql). Loading / empty / error states handled.
 */
export default function PriceHistory({ productId }) {
  const [state, setState] = useState({ rows: undefined, error: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setState({ rows: undefined, error: null })
    getPriceHistory(productId)
      .then((rows) => active && setState({ rows, error: null }))
      .catch((error) => {
        console.error('[PriceHistory] load failed:', error)
        if (active) setState({ rows: undefined, error })
      })
    return () => {
      active = false
    }
  }, [productId, reloadKey])

  const { rows, error } = state

  return (
    <div className="rounded-xl border border-white/10 bg-ink-950/40 p-3">
      <p className="mb-2 text-xs font-semibold text-slate-300">📈 Narx tarixi</p>
      {error ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-rose-300">Tarixni yuklab bo'lmadi.</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="btn-ghost px-2.5 py-1 text-xs"
          >
            🔄 Qayta urinish
          </button>
        </div>
      ) : rows === undefined ? (
        <p className="text-xs text-slate-500">Yuklanmoqda…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-slate-500">Hozircha narx o'zgarmagan.</p>
      ) : (
        <ul className="max-h-32 space-y-1 overflow-auto">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{formatDateTime(r.changedAt)}</span>
              <span className="text-slate-300">
                {r.oldPrice != null && (
                  <span className="text-slate-500 line-through">{formatSom(r.oldPrice)}</span>
                )}{' '}
                <span className="font-semibold text-brand-300">{formatSom(r.newPrice)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
