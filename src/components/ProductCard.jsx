import { useRef, useState } from 'react'
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'
import ProductImage from './ProductImage'
import { formatSom, formatDateTime, toTime } from '../lib/utils'

// ---------------------------------------------------------------------------
// Glassmorphic product card with a real 3D tilt that follows the cursor.
// Pointer movement drives rotateX/rotateY (spring-smoothed) plus a moving
// specular highlight, giving genuine depth without a WebGL canvas per card.
// ---------------------------------------------------------------------------

export default function ProductCard({
  product,
  categoryName,
  categoryIcon,
  canManage,
  canDelete,
  canAddToCart,
  onEdit,
  onDelete,
  onAddToCart,
}) {
  const ref = useRef(null)
  const [hovered, setHovered] = useState(false)

  // Raw pointer position (0..1 within the card).
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)

  const rotateX = useSpring(useMotionValue(0), { stiffness: 150, damping: 15 })
  const rotateY = useSpring(useMotionValue(0), { stiffness: 150, damping: 15 })

  function handleMove(e) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    px.set(x)
    py.set(y)
    rotateY.set((x - 0.5) * 16) // left/right
    rotateX.set((0.5 - y) * 16) // up/down
  }

  function handleLeave() {
    setHovered(false)
    rotateX.set(0)
    rotateY.set(0)
    px.set(0.5)
    py.set(0.5)
  }

  const glareX = useTransform(px, (v) => `${v * 100}%`)
  const glareY = useTransform(py, (v) => `${v * 100}%`)
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.18), transparent 45%)`

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35 }}
      className="group preserve-3d relative rounded-3xl"
    >
      <div className="glass relative overflow-hidden rounded-3xl shadow-card transition-shadow duration-300 group-hover:shadow-glow">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden" style={{ transform: 'translateZ(40px)' }}>
          <ProductImage product={product} categoryIcon={categoryIcon} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />

          {/* Category chip */}
          <span className="absolute left-3 top-3 rounded-full bg-ink-950/60 px-2.5 py-1 text-[11px] font-semibold text-brand-200 backdrop-blur">
            {categoryIcon} {categoryName}
          </span>
        </div>

        {/* Body */}
        <div className="relative space-y-3 p-4" style={{ transform: 'translateZ(25px)' }}>
          <h3 className="line-clamp-2 min-h-[2.75rem] font-semibold leading-snug">
            {product.name}
          </h3>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-lg font-bold text-brand-300">{formatSom(product.price)}</p>
              <p className="text-xs text-slate-400">1 {product.unit} uchun</p>
            </div>

            {canAddToCart && (
              <button
                onClick={() => onAddToCart?.(product)}
                className="btn-primary px-3 py-2 text-xs"
              >
                🛒 Savatga
              </button>
            )}
          </div>

          {/* Timestamp — shows "updated" when the product was edited later. */}
          <p className="text-[10px] leading-tight text-slate-500">
            {toTime(product.updatedAt) > toTime(product.createdAt)
              ? `✎ Tahrirlangan: ${formatDateTime(product.updatedAt)}`
              : `➕ Qo'shilgan: ${formatDateTime(product.createdAt)}`}
          </p>

          {/* Manage actions */}
          {(canManage || canDelete) && (
            <div className="flex gap-2 pt-1">
              {canManage && (
                <button onClick={() => onEdit?.(product)} className="btn-ghost flex-1 px-3 py-2 text-xs">
                  ✏️ Tahrirlash
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete?.(product)} className="btn-danger px-3 py-2 text-xs">
                  🗑️
                </button>
              )}
            </div>
          )}
        </div>

        {/* Moving specular glare */}
        {hovered && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{ background: glare }}
          />
        )}
      </div>
    </motion.div>
  )
}
