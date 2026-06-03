// Shared, framework-free constants (safe to import from both the browser app
// and the Node seed script).

export const UNITS = [
  { value: 'dona', label: 'dona' },
  { value: 'kg', label: 'kg' },
  { value: 'litr', label: 'litr' },
]

// Emoji per imported category (falls back to 📦 for anything unmapped).
export const CATEGORY_ICONS = {
  'Tagaklar (Pampers)': '🍼',
  'Pishirilgan kolbasa': '🥓',
  'Dudlangan kolbasa': '🥩',
  "Go'sht mahsulotlari": '🍖',
  Sosiska: '🌭',
  Pishloq: '🧀',
  Sigaretlar: '🚬',
  Muzqaymoq: '🍦',
  'Muzlatilgan mahsulotlar': '🧊',
  // Drinks, split by package type.
  Ichimliklar: '🧃',
  'Ichimliklar — Baklashka': '🧴',
  'Ichimliklar — Banka': '🥤',
  'Ichimliklar — Butulka': '🍾',
  // Energy drinks, split by package type.
  'Energetik ichimliklar': '⚡',
  'Energetik — Banka': '⚡',
  'Energetik — Baklashka': '⚡',
}
