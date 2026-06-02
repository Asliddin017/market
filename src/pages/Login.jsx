import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { useThemeKey } from '../hooks/useThemeKey'

export default function Login() {
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Vivid branded CSS background (no WebGL) — handled by <CategoryBackground />.
  useThemeKey('login')

  const isRegister = mode === 'register'

  function switchMode(next) {
    setMode(next)
    setError('')
    setPassword('')
    setConfirm('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (isRegister && password !== confirm) {
      setError("Parollar mos kelmadi.")
      return
    }
    setBusy(true)
    try {
      const res = isRegister
        ? await register(username, password)
        : await login(username, password)
      if (!res.ok) setError(res.error || 'Xatolik yuz berdi.')
      // On success the auth store updates and App swaps to the app shell.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-10 px-5 py-12 lg:flex-row lg:gap-16">
        {/* Brand / hero copy */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="max-w-md text-center lg:text-left"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
            OZIQ-OVQAT DO'KONI TIZIMI
          </div>
          <h1 className="font-display text-5xl font-extrabold leading-tight sm:text-6xl">
            <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-gold-400 bg-clip-text text-transparent">
              ASL_ZIYO
            </span>
          </h1>
          <p className="mt-4 text-balance text-lg text-slate-300">
            Mahsulotlarni boshqaring, kategoriyalarga ajrating va aqlli qidiruv
            bilan tezda toping.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
            {['⚡ Aqlli qidiruv', '🚀 Tezkor & yengil', '🛒 Savatcha', '🔐 Hisoblar'].map((t) => (
              <span key={t} className="glass rounded-xl px-3 py-1.5 text-sm text-slate-200">
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Auth card */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          className="w-full max-w-sm"
          style={{ perspective: 1200 }}
        >
          <div className="glass-strong rounded-3xl p-6 shadow-card sm:p-8">
            {/* Tabs */}
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-1">
              {[
                { key: 'login', label: 'Kirish' },
                { key: 'register', label: "Ro'yxatdan o'tish" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => switchMode(t.key)}
                  className={`relative rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    mode === t.key ? 'text-ink-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {mode === t.key && (
                    <motion.span
                      layoutId="authTab"
                      className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600"
                    />
                  )}
                  {t.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.h2
                key={mode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-1 text-xl font-bold"
              >
                {isRegister ? "Yangi hisob yaratish" : "Tizimga kirish"}
              </motion.h2>
            </AnimatePresence>
            <p className="mb-5 text-sm text-slate-400">
              {isRegister
                ? "Ro'yxatdan o'tgan foydalanuvchi mijoz sifatida yaratiladi."
                : "Login va parolingizni kiriting."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="username">Login</label>
                <input
                  id="username"
                  className="input"
                  placeholder="Foydalanuvchi nomi"
                  value={username}
                  autoComplete="username"
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setError('')
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label className="label" htmlFor="pwd">Parol</label>
                <input
                  id="pwd"
                  type="password"
                  className="input"
                  placeholder="Parol"
                  value={password}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                />
              </div>

              <AnimatePresence>
                {isRegister && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="label" htmlFor="confirm">Parolni tasdiqlang</label>
                    <input
                      id="confirm"
                      type="password"
                      className="input"
                      placeholder="Parolni qayta kiriting"
                      value={confirm}
                      autoComplete="new-password"
                      onChange={(e) => {
                        setConfirm(e.target.value)
                        setError('')
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300"
                >
                  {error}
                </motion.p>
              )}

              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? 'Iltimos kuting…' : isRegister ? "Ro'yxatdan o'tish" : 'Kirish'}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-slate-400">
              {isRegister ? (
                <>
                  Hisobingiz bormi?{' '}
                  <button onClick={() => switchMode('login')} className="font-semibold text-brand-300 hover:underline">
                    Kirish
                  </button>
                </>
              ) : (
                <>
                  Hisobingiz yo'qmi?{' '}
                  <button onClick={() => switchMode('register')} className="font-semibold text-brand-300 hover:underline">
                    Ro'yxatdan o'ting
                  </button>
                </>
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
