import { useEffect } from 'react'
import { useUiStore } from '../store/uiStore'

/**
 * Set the app background theme while a page/component is mounted, then restore
 * 'default' on unmount. Pass a key that exists in CATEGORY_THEMES (use
 * resolveThemeKey for category-derived values).
 */
export function useThemeKey(key) {
  const setThemeKey = useUiStore((s) => s.setThemeKey)
  useEffect(() => {
    setThemeKey(key || 'default')
    return () => setThemeKey('default')
  }, [key, setThemeKey])
}
