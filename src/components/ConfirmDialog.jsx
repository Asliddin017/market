import { motion, AnimatePresence } from 'framer-motion'

/** Small animated confirmation modal used for destructive actions. */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'O\'chirish', onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onCancel} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="glass-strong relative z-10 w-full max-w-sm rounded-3xl p-6 text-center shadow-card"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-2xl">
              ⚠️
            </div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="mt-2 text-sm text-slate-400">{message}</p>
            <div className="mt-6 flex justify-center gap-2">
              <button onClick={onCancel} className="btn-ghost">Bekor qilish</button>
              <button onClick={onConfirm} className="btn-danger">{confirmLabel}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
