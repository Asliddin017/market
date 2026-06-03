import { formatSom } from '../lib/utils'

// ---------------------------------------------------------------------------
// Tiny dependency-free bar chart (pure SVG). Stretches to its container width
// via a 0..100 viewBox with non-uniform scaling, so it stays sharp and cheap —
// no chart library, no canvas. Each bar has a <title> for hover tooltips.
// ---------------------------------------------------------------------------

export default function MiniBarChart({ data = [], height = 160 }) {
  if (!data.length) return null
  const max = Math.max(1, ...data.map((d) => Number(d.revenue) || 0))
  const n = data.length
  const barW = 100 / n
  const gap = Math.min(barW * 0.25, 1)

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="So'nggi kunlardagi daromad"
    >
      {data.map((d, i) => {
        const v = Number(d.revenue) || 0
        const h = max > 0 ? (v / max) * 100 : 0
        return (
          <rect
            key={d.day ?? i}
            x={i * barW + gap / 2}
            y={100 - h}
            width={Math.max(barW - gap, 0.2)}
            height={h}
            className="fill-brand-400/70"
          >
            <title>{`${d.day}: ${formatSom(v)}`}</title>
          </rect>
        )
      })}
    </svg>
  )
}
