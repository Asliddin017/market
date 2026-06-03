// ---------------------------------------------------------------------------
// Order (buyurtma) domain logic — framework-free + pure so it's unit-testable
// without Supabase. The UI and the data layer both import from here so the
// money math and status labels live in exactly one place.
//
// Pickup only — there is no delivery. The seller prepares the order; the client
// collects it. Totals count ONLY available lines and use the custom price when
// the client overrode it (else the original product price).
// ---------------------------------------------------------------------------

export const ORDER_STATUS = {
  PLACED: 'buyurtma_berildi',
  PREPARING: 'tayyorlanmoqda',
  READY: 'tayyor',
}

// Display metadata per status: Uzbek label + Tailwind badge classes + icon.
export const ORDER_STATUS_META = {
  [ORDER_STATUS.PLACED]: {
    label: 'Buyurtma berildi',
    icon: '🧾',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  },
  [ORDER_STATUS.PREPARING]: {
    label: 'Tayyorlanmoqda',
    icon: '👨‍🍳',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  },
  [ORDER_STATUS.READY]: {
    label: 'Buyurtmangiz tayyor',
    icon: '✅',
    badge: 'bg-brand-500/15 text-brand-300 border-brand-400/30',
  },
}

// Order the statuses move through (for "next step" buttons + progress).
export const ORDER_STATUS_FLOW = [
  ORDER_STATUS.PLACED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
]

/** Metadata for a status, falling back to a neutral badge for unknown values. */
export function statusMeta(status) {
  return (
    ORDER_STATUS_META[status] ?? {
      label: status ?? '—',
      icon: '•',
      badge: 'bg-white/10 text-slate-300 border-white/10',
    }
  )
}

/** The next status in the flow, or null if already at the end / unknown. */
export function nextStatus(status) {
  const i = ORDER_STATUS_FLOW.indexOf(status)
  if (i === -1 || i === ORDER_STATUS_FLOW.length - 1) return null
  return ORDER_STATUS_FLOW[i + 1]
}

/** Effective unit price for a line: the custom override, else the original. */
export function effectivePrice(item) {
  const custom = item?.customPrice
  return custom != null && custom !== '' ? Number(custom) : Number(item?.originalPrice ?? item?.price ?? 0)
}

/** Money for one line = effective unit price * quantity. */
export function lineTotal(item) {
  return effectivePrice(item) * Number(item?.quantity ?? item?.qty ?? 0)
}

/** Grand total of an order: only available lines are counted. */
export function orderTotal(items = []) {
  return items
    .filter((i) => i.isAvailable !== false)
    .reduce((sum, i) => sum + lineTotal(i), 0)
}

/** Split items into available vs. unavailable ("yo'q") for the receipt. */
export function splitAvailability(items = []) {
  const available = []
  const unavailable = []
  for (const i of items) (i.isAvailable === false ? unavailable : available).push(i)
  return { available, unavailable }
}

/** True when the client should see the printable receipt (order is ready). */
export function isReceiptReady(status) {
  return status === ORDER_STATUS.READY
}

/**
 * Normalise a user-typed custom price. Returns:
 *   null  -> empty / blank  => "use the product's real price"
 *   >= 0  -> a valid positive number
 *   undefined -> INVALID (negative / NaN) so the caller can reject it.
 */
export function normalizeCustomPrice(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (s === '') return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return undefined // invalid
  return Math.round(n)
}
