import { create } from 'zustand'

// Tiny UI store holding the active background theme key. Pages set this; the
// app-wide <CategoryBackground /> reads it and crossfades. Not persisted — it's
// purely presentational and derived from navigation.
export const useUiStore = create((set) => ({
  themeKey: 'default',
  setThemeKey: (themeKey) => set({ themeKey }),
}))
