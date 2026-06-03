import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Single shared Supabase client for the whole app.
//
// The URL + anon key come from env vars (Vite exposes only VITE_*-prefixed
// vars to the browser). The anon key is SAFE to ship in the frontend — row
// level security (see supabase/schema.sql) is what actually protects the data.
// NEVER put the service_role key in here or anywhere bundled into the client.
// ---------------------------------------------------------------------------

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** True when both env vars are present — the app can show a clear hint if not. */
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  // Surfaced in the console and via a banner; we still create a client so the
  // app doesn't hard-crash at import time.
   
  console.error(
    'Supabase sozlanmagan: VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY ni .env.local ' +
      "ga qo'shing (README ga qarang).",
  )
}

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
