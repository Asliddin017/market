import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { usernameToEmail } from '../lib/account'
import { ROLES } from '../lib/roles'

// ---------------------------------------------------------------------------
// Auth backed by Supabase Auth (email+password under the hood; the user types
// a USERNAME which we map to a synthetic email — see lib/account.js).
//
// The session is persisted by supabase-js (localStorage) and survives refresh.
// `bootstrap()` resolves the initial session once and then keeps user/role in
// sync via onAuthStateChange. `ready` flips true once the first resolution is
// done so the app can show a loader instead of flashing the login screen.
// ---------------------------------------------------------------------------

let bootstrapped = false

/** Map common Supabase auth errors to friendly Uzbek messages. */
function translate(error) {
  const msg = (error?.message || '').toLowerCase()
  if (msg.includes('invalid login credentials')) return "Login yoki parol noto'g'ri."
  if (msg.includes('already registered') || msg.includes('already exists')) {
    return 'Bu login allaqachon band.'
  }
  if (msg.includes('email not confirmed')) {
    return 'Hisob tasdiqlanmagan. Administrator email tasdiqlashni o\'chirishi kerak.'
  }
  if (msg.includes('password')) return "Parol kamida 6 ta belgi bo'lsin."
  return error?.message || 'Xatolik yuz berdi.'
}

export const useAuthStore = create((set, get) => ({
  user: null, // { id, username, role } | null
  role: null, // mirror of user.role | null
  ready: false, // initial session resolved?

  /** Resolve current session + subscribe to changes. Safe to call repeatedly. */
  bootstrap: async () => {
    if (bootstrapped) return
    bootstrapped = true
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      await get()._applySession(session)
    } catch (err) {
      console.error('[auth] bootstrap failed:', err)
    } finally {
      set({ ready: true })
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      get()._applySession(session)
    })
  },

  /** Internal: load the profile for a session and mirror user/role into state. */
  _applySession: async (session) => {
    const authUser = session?.user
    if (!authUser) {
      set({ user: null, role: null })
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('username, role')
      .eq('id', authUser.id)
      .single()
    if (error || !data) {
      console.error('[auth] profil yuklanmadi:', error)
      set({
        user: { id: authUser.id, username: authUser.email?.split('@')[0] ?? 'user', role: ROLES.CLIENT },
        role: ROLES.CLIENT,
      })
      return
    }
    set({
      user: { id: authUser.id, username: data.username, role: data.role },
      role: data.role,
    })
  },

  /** Log in with username + password. Returns { ok, error? }. */
  login: async (username, password) => {
    const uname = (username || '').trim()
    if (!uname || !password) return { ok: false, error: 'Login va parolni kiriting.' }
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(uname),
      password,
    })
    if (error) return { ok: false, error: translate(error) }
    const {
      data: { session },
    } = await supabase.auth.getSession()
    await get()._applySession(session)
    return { ok: true }
  },

  /** Register a new account (always role = client). Returns { ok, error? }. */
  register: async (username, password) => {
    const uname = (username || '').trim()
    if (uname.length < 3) return { ok: false, error: "Login kamida 3 ta belgi bo'lsin." }
    if ((password || '').length < 6) return { ok: false, error: "Parol kamida 6 ta belgi bo'lsin." }
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(uname),
      password,
      options: { data: { username: uname } },
    })
    if (error) return { ok: false, error: translate(error) }
    // Supabase returns an existing-but-unidentified user for duplicate sign-ups.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { ok: false, error: 'Bu login allaqachon band.' }
    }
    const {
      data: { session },
    } = await supabase.auth.getSession()
    await get()._applySession(session)
    if (!session) {
      // Email confirmation is still ON — tell the admin to disable it.
      return { ok: false, error: "Hisob yaratildi, lekin tasdiqlash kerak. Admin Supabase'da email tasdiqlashni o'chirsin." }
    }
    return { ok: true }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, role: null })
  },
}))
