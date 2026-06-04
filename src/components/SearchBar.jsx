import { motion } from 'framer-motion'

/** Real-time search input. Parent owns the value and runs smartSearch on change. */
export default function SearchBar({ value, onChange, resultCount, placeholder, resultNoun = 'natija' }) {
  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass flex items-center gap-3 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-brand-500/50"
      >
        <span className="text-xl">🔍</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Qidirish… (masalan: energtik, sut, olma)"}
          className="w-full bg-transparent text-base text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300 hover:bg-white/20"
            aria-label="Tozalash"
          >
            ✕
          </button>
        )}
      </motion.div>
      {value && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 pl-1 text-xs text-slate-400"
        >
          {resultCount} ta {resultNoun} topildi
        </motion.p>
      )}
    </div>
  )
}
