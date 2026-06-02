import { hueFromString } from '../lib/utils'

/**
 * Renders a product image, or a clean tinted placeholder (with the category
 * icon) when no image was uploaded.
 */
export default function ProductImage({ product, categoryIcon = '📦', className = '' }) {
  if (product.image) {
    return (
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
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
