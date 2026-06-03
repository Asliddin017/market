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
  },
}

export function can(role, capability) {
  return Boolean(PERMISSIONS[role]?.[capability])
}
