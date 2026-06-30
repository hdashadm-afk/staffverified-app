import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ttytducwrldmgdqskyym.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eXRkdWN3cmxkbWdkcXNreXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2OTQzNTYsImV4cCI6MjA5ODI3MDM1Nn0.rOkOMks7pRgA3pE0Hp_sORxwJlr_uLKyPptDpgnzJDs'

// Server-side Supabase client. Reads the access token from our simple
// single cookie (set by the login page) and passes it as a Bearer token so
// PostgREST sets auth.uid() and RLS works. Uses the plain supabase-js client
// (no cookie session adapter) so our Authorization header is not overridden.
export async function createClient() {
  const cookieStore = await cookies()

  let accessToken = ''
  const raw = cookieStore.get('sv-token')?.value
  if (raw) {
    try {
      accessToken = JSON.parse(decodeURIComponent(raw)).access_token ?? ''
    } catch {
      accessToken = ''
    }
  }

  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {},
  })
}
