// ---------------------------------------------------------------------------
// Password hashing for the local accounts.
//
// SECURITY NOTE: this is a single-store, backend-less local app. Passwords are
// hashed with SHA-256 (+ a static salt) before being stored in IndexedDB so we
// never keep raw passwords. This is NOT production-grade auth (no per-user salt,
// no slow KDF, the salt ships in the bundle) — it is "good enough" for a local
// single-device store. See the README's security note.
// ---------------------------------------------------------------------------

const SALT = 'asl_ziyo::v1'

export async function hashPassword(password) {
  const data = new TextEncoder().encode(`${SALT}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
