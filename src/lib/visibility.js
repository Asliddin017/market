// ---------------------------------------------------------------------------
// Client visibility rules (framework-free, pure).
//
// Some categories are banned for the CLIENT role (e.g. "Sigaretlar"). The DB
// enforces this with RLS (clients never receive those rows), and these helpers
// enforce the SAME rule in the UI/data layer as defense-in-depth — so a client
// never sees a hidden category or its products even if RLS were misconfigured.
//
// A category is hidden when its `hiddenForClients` flag is true (mapped from
// categories.hidden_for_clients). Staff (admin/seller) always see everything.
// ---------------------------------------------------------------------------

import { ROLES } from './roles'

/** Staff (admin/seller) bypass all client visibility restrictions. */
export function isStaff(role) {
  return role === ROLES.ADMIN || role === ROLES.SELLER
}

/** Is this category hidden from clients? */
export function isCategoryHiddenForClient(category) {
  return Boolean(category?.hiddenForClients)
}

/** Set of category ids hidden from clients (for fast product filtering). */
export function hiddenCategoryIds(categories = []) {
  return new Set(categories.filter(isCategoryHiddenForClient).map((c) => c.id))
}

/** Categories visible to `role`: staff get all, clients lose hidden ones. */
export function visibleCategories(categories = [], role) {
  if (isStaff(role)) return categories
  return categories.filter((c) => !isCategoryHiddenForClient(c))
}

/**
 * Products visible to `role`: staff get all; clients lose any product whose
 * category is hidden. `categories` supplies the hidden-category lookup.
 */
export function visibleProducts(products = [], categories = [], role) {
  if (isStaff(role)) return products
  const hidden = hiddenCategoryIds(categories)
  if (hidden.size === 0) return products
  return products.filter((p) => !hidden.has(p.categoryId))
}
