import { createBrowserClient } from '@supabase/ssr'

// Hardcoded on purpose: the Vercel env vars were corrupted with a leading BOM
// (U+FEFF) which broke header encoding. These are public values anyway.
const SUPABASE_URL = 'https://ttytducwrldmgdqskyym.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eXRkdWN3cmxkbWdkcXNreXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2OTQzNTYsImV4cCI6MjA5ODI3MDM1Nn0.rOkOMks7pRgA3pE0Hp_sORxwJlr_uLKyPptDpgnzJDs'

// Read the user's access token from the sv-token cookie set by the login page.
function readAccessToken(): string {
  if (typeof document === 'undefined') return ''
  const m = document.cookie.match(/(?:^|;\s*)sv-token=([^;]+)/)
  if (!m) return ''
  try {
    return JSON.parse(decodeURIComponent(m[1])).access_token ?? ''
  } catch {
    return ''
  }
}

// Browser client. Client-side writes must carry the user's JWT so PostgREST
// sets auth.uid() and RLS passes — otherwise every insert/update runs as anon
// and is rejected ("new row violates row-level security policy"). We force the
// Authorization header via a custom fetch (the login stores the token in a
// custom cookie, not the format the ssr client reads on its own).
export function createClient() {
  const token = readAccessToken()
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: token
      ? {
          fetch: (input: RequestInfo | URL, init: RequestInit = {}) => {
            const headers = new Headers(init.headers)
            headers.set('Authorization', `Bearer ${token}`)
            headers.set('apikey', SUPABASE_ANON_KEY)
            return fetch(input, { ...init, headers })
          },
        }
      : {},
  })
}
