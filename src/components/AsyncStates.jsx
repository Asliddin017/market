// ---------------------------------------------------------------------------
// Shared loading / error / empty panels so every data page handles the three
// non-data states identically and NEVER renders a blank body while a Supabase
// fetch is in flight. The list itself is rendered by the page once data is
// loaded; until then one of these panels is shown.
// ---------------------------------------------------------------------------

const PANEL = 'glass flex flex-col items-center justify-center rounded-3xl py-20 text-center'

/** Spinner shown while data === undefined (fetch not finished). */
export function LoadingState({ label = 'Yuklanmoqda…' }) {
  return (
    <div className={PANEL} role="status" aria-live="polite">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-400" />
      <p className="mt-3 text-sm text-slate-400">{label}</p>
    </div>
  )
}

/** Error panel with a retry button (call the hook's refetch). */
export function ErrorState({ onRetry, message = "Ma'lumotlarni yuklab bo'lmadi" }) {
  return (
    <div className={PANEL}>
      <span className="text-5xl">⚠️</span>
      <p className="mt-3 text-lg font-semibold">{message}</p>
      <p className="text-sm text-slate-400">Internet aloqasini tekshiring va qayta urinib ko'ring.</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-5">
          🔄 Qayta urinish
        </button>
      )}
    </div>
  )
}

/** Empty panel shown when data is loaded but the list is []. */
export function EmptyState({ icon = '🔍', title = 'Hech narsa topilmadi', hint }) {
  return (
    <div className={PANEL}>
      <span className="text-5xl">{icon}</span>
      <p className="mt-3 text-lg font-semibold">{title}</p>
      {hint && <p className="text-sm text-slate-400">{hint}</p>}
    </div>
  )
}
