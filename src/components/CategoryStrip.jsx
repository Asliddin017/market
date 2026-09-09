import { hueFromString } from '../lib/utils'

// ---------------------------------------------------------------------------
// Horizontal, thumb-scrollable category TILES (big icon on a colour tile +
// name + count), marketplace style. With ~50 sections a wrapping chip wall
// pushed the products off the screen; a single swipeable row keeps the list
// one flick away and lets the search + strip stay sticky. Each tile is tinted
// by a stable hue derived from the category name (light/dark aware via CSS
// variables --tile-l / --tile-s).
// ---------------------------------------------------------------------------
export default function CategoryStrip({ categories = [], activeId = null, onSelect, counts }) {
  const tileStyle = (name) => {
    const h = hueFromString(name)
    return { background: `linear-gradient(135deg, hsl(${h} var(--tile-s) var(--tile-l)), hsl(${(h + 30) % 360} var(--tile-s) var(--tile-l2)))` }
  }
  const base =
    'group flex w-[4.75rem] shrink-0 snap-start flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-center transition sm:w-[5.5rem]'
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-1 overflow-x-auto px-3 pb-1 md:mx-0 md:px-0">
      <button
        type="button"
        onClick={() => onSelect?.(null)}
        className={`${base} ${activeId == null ? 'bg-brand-500/15 ring-1 ring-brand-400/60' : 'hover:bg-white/5'}`}
        aria-pressed={activeId == null}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-2xl shadow-glow">
          🌐
        </span>
        <span className="line-clamp-2 text-[11px] font-semibold leading-tight">Barchasi</span>
      </button>
      {categories.map((c) => {
        const active = activeId === c.id
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect?.(active ? null : c.id)}
            className={`${base} ${active ? 'bg-brand-500/15 ring-1 ring-brand-400/60' : 'hover:bg-white/5'}`}
            aria-pressed={active}
            title={c.name}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-card transition group-hover:scale-105 ${active ? 'ring-2 ring-brand-400' : ''}`}
              style={tileStyle(c.name)}
            >
              {c.icon}
            </span>
            <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{c.name}</span>
            {counts && counts.get(c.id) != null && (
              <span className="text-[10px] text-slate-400">{counts.get(c.id)} ta</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
