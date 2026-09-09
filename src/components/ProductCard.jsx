import { memo, useState } from 'react'
import ProductImage from './ProductImage'
import { formatSom, formatDateTime, toTime } from '../lib/utils'
import { SELL_MODE, canSellByPiece, pieceModeLabel } from '../lib/pricing'

// ---------------------------------------------------------------------------
// Storefront product card.
//
// * Compact: works in a 2-column grid on phones (square image, 2-line name,
//   price + unit, one action row).
// * Shopping-first: when the product is already in the cart the action row
//   turns into a  [−  qty  +]  stepper right on the card — no trip to the cart
//   to change a quantity. Cigarettes keep the Pachka / Dona choice.
// * Performance-first: pure CSS hover/enter (no per-card motion values) and
//   memoised, so a list re-render only repaints cards whose props changed.
// ---------------------------------------------------------------------------

function ProductCard({
  product,
  categoryName,
  categoryIcon,
  canManage,
  canDelete,
  canAddToCart,
  cartQty = 0,
  onEdit,
  onDelete,
  onAddToCart,
  onIncrement,
  onDecrement,
}) {
  const byPiece = canSellByPiece(product)
  const [mode, setMode] = useState(SELL_MODE.PACK)
  const inCart = cartQty > 0
  const isKg = product.unit === 'kg'

  return (
    <article className="card-enter group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-card transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-brand-400/40 hover:shadow-glow lg:bg-white/5 lg:backdrop-blur-xl">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-ink-900/40">
        <ProductImage product={product} categoryIcon={categoryIcon} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950/70 to-transparent" />

        {/* Category chip */}
        <span className="absolute left-2 top-2 max-w-[85%] truncate rounded-full bg-ink-950/75 px-2 py-0.5 text-[10px] font-semibold text-brand-200 sm:text-[11px]">
          {categoryIcon} {categoryName}
        </span>

        {/* In-cart badge */}
        {inCart && (
          <span className="absolute right-2 top-2 rounded-full bg-gold-500 px-2 py-0.5 text-[11px] font-extrabold text-ink-950 shadow">
            {cartQty} {byPiece ? '' : product.unit}
          </span>
        )}

        {/* Staff actions (hover on desktop, always on touch) */}
        {(canManage || canDelete) && (
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
            {canManage && (
              <button
                onClick={() => onEdit?.(product)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-950/80 text-sm hover:bg-brand-500 hover:text-ink-950"
                title="Tahrirlash"
                aria-label="Tahrirlash"
              >
                ✏️
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete?.(product)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-950/80 text-sm hover:bg-rose-500"
                title="O'chirish"
                aria-label="O'chirish"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug sm:text-base">
          {product.name}
        </h3>

        <div className="mt-auto flex items-baseline gap-1">
          <p className="text-base font-extrabold tracking-tight text-brand-300 sm:text-lg">
            {formatSom(product.price)}
          </p>
          <p className="text-[11px] text-slate-400">/ {byPiece ? 'pachka' : product.unit}</p>
        </div>

        {/* Cigarettes: Pachka / Dona before adding */}
        {byPiece && canAddToCart && !inCart && (
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setMode(SELL_MODE.PACK)}
              className={`chip justify-center px-2 py-1 text-[11px] ${mode === SELL_MODE.PACK ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/5 text-slate-300'}`}
            >
              📦 Pachka
            </button>
            <button
              type="button"
              onClick={() => setMode(SELL_MODE.PIECE)}
              className={`chip justify-center px-2 py-1 text-[11px] ${mode === SELL_MODE.PIECE ? 'border-brand-400/60 bg-brand-500/15 text-brand-200' : 'border-white/10 bg-white/5 text-slate-300'}`}
              title={pieceModeLabel(product)}
            >
              🚬 Dona
            </button>
          </div>
        )}

        {/* Action row */}
        {canAddToCart &&
          (inCart ? (
            <div className="flex items-center justify-between rounded-xl border border-brand-400/40 bg-brand-500/10 p-1">
              <button
                type="button"
                onClick={() => onDecrement?.(product)}
                className="h-9 w-9 rounded-lg bg-white/10 text-lg leading-none hover:bg-white/20"
                aria-label="Kamaytirish"
              >
                −
              </button>
              <span className="min-w-[2.5rem] text-center text-sm font-bold tabular-nums">
                {cartQty}
                {isKg && <span className="ml-0.5 text-[10px] font-normal text-slate-400">kg</span>}
              </span>
              <button
                type="button"
                onClick={() => onIncrement?.(product)}
                className="h-9 w-9 rounded-lg bg-brand-500 text-lg font-bold leading-none text-ink-950 hover:brightness-110"
                aria-label="Ko'paytirish"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => onAddToCart?.(product, byPiece ? { sellMode: mode } : undefined)}
              className="btn-primary w-full py-2 text-xs sm:text-sm"
            >
              🛒 Savatga
            </button>
          ))}

        {canManage && (
          <p className="text-[10px] leading-tight text-slate-500">
            {toTime(product.updatedAt) > toTime(product.createdAt)
              ? `✎ ${formatDateTime(product.updatedAt)}`
              : `➕ ${formatDateTime(product.createdAt)}`}
          </p>
        )}
      </div>
    </article>
  )
}

export default memo(ProductCard)
