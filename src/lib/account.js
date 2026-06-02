// ---------------------------------------------------------------------------
// Username-based login on top of Supabase email auth.
//
// Supabase Auth is email + password. To keep the familiar username login
// ("Asliddin017"), we deterministically map a username to a synthetic email
// (username@asl-ziyo.app). The real username is also stored in profiles.username.
//
// SETUP NOTE: because these synthetic emails are never delivered to, you must
// turn OFF "Confirm email" in Supabase (Authentication -> Providers -> Email),
// otherwise new sign-ups stay unconfirmed. See the README.
// ---------------------------------------------------------------------------

export const USERNAME_EMAIL_DOMAIN = 'asl-ziyo.app'

/** Map a username to its synthetic auth email. Case-insensitive + trimmed. */
export function usernameToEmail(username = '') {
  const u = String(username).trim().toLowerCase()
  return `${u}@${USERNAME_EMAIL_DOMAIN}`
}
