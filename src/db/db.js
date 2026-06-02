import Dexie from 'dexie'
import productsData from '../data/products.json'
import { hashPassword } from '../lib/auth'

// ---------------------------------------------------------------------------
// ASL_ZIYO local database (IndexedDB via Dexie).
//
// Tables:
//   users      — accounts (username unique, hashed password, role, createdAt)
//   categories — product categories (createdAt)
//   products   — products (price-focused, createdAt + updatedAt, no stock)
//   carts      — one saved cart per user (keyed by userId, updatedAt)
// ---------------------------------------------------------------------------

export const db = new Dexie('asl_ziyo')

// v1/v2 — legacy schemas (kept so older installs migrate cleanly).
db.version(1).stores({
  categories: '++id, name, slug',
  products: '++id, name, categoryId, price, unit, stock, createdAt',
})
db.version(2).stores({
  categories: '++id, name, slug',
  products: '++id, name, categoryId, price, unit, createdAt',
})
// v3 — accounts, per-user carts and timestamps everywhere.
db.version(3).stores({
  users: '++id, &username, role, createdAt',
  categories: '++id, name, slug, createdAt',
  products: '++id, name, categoryId, price, unit, createdAt, updatedAt',
  carts: 'userId, updatedAt',
})

export const UNITS = [
  { value: 'dona', label: 'dona' },
  { value: 'kg', label: 'kg' },
  { value: 'litr', label: 'litr' },
]

// Default seeded accounts (passwords are hashed before storage).
export const SEED_USERS = [
  { username: 'Asliddin017', password: 'root123', role: 'admin' },
  { username: 'seller', password: 'seller123', role: 'seller' },
]

// Emoji per imported category (falls back to 📦 for anything unmapped).
const CATEGORY_ICONS = {
  'Tagaklar (Pampers)': '🍼',
  'Pishirilgan kolbasa': '🥓',
  'Dudlangan kolbasa': '🥩',
  "Go'sht mahsulotlari": '🍖',
  Sosiska: '🌭',
  Pishloq: '🧀',
  Sigaretlar: '🚬',
  Muzqaymoq: '🍦',
  'Muzlatilgan mahsulotlar': '🧊',
  Ichimliklar: '🧃',
  'Energetik ichimliklar': '⚡',
}

/** Build a URL-safe slug from a (possibly Cyrillic) category name. */
export function slugify(name = '') {
  const base = String(name)
    .toLowerCase()
    .replace(/[`'ʻʼ’()]/g, '')
    .replace(/[^a-z0-9\s-]/g, '') // drop non-latin (Cyrillic) chars
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `kat-${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// One-time data import: wipe any demo data and load the real products.json.
// Guarded by a localStorage flag so it runs exactly once per browser; after
// that the user's own edits/additions are preserved.
// ---------------------------------------------------------------------------
async function importRealDataOnce() {
  const FLAG = 'asl_ziyo_data_v3'
  try {
    if (localStorage.getItem(FLAG)) return
  } catch {
    /* localStorage unavailable — proceed */
  }

  await db.transaction('rw', db.categories, db.products, async () => {
    // Wipe previous (demo) data.
    await db.products.clear()
    await db.categories.clear()

    const now = Date.now()
    const nameToId = {}
    let ci = 0
    for (const name of productsData.categories) {
      const id = await db.categories.add({
        name,
        slug: slugify(name),
        icon: CATEGORY_ICONS[name] ?? '📦',
        createdAt: new Date(now + ci++).toISOString(),
      })
      nameToId[name] = id
    }

    let pi = 0
    for (const p of productsData.products) {
      const categoryId = nameToId[p.category]
      if (categoryId == null) continue // skip products with unknown category
      const iso = new Date(now + pi++).toISOString()
      await db.products.add({
        name: p.name,
        categoryId,
        price: Number(p.price) || 0,
        unit: p.unit || 'dona',
        image: null,
        createdAt: iso,
        updatedAt: iso,
      })
    }
  })

  try {
    localStorage.setItem(FLAG, '1')
  } catch {
    /* ignore */
  }
}

/** Ensure the default admin + seller accounts exist (idempotent). */
async function seedUsersOnce() {
  // Hash OUTSIDE the Dexie transaction (awaiting foreign promises inside a
  // Dexie tx is unsafe). Only add accounts that don't already exist.
  const toAdd = []
  for (const u of SEED_USERS) {
    const exists = await db.users.where('username').equals(u.username).count()
    if (!exists) {
      toAdd.push({
        username: u.username,
        passwordHash: await hashPassword(u.password),
        role: u.role,
        createdAt: new Date().toISOString(),
      })
    }
  }
  if (toAdd.length) await db.users.bulkAdd(toAdd)
}

// Shared promise so the whole init runs exactly once per page load, even if
// called concurrently (React StrictMode mounts effects twice in dev).
let initPromise = null

/** Import real data (once) and ensure seeded accounts. Safe to call repeatedly. */
export function initDb() {
  if (!initPromise) {
    initPromise = (async () => {
      await importRealDataOnce()
      await seedUsersOnce()
    })()
  }
  return initPromise
}
