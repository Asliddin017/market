// ===========================================================================
// Seed: import src/data/products.json (categories + products) into Supabase.
//
// Two modes:
//   node scripts/seed.js            (default)  — UPSERT. Idempotent via the
//       unique indexes from schema.sql (categories.name and
//       products(category_id, name)); re-running won't add duplicates. It only
//       adds/updates rows — it does NOT remove rows that are no longer in the
//       JSON (e.g. old categories renamed/split stay behind).
//
//   node scripts/seed.js --clean   (npm run reseed) — CLEAN RE-SEED. Wipes the
//       existing categories + products (and the cart_items / price_history rows
//       that depend on them, FK-safe order) and inserts exactly what is in
//       products.json. Use this when categories were renamed/split so no stale
//       rows are left behind. Result is exactly the JSON contents — no
//       duplicates, no leftovers. Safe to run repeatedly.
//
// Run schema.sql FIRST.
//
// Requires (read from .env.local or the shell environment):
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   <- service_role key, bypasses RLS. Never commit.
// ===========================================================================

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { slugify, toTitleCase } from '../src/lib/utils.js'
import { CATEGORY_ICONS } from '../src/lib/constants.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// --- Minimal .env.local loader (no extra dependency) -----------------------
function loadEnvLocal() {
  const file = resolve(root, '.env.local')
  if (!existsSync(file)) return
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = val
  }
}
loadEnvLocal()

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    'Xato: VITE_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY kerak. ' +
      'Ularni .env.local ga qo‘shing yoki environmentda bering.',
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const CLEAN = process.argv.slice(2).some((a) => a === '--clean' || a === '-c')

// Delete every row of a table. Supabase requires a filter on delete(), so we
// match all rows via a timestamp column that always exists & is always set.
async function deleteAll(table, tsColumn) {
  const { error } = await supabase
    .from(table)
    .delete()
    .gte(tsColumn, '1970-01-01T00:00:00Z')
  if (error) throw error
}

// FK-safe wipe of the data we're about to re-seed. cart_items / price_history
// reference products (ON DELETE CASCADE in schema.sql), but we delete them
// explicitly first so this also works if the FKs were created differently, and
// so any cart rows pointing at products we're about to drop are cleared (the
// app would otherwise try to render carts that reference missing products).
async function clean() {
  console.log('Tozalash (clean re-seed): cart_items, price_history, products, categories...')
  await deleteAll('cart_items', 'updated_at') // clears all carts (rows would be orphaned anyway)
  await deleteAll('price_history', 'changed_at') // append-only log of soon-to-be-deleted products
  await deleteAll('products', 'created_at')
  await deleteAll('categories', 'created_at')
}

async function main() {
  const data = JSON.parse(readFileSync(resolve(root, 'src/data/products.json'), 'utf8'))
  const categoryNames = data.categories
  const products = data.products

  console.log(
    `${CLEAN ? 'CLEAN re-seed' : 'Upsert'}: ${categoryNames.length} kategoriya, ${products.length} mahsulot...`,
  )

  if (CLEAN) await clean()

  // 1) Upsert categories (unique on name) and build name -> id map.
  const categoryRows = categoryNames.map((name) => ({
    name,
    slug: slugify(name),
    emoji: CATEGORY_ICONS[name] ?? '📦',
  }))
  const { data: cats, error: catErr } = await supabase
    .from('categories')
    .upsert(categoryRows, { onConflict: 'name' })
    .select('id, name')
  if (catErr) throw catErr

  const idByName = new Map(cats.map((c) => [c.name, c.id]))

  // 2) Upsert products (unique on category_id + name).
  const productRows = []
  let skipped = 0
  for (const p of products) {
    const categoryId = idByName.get(p.category)
    if (!categoryId) {
      skipped++
      continue
    }
    productRows.push({
      name: toTitleCase(p.name),
      category_id: categoryId,
      price: Number(p.price) || 0,
      unit: p.unit || 'dona',
      image_url: null,
    })
  }

  // Insert in chunks to stay well under any payload limits.
  const CHUNK = 200
  for (let i = 0; i < productRows.length; i += CHUNK) {
    const chunk = productRows.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('products')
      .upsert(chunk, { onConflict: 'category_id,name' })
    if (error) throw error
  }

  console.log(
    `Tayyor ✓  Kategoriyalar: ${cats.length}, Mahsulotlar: ${productRows.length}` +
      (skipped ? `, o'tkazib yuborilgan (noma'lum kategoriya): ${skipped}` : ''),
  )
}

main().catch((err) => {
  console.error('Seed muvaffaqiyatsiz:', err.message ?? err)
  process.exit(1)
})
