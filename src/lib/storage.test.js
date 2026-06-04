import { describe, it, expect } from 'vitest'
import {
  PRODUCT_IMAGES_BUCKET,
  buildImagePath,
  storagePathFromPublicUrl,
  isStoredImageUrl,
} from './storage'

const PUBLIC =
  `https://xyz.supabase.co/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/abc/123-x7a9k2.jpg`

describe('storagePathFromPublicUrl', () => {
  it('extracts the in-bucket object path from a public URL', () => {
    expect(storagePathFromPublicUrl(PUBLIC)).toBe('abc/123-x7a9k2.jpg')
  })

  it('strips a query string (e.g. cache-busting / transform params)', () => {
    expect(storagePathFromPublicUrl(`${PUBLIC}?width=200`)).toBe('abc/123-x7a9k2.jpg')
  })

  it('decodes percent-encoded path segments', () => {
    const url = `https://x.supabase.co/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/new/a%20b.jpg`
    expect(storagePathFromPublicUrl(url)).toBe('new/a b.jpg')
  })

  it('returns null for legacy base64 data URLs', () => {
    expect(storagePathFromPublicUrl('data:image/jpeg;base64,/9j/4AAQSkZJR'.repeat(1))).toBeNull()
  })

  it('returns null for null / empty / non-string / unrelated URLs', () => {
    expect(storagePathFromPublicUrl(null)).toBeNull()
    expect(storagePathFromPublicUrl('')).toBeNull()
    expect(storagePathFromPublicUrl(undefined)).toBeNull()
    expect(storagePathFromPublicUrl(123)).toBeNull()
    expect(storagePathFromPublicUrl('https://example.com/photo.jpg')).toBeNull()
  })
})

describe('isStoredImageUrl', () => {
  it('is true only for URLs in our bucket', () => {
    expect(isStoredImageUrl(PUBLIC)).toBe(true)
    expect(isStoredImageUrl('data:image/jpeg;base64,xxxx')).toBe(false)
    expect(isStoredImageUrl(null)).toBe(false)
  })
})

describe('buildImagePath', () => {
  it('namespaces by productId and ends in .jpg', () => {
    const path = buildImagePath('prod-1')
    expect(path).toMatch(/^prod-1\/\d+-[a-z0-9]+\.jpg$/)
  })

  it('falls back to "new/" when there is no productId', () => {
    expect(buildImagePath()).toMatch(/^new\/\d+-[a-z0-9]+\.jpg$/)
    expect(buildImagePath(null)).toMatch(/^new\//)
  })

  it('sanitises unsafe characters out of the productId segment', () => {
    expect(buildImagePath('../../etc')).toMatch(/^etc\//)
  })

  it('produces a unique path on each call', () => {
    expect(buildImagePath('p')).not.toBe(buildImagePath('p'))
  })
})
