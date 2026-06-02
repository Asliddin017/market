import { useUiStore } from '../store/uiStore'
import { CATEGORY_THEMES, THEME_KEYS } from '../lib/categoryThemes'

// ---------------------------------------------------------------------------
// App-wide animated background. Performance-first:
//  - one fixed layer per theme, crossfaded with opacity only (GPU compositing)
//  - "blobs" are radial-gradients (no expensive filter: blur)
//  - blob transforms animate ONLY on the active layer (hidden layers idle)
//  - honours prefers-reduced-motion (animations disabled globally in index.css)
// ---------------------------------------------------------------------------

export default function CategoryBackground() {
  const themeKey = useUiStore((s) => s.themeKey)

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950" aria-hidden="true">
      {THEME_KEYS.map((key) => {
        const theme = CATEGORY_THEMES[key]
        const active = key === themeKey
        return (
          <div
            key={key}
            className="absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none"
            style={{ opacity: active ? 1 : 0 }}
          >
            <div className="absolute inset-0" style={{ background: theme.base }} />
            {theme.blobs.map((b, i) => (
              <div
                key={i}
                className={`absolute rounded-full will-change-transform ${active ? 'animate-blob motion-reduce:animate-none' : ''}`}
                style={{
                  background: b.background,
                  left: b.left,
                  top: b.top,
                  width: b.width,
                  height: b.height,
                  animationDelay: b.delay,
                }}
              />
            ))}
          </div>
        )
      })}

      {/* Readability veil so foreground text always has enough contrast. */}
      <div className="absolute inset-0 bg-ink-950/45" />
    </div>
  )
}
