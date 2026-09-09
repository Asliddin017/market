import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Tiny UI store:
//   * themeKey — the active category background (pages set it; the app-wide
//     <CategoryBackground /> crossfades). Not persisted.
//   * mode — 'light' | 'dark' colour scheme, persisted in localStorage so the
//     choice survives reloads. Applied to <html class="light|dark"> by App.
// ---------------------------------------------------------------------------

const MODE_KEY = 'asl-ziyo:mode'

function readMode() {
  try {
    const v = localStorage.getItem(MODE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* storage unavailable */
  }
  return 'light' // fresh, marketplace-style default
}

export const useUiStore = create((set) => ({
  themeKey: 'default',
  setThemeKey: (themeKey) => set({ themeKey }),

  mode: readMode(),
  setMode: (mode) => {
    try {
      localStorage.setItem(MODE_KEY, mode)
    } catch {
      /* ignore */
    }
    set({ mode })
  },
  toggleMode: () =>
    set((s) => {
      const mode = s.mode === 'light' ? 'dark' : 'light'
      try {
        localStorage.setItem(MODE_KEY, mode)
      } catch {
        /* ignore */
      }
      return { mode }
    }),
}))
