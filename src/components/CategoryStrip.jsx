// ---------------------------------------------------------------------------
// Horizontal, thumb-scrollable category strip (icons + names). With ~50
// sections a wrapping chip wall pushed the products off the phone screen;
// a single swipeable row keeps the list one flick away on every screen size,
// so the sticky search + strip never eat the viewport.
// ---------------------------------------------------------------------------
export default function CategoryStrip({ categories = [], activeId = null, onSelect, counts }) {
  const chip = (active) =>
    `chip shrink-0 snap-start whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm ${
      active
        ? 'border-brand-400/60 bg-brand-500/20 text-brand-100 shadow-glow'
        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
    }`
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      <button type="button" onClick={() => onSelect?.(null)} className={chip(activeId == null)}>
        🌐 Barchasi
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect?.(activeId === c.id ? null : c.id)}
          className={chip(activeId === c.id)}
          aria-pressed={activeId === c.id}
        >
          <span>{c.icon}</span>
          <span>{c.name}</span>
          {counts && counts.get(c.id) != null && (
            <span className="rounded-full bg-white/10 px-1.5 text-[10px] text-slate-400">{counts.get(c.id)}</span>
          )}
        </button>
      ))}
    </div>
  )
}
