import { useState } from 'react'
import { hueFromString } from '../lib/utils'

/**
 * Renders a product image, or a clean tinted placeholder (with the category
 * icon) when no image was uploaded. If a stored image URL fails to load
 * (deleted file, offline), we fall back to the same placeholder instead of
 * showing a broken-image icon. Images are lazy-loaded so long lists stay fast.
 */
export default function ProductImage({ product, categoryIcon = '📦', className = '' }) {
  // The URL that failed to load; a replaced/removed image is a new URL, so the
  // fallback resets by itself without an effect.
  const [failedSrc, setFailedSrc] = useState(null)
  const failed = failedSrc != null && failedSrc === product.image

  if (product.image && !failed) {
    return (
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(product.image)}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }

  const hue = hueFromString(product.name)
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} var(--ph-s) var(--ph-l1)), hsl(${(hue + 40) % 360} var(--ph-s) var(--ph-l2)))`,
      }}
    >
      <span className="text-5xl opacity-80 drop-shadow-lg">{categoryIcon}</span>
    </div>
  )
}
