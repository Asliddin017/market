// ---------------------------------------------------------------------------
// Product image storage (Supabase Storage).
//
// Images live in the PUBLIC "product-images" bucket — NOT as base64 in the DB —
// so the catalogue stays small and fast. We store only the public URL in
// products.image_url. Uploads are compressed/resized client-side first (canvas
// -> JPEG) so they stay tiny and upload fast on slow phone connections.
//
// Write access (upload/replace/remove) is restricted to admin & seller by the
// Storage RLS policies in supabase/storage.sql (which reuse current_app_role()).
// Public READ is open, so <img src> works for everyone without a token.
//
// The pure helpers (storagePathFromPublicUrl / isStoredImageUrl / buildImagePath)
// are framework-free and unit-tested.
// ---------------------------------------------------------------------------

import { supabase } from './supabase'

export const PRODUCT_IMAGES_BUCKET = 'product-images'

/**
 * Compress + resize an image File to a small JPEG Blob via an offscreen canvas.
 * Caps the longest edge at `maxSize` px (never upscales). Keeps uploads fast.
 *
 * @returns {Promise<Blob>} the JPEG blob.
 */
export function compressImage(file, { maxSize = 800, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Faylni o‘qib bo‘lmadi'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Rasmni o‘qib bo‘lmadi'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Rasmni siqib bo‘lmadi'))),
          'image/jpeg',
          quality,
        )
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Build a unique object path for a product image, e.g.
 * "<productId>/1717500000000-x7a9k2.jpg". A productId-less (new) product uses
 * "new/..." until it's saved; the timestamp + random suffix keep it unique so a
 * re-upload never collides with the previous file.
 */
export function buildImagePath(productId) {
  const base = String(productId || 'new').replace(/[^a-zA-Z0-9_-]/g, '') || 'new'
  const rand = Math.random().toString(36).slice(2, 8)
  return `${base}/${Date.now()}-${rand}.jpg`
}

/**
 * Extract the in-bucket object path from a public URL. Pure + testable.
 * Returns null for non-storage URLs (e.g. legacy base64 `data:` URLs), so
 * callers can safely skip Storage deletes for those.
 */
export function storagePathFromPublicUrl(url) {
  if (typeof url !== 'string') return null
  const marker = `/${PRODUCT_IMAGES_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  const path = url.slice(i + marker.length).split('?')[0]
  return path ? decodeURIComponent(path) : null
}

/** True when `url` points at a file in our Storage bucket (vs base64 / empty). */
export function isStoredImageUrl(url) {
  return storagePathFromPublicUrl(url) != null
}

/**
 * Compress + upload an image File and return its public URL.
 * @param {File} file
 * @param {{ productId?: string }} opts
 * @returns {Promise<string>} the public URL to store in products.image_url.
 */
export async function uploadProductImage(file, { productId } = {}) {
  const blob = await compressImage(file)
  const path = buildImagePath(productId)
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Best-effort delete of a previously-uploaded image. No-op for non-storage URLs
 * (legacy base64). A failed delete is logged but never thrown — losing a stray
 * file should not block saving/deleting a product.
 */
export async function deleteProductImage(url) {
  const path = storagePathFromPublicUrl(url)
  if (!path) return
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path])
  if (error) console.error('[storage] rasmni o‘chirib bo‘lmadi (e’tiborsiz qoldirildi):', error.message)
}
