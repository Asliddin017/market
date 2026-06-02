// Small shared helpers.

/** Format a number as Uzbek so'm, e.g. 18000 -> "18 000 so'm". */
export function formatSom(value) {
  const n = Number(value) || 0
  return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`
}

/** Parse any stored timestamp (ISO string or epoch ms) to milliseconds. */
export function toTime(value) {
  if (value == null) return 0
  const t = typeof value === 'number' ? value : new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

/** Format a timestamp as a readable "DD.MM.YYYY HH:MM" (Uzbek-friendly). */
export function formatDateTime(value) {
  if (value == null || value === '') return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * Read an image File into a base64 data URL so it can be stored directly in
 * IndexedDB and rendered with <img src>. Downscales large images to keep the
 * DB small and the UI fast.
 */
export function fileToDataUrl(file, maxSize = 600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

/** Stable-ish color from a string — used for category-tinted placeholders. */
export function hueFromString(str = '') {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % 360
}
