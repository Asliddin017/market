// Shared, framework-free constants (safe to import from both the browser app
// and the Node seed script).

export const UNITS = [
  { value: 'dona', label: 'dona' },
  { value: 'kg', label: 'kg' },
  { value: 'litr', label: 'litr' },
]

// Category emojis now live in src/lib/categoryIcons.js (resolveCategoryIcon),
// which maps a category NAME -> emoji by keyword so new categories auto-resolve.
