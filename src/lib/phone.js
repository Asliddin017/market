// ---------------------------------------------------------------------------
// Uzbek phone-number validation + normalization (framework-free, pure).
//
// Accepts the common ways people type an Uzbek mobile number and folds them to a
// single canonical form "+998XXXXXXXXX" (9 local digits):
//   +998 50 017 00 99 / +998500170099 / 998500170099 / 500170099
// Spaces, dashes, parens and dots are ignored. Anything else -> invalid (null).
// ---------------------------------------------------------------------------

/**
 * Normalize a phone string to "+998XXXXXXXXX", or null if it isn't a valid
 * Uzbek number.
 */
export function normalizePhone(raw) {
  if (raw == null) return null
  const digits = String(raw).replace(/\D/g, '')
  let local = null
  if (digits.length === 12 && digits.startsWith('998')) local = digits.slice(3)
  else if (digits.length === 9) local = digits
  else return null
  if (!/^\d{9}$/.test(local)) return null
  return `+998${local}`
}

/** True when `raw` is a valid Uzbek phone number. */
export function isValidUzPhone(raw) {
  return normalizePhone(raw) != null
}

/** Pretty form for display, e.g. "+998 50 017 00 99". Falls back to the input. */
export function formatPhone(raw) {
  const n = normalizePhone(raw)
  if (!n) return String(raw ?? '')
  const d = n.slice(4) // 9 local digits
  return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`
}

/** Value for a tel: link (no spaces). Falls back to the digits we have. */
export function telHref(raw) {
  return normalizePhone(raw) ?? `+${String(raw ?? '').replace(/\D/g, '')}`
}
