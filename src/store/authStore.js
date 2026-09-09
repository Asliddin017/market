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

// Write ONE login-log row per browser tab + account: a real sign-in is
// 'login'; opening the app with a saved session is 'visit'. sessionStorage
// keeps a refresh (F5) from logging again in the same tab, but the row id is
// kept there too so the heartbeat continues on the same row after a refresh.
//
// Heartbeat: while the tab is visible, the row's last_active_at is stamped
// every HEARTBEAT_MS (and once more when the tab is hidden/closed), so the
// admin sees how long each session stayed connected.
const HEARTBEAT_MS = 60_000
let heartbeatEventId = null
let heartbeatTimer = null
let heartbeatBound = false

async function beat() {
  if (!heartbeatEventId) return
  const { touchLoginEvent } = await import('../hooks/useData')
  touchLoginEvent(heartbeatEventId)
}

function startHeartbeat(eventId) {
  heartbeatEventId = eventId
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  heartbeatTimer = setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') beat()
  }, HEARTBEAT_MS)
  if (!heartbeatBound && typeof document !== 'undefined') {
    heartbeatBound = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') beat()
    })
    window.addEventListener('pagehide', () => beat())
  }
}

function stopHeartbeat() {
  heartbeatEventId = null
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  heartbeatTimer = null
}

// Store the typed password for the admin's "Parol 👁️" view (owner's decision).
async function rememberCredential(session, password) {
  const uid = session?.user?.id
  if (!uid) return
  const { saveOwnCredential } = await import('../hooks/useData')
  saveOwnCredential(uid, password)
}

async function logSessionOnce(session, kind) {
  const uid = session?.user?.id
  if (!uid) return
  const key = `asl-ziyo:logged:${uid}`
  let existing = null
  try {
    existing = sessionStorage.getItem(key)
  } catch {
    /* sessionStorage unavailable (private mode) — still log once per load */
  }
  if (existing) {
    // Same tab after a refresh: keep heart-beating the row we already wrote.
    if (existing !== '1') startHeartbeat(existing)
    return
  }
  try {
    sessionStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
  const { recordLoginEvent } = await import('../hooks/useData')
  const id = await recordLoginEvent(uid, kind)
  if (id) {
    try {
      sessionStorage.setItem(key, id)
    } catch {
      /* ignore */
    }
    startHeartbeat(id)
  }
}

/** Map common Supabase auth errors to friendly Uzbek messages. */
function translate(error) {
  const msg = (error?.message || '').toLowerCase()
  if (msg.includes('invalid login credentials')) return "Login yoki parol noto'g'ri."
  if (msg.includes('already registered') || msg.includes('already exists')) {
    return 'Bu login allaqachon band.'
  }
  if (msg.includes('database error')) {
    return "Hisobni yaratib bo'lmadi — bu login band bo'lishi mumkin. Boshqa login tanlang."
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
  notice: '', // message shown on the login screen (e.g. account deactivated)

  /** Resolve current session + subscribe to changes. Safe to call repeatedly. */
  bootstrap: async () => {
    if (bootstrapped) return
    bootstrapped = true
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      await get()._applySession(session)
      if (session) logSessionOnce(session, 'visit')
    } catch (err) {
      console.error('[auth] bootstrap failed:', err)
    } finally {
      set({ ready: true })
    }
    supabase.auth.onAuthStateChange((event, session) => {
      get()._applySession(session)
      if (event === 'SIGNED_IN' && session) logSessionOnce(session, 'login')
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
      .select('*')
      .eq('id', authUser.id)
      .single()
    if (data && data.is_active === false) {
      // Deactivated by an admin: sign out and explain on the login screen.
      set({
        user: null,
        role: null,
        notice: "Hisobingiz administrator tomonidan faolsizlantirilgan. Do'kon bilan bog'laning.",
      })
      supabase.auth.signOut().catch(() => {})
      return
    }
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
      notice: '',
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
    rememberCredential(session, password)
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
    rememberCredential(session, password)
    return { ok: true }
  },

  logout: async () => {
    await beat() // final "still here" stamp = end of this session
    stopHeartbeat()
    try {
      const uid = get().user?.id
      if (uid) sessionStorage.removeItem(`asl-ziyo:logged:${uid}`)
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut()
    set({ user: null, role: null })
    // Cached lists belong to the account that just left.
    const { clearLiveCache } = await import('../hooks/useData')
    clearLiveCache()
  },
}))
