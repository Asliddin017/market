import { statusMeta } from '../lib/orders'

/** Colored pill showing an order's status (Uzbek label). */
export default function OrderStatusBadge({ status, className = '' }) {
  const meta = statusMeta(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.badge} ${className}`}
    >
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  )
}
