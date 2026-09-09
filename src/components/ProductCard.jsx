import { memo, useState } from 'react'
import ProductImage from './ProductImage'
import { formatSom, formatDateTime, toTime } from '../lib/utils'
import { SELL_MODE, canSellByPiece, pieceModeLabel } from '../lib/pricing'

// ---------------------------------------------------------------------------
// Product card. Performance-first: NO per-card motion values / springs / JS
// mouse tracking (24+ of those on a page made weak phones stutter). The hover
// lift + glow is pure CSS (transform + box-shadow, GPU-composited) and the
// component is memoised so a list re-render only repaints cards whose props
// actually changed.
// ---------------------------------------------------------------------------

function ProductCard({
  product,
  categoryName,
  categoryIcon,
  canManage,
  canDelete,
  canAddToCart,
  onEdit,
  onDelete,
  onAddToCart,
}) {
  const byPiece = canSellByPiece(product)
  // Chosen sell mode for piece-products (cigarettes): pack (pachka) or piece (dona).
  const [mode, setMode] = useState(SELL_MODE.PACK)

  return (
    <div className="card-enter group relative rounded-3xl transition-transform duration-300 ease-out will-change-transform hover:-translate-y-1">
      <div className="glass relative overflow-hidden rounded-3xl shadow-card transition-shadow duration-300 group-hover:shadow-glow">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <ProductImage product={product} categoryIcon={categoryIcon} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />

          {/* Category chip */}
          <span className="absolute left-3 top-3 rounded-full bg-ink-950/70 px-2.5 py-1 text-[11px] font-semibold text-brand-200">
            {categoryIcon} {categoryName}
          </span>
        </div>

        {/* Body */}
        <div className="relative space-y-3 p-4">
          <h3 className="line-clamp-2 min-h-[2.75rem] font-semibold leading-snug">
            {product.name}
          </h3>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-lg font-bold text-brand-300">{formatSom(product.price)}</p>
              <p className="text-xs text-slate-400">
                {byPiece ? '1 pachka uchun' : `1 ${product.unit} uchun`}
              </p>
            </div>

            {canAddToCart && (
              <button
                onClick={() => onAddToCart?.(product, byPiece ? { sellMode: mode } : undefined)}
                className="btn-primary px-3 py-2 text-xs"
              >
                🛒 Savatga
              </button>
            )}
          </div>

          {/* Cigarettes: choose Pachka (pack) or Dona (per-piece) before adding */}
          {byPiece && canAddToCart && (
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMode(SELL_MODE.PACK)}
                  className={`chip justify-center ${mode === SELL_MODE.PACK ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/5 text-slate-300'}`}
                >
                  📦 Pachka
                </button>
                <button
                  type="button"
                  onClick={() => setMode(SELL_MODE.PIECE)}
                  className={`chip justify-center ${mode === SELL_MODE.PIECE ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/5 text-slate-300'}`}
                >
                  🚬 Dona
                </button>
              </div>
              <p className="text-[10px] leading-tight text-slate-400">
                {mode === SELL_MODE.PIECE ? pieceModeLabel(product) : `Pachka: ${formatSom(product.price)}`}
              </p>
            </div>
          )}

          {/* Timestamp — shows "updated" when the product was edited later. */}
          <p className="text-[10px] leading-tight text-slate-500">
            {toTime(product.updatedAt) > toTime(product.createdAt)
              ? `✎ Tahrirlangan: ${formatDateTime(product.updatedAt)}`
              : `➕ Qo'shilgan: ${formatDateTime(product.createdAt)}`}
          </p>

          {/* Manage actions */}
          {(canManage || canDelete) && (
            <div className="flex gap-2 pt-1">
              {canManage && (
                <button onClick={() => onEdit?.(product)} className="btn-ghost flex-1 px-3 py-2 text-xs">
                  ✏️ Tahrirlash
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete?.(product)} className="btn-danger px-3 py-2 text-xs">
                  🗑️
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(ProductCard)
