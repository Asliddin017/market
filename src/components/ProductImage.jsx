import { useEffect, useState } from 'react'
import { hueFromString } from '../lib/utils'

/**
 * Renders a product image, or a clean tinted placeholder (with the category
 * icon) when no image was uploaded. If a stored image URL fails to load
 * (deleted file, offline), we fall back to the same placeholder instead of
 * showing a broken-image icon. Images are lazy-loaded so long lists stay fast.
 */
export default function ProductImage({ product, categoryIcon = '📦', className = '' }) {
  const [failed, setFailed] = useState(false)

  // Reset the error flag when the source changes (e.g. image replaced/removed).
  useEffect(() => {
    setFailed(false)
  }, [product.image])

  if (product.image && !failed) {
    return (
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }

  const hue = hueFromString(product.name)
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 45% 22%), hsl(${(hue + 40) % 360} 55% 14%))`,
      }}
    >
      <span className="text-5xl opacity-80 drop-shadow-lg">{categoryIcon}</span>
    </div>
  )
}
