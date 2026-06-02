import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../db/db'
import { hashPassword } from '../lib/auth'
import { ROLES } from '../lib/roles'

// ---------------------------------------------------------------------------
// Account-based auth. Credentials live in the `users` table; the logged-in user
// (id, username, role) is persisted to localStorage so the session survives a
// refresh. `role` is mirrored alongside `user` for convenient selectors.
// ---------------------------------------------------------------------------

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // { id, username, role } | null
      role: null, // mirror of user.role | null

      /** Log in with username + password. Returns { ok, error? }. */
      login: async (username, password) => {
        const uname = (username || '').trim()
        if (!uname || !password) return { ok: false, error: "Login va parolni kiriting." }

        const u = await db.users.where('username').equals(uname).first()
        if (!u) return { ok: false, error: "Bunday foydalanuvchi topilmadi." }

        const hash = await hashPassword(password)
        if (hash !== u.passwordHash) return { ok: false, error: "Parol noto'g'ri." }

        set({ user: { id: u.id, username: u.username, role: u.role }, role: u.role })
        return { ok: true }
      },

      /** Register a new account (always role = client). Returns { ok, error? }. */
      register: async (username, password) => {
        const uname = (username || '').trim()
        if (uname.length < 3) return { ok: false, error: "Login kamida 3 ta belgi bo'lsin." }
        if ((password || '').length < 4) return { ok: false, error: "Parol kamida 4 ta belgi bo'lsin." }

        const exists = await db.users.where('username').equals(uname).first()
        if (exists) return { ok: false, error: "Bu login allaqachon band." }

        const passwordHash = await hashPassword(password)
        const id = await db.users.add({
          username: uname,
          passwordHash,
          role: ROLES.CLIENT, // new users are always clients
          createdAt: new Date().toISOString(),
        })

        set({ user: { id, username: uname, role: ROLES.CLIENT }, role: ROLES.CLIENT })
        return { ok: true }
      },

      logout: () => set({ user: null, role: null }),
    }),
    {
      name: 'asl_ziyo_auth',
      partialize: (s) => ({ user: s.user, role: s.role }),
    },
  ),
)
