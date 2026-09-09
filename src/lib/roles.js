// ---------------------------------------------------------------------------
// Roles and the permission matrix for ASL_ZIYO.
//
// Accounts (username + hashed password) live in the `users` table; the role is
// read from the logged-in account. No shared/demo passwords here anymore.
// ---------------------------------------------------------------------------

export const ROLES = {
  ADMIN: 'admin',
  SELLER: 'seller',
  CLIENT: 'client',
  // Not logged in. Browses the storefront (prices, categories, contacts) and
  // keeps a local cart; must sign in / register to place an order.
  GUEST: 'guest',
}

export const ROLE_META = {
  [ROLES.ADMIN]: {
    label: 'Administrator',
    tagline: "To'liq nazorat — qo'shish, tahrirlash, o'chirish, foydalanuvchilar",
    icon: '🛡️',
    accent: 'from-rose-400 to-rose-600',
  },
  [ROLES.SELLER]: {
    label: 'Sotuvchi',
    tagline: "Qo'shish va tahrirlash — o'chirish mumkin emas",
    icon: '🧑‍💼',
    accent: 'from-brand-400 to-brand-600',
  },
  [ROLES.CLIENT]: {
    label: 'Mijoz',
    tagline: "Mahsulotlarni ko'rish va savatchaga qo'shish",
    icon: '🛒',
    accent: 'from-gold-400 to-gold-600',
  },
  [ROLES.GUEST]: {
    label: 'Mehmon',
    tagline: "Narxlarni ko'rish — buyurtma uchun kirish kerak",
    icon: '👋',
    accent: 'from-slate-400 to-slate-600',
  },
}

// Capability flags per role. Components read these instead of checking the role
// name directly, so permission rules live in exactly one place.
const PERMISSIONS = {
  [ROLES.ADMIN]: {
    manageProducts: true,
    deleteProducts: true,
    manageCategories: true,
    deleteCategories: true,
    manageUsers: true,
    useCart: false,
    viewOrders: true, // sees ALL orders
    manageOrders: true, // change status, mark a line "yo'q"
    deleteOrders: true,
    manageContacts: true, // edit "Aloqa" contacts
    viewStats: true, // "Statistika" page
  },
  [ROLES.SELLER]: {
    manageProducts: true,
    deleteProducts: false,
    manageCategories: true,
    deleteCategories: false,
    manageUsers: false,
    useCart: false,
    viewOrders: true, // sees ALL orders
    manageOrders: true, // change status, mark a line "yo'q"
    deleteOrders: false,
    manageContacts: false,
    viewStats: true, // "Statistika" page
  },
  [ROLES.CLIENT]: {
    manageProducts: false,
    deleteProducts: false,
    manageCategories: false,
    deleteCategories: false,
    manageUsers: false,
    useCart: true,
    viewOrders: true, // sees only OWN orders (enforced by RLS)
    manageOrders: false,
    deleteOrders: false,
    manageContacts: false,
    viewStats: false,
  },
  [ROLES.GUEST]: {
    manageProducts: false,
    deleteProducts: false,
    manageCategories: false,
    deleteCategories: false,
    manageUsers: false,
    useCart: true, // local (browser) cart; checkout requires login
    viewOrders: false,
    manageOrders: false,
    deleteOrders: false,
    manageContacts: false,
    viewStats: false,
  },
}

/** True for a visitor without an account (or before any session resolved). */
export function isGuest(role) {
  return !role || role === ROLES.GUEST
}

export function can(role, capability) {
  return Boolean(PERMISSIONS[role]?.[capability])
}
