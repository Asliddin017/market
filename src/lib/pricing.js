// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for all line/total money math.
//
// Used by: the cart store, order creation, the order-detail view, and the
// receipt. It is mirrored EXACTLY by the server-side recompute_order_total()
// trigger in supabase/piece_pricing.sql — if you change a rule here, change the
// SQL too, or client and server totals will drift.
//
// Two rules live here:
//   CHANGE A — a custom (override) price is honored ONLY for unit = 'kg'
//     (scale-weighed goods, e.g. kazy, kolbasa). For 'dona' (whole package) the
//     price is FIXED; any custom_price is ignored.
//   CHANGE B — products flagged sold_by_piece (cigarettes) can be sold as a
//     PACK (pachka, = the normal product price) or per PIECE (dona). Piece
//     pricing optionally has a bundle discount:
//       bundleQty set -> floor(N/bundleQty)*bundlePrice + (N % bundleQty)*piecePrice
//       else          -> N * piecePrice
// ---------------------------------------------------------------------------

import { formatSom } from './utils'

export const SELL_MODE = { PACK: 'pachka', PIECE: 'dona' }

const num = (v, d = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

// Field accessors tolerant of BOTH shapes: cart lines ({ qty, price }) and
// order items ({ quantity, originalPrice }). Everything else shares names.
const qtyOf = (i) => Math.max(0, Math.floor(num(i?.quantity ?? i?.qty, 0)))
const packPriceOf = (i) => num(i?.originalPrice ?? i?.price, 0)
const customOf = (i) =>
  i?.customPrice != null && i?.customPrice !== '' ? num(i.customPrice, 0) : null

/** CHANGE A: a custom (override) price is allowed ONLY for kg (scale) items. */
export function canEditPrice(item) {
  return item?.unit === 'kg'
}

/** CHANGE B: this product/line can be sold per-piece (dona) or per-pack. */
export function canSellByPiece(item) {
  return Boolean(item?.soldByPiece)
}

/** Is this line currently priced per single piece (dona mode)? */
export function isPieceMode(item) {
  return canSellByPiece(item) && item?.sellMode === SELL_MODE.PIECE
}

/**
 * Money for N pieces under the bundle rules. `cfg` = { piecePrice,
 * pieceBundleQty, pieceBundlePrice }.
 */
export function piecesTotal(qty, cfg = {}) {
  const n = Math.max(0, Math.floor(num(qty, 0)))
  const pp = num(cfg.piecePrice, 0)
  const bq = cfg.pieceBundleQty != null ? num(cfg.pieceBundleQty, 0) : 0
  const bp = cfg.pieceBundlePrice != null ? num(cfg.pieceBundlePrice, 0) : 0
  if (bq > 0) return Math.floor(n / bq) * bp + (n % bq) * pp
  return n * pp
}

/**
 * Effective UNIT price for DISPLAY (per kg / dona / pachka). In piece (dona)
 * mode this is the single-piece price — the bundle discount shows up in the
 * line total, not the unit price. For kg the custom override wins; otherwise
 * it's the real pack/product price.
 */
export function unitPrice(item) {
  if (isPieceMode(item)) return num(item?.piecePrice, 0)
  if (canEditPrice(item)) {
    const c = customOf(item)
    if (c != null) return c
  }
  return packPriceOf(item)
}

/** Money for ONE line (quantity applied + all rules). */
export function lineTotal(item) {
  if (isPieceMode(item)) {
    return piecesTotal(qtyOf(item), {
      piecePrice: item.piecePrice,
      pieceBundleQty: item.pieceBundleQty,
      pieceBundlePrice: item.pieceBundlePrice,
    })
  }
  return unitPrice(item) * qtyOf(item)
}

/** Grand total of a cart / order — only available lines count. */
export function total(items = []) {
  return items
    .filter((i) => i.isAvailable !== false)
    .reduce((sum, i) => sum + lineTotal(i), 0)
}

/** Unit word to show for a line: pachka / dona for cigarettes, else the unit. */
export function displayUnit(item) {
  if (canSellByPiece(item)) return item?.sellMode === SELL_MODE.PIECE ? 'dona' : 'pachka'
  return item?.unit || 'dona'
}

/**
 * Human label for per-piece pricing, e.g. "Dona (2 000 so'm, 3 ta = 5 000 so'm)"
 * or "Dona (1 000 so'm)" for the flat specials.
 */
export function pieceModeLabel(item) {
  const pp = num(item?.piecePrice, 0)
  const bq = item?.pieceBundleQty != null ? num(item.pieceBundleQty, 0) : 0
  const bp = item?.pieceBundlePrice != null ? num(item.pieceBundlePrice, 0) : 0
  return bq > 0 && bp > 0
    ? `Dona (${formatSom(pp)}, ${bq} ta = ${formatSom(bp)})`
    : `Dona (${formatSom(pp)})`
}
