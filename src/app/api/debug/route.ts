import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

const URL = 'https://ttytducwrldmgdqskyym.supabase.co'
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eXRkdWN3cmxkbWdkcXNreXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2OTQzNTYsImV4cCI6MjA5ODI3MDM1Nn0.rOkOMks7pRgA3pE0Hp_sORxwJlr_uLKyPptDpgnzJDs'

export async function GET() {
  const out: Record<string, unknown> = {}

  const cookieStore = await cookies()
  const raw = cookieStore.get('sv-token')?.value
  out.cookie_present = !!raw
  out.cookie_len = raw?.length ?? 0
  out.all_cookie_names = cookieStore.getAll().map((c) => c.name)

  let accessToken = ''
  if (raw) {
    try {
      accessToken = JSON.parse(decodeURIComponent(raw)).access_token ?? ''
    } catch (e) {
      out.parse_error = String(e)
    }
  }
  out.token_len = accessToken.length

  // Method A: raw fetch (the path we KNOW works via curl)
  try {
    const r = await fetch(`${URL}/rest/v1/user_profiles?select=id,org_id,role`, {
      headers: { apikey: ANON, Authorization: `Bearer ${accessToken}` },
    })
    out.rawfetch_status = r.status
    out.rawfetch_body = (await r.text()).slice(0, 300)
  } catch (e) {
    out.rawfetch_error = String(e)
  }

  // Method B: supabase-js with custom fetch
  try {
    const authFetch: typeof fetch = (input, init = {}) => {
      const headers = new Headers(init.headers)
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
      headers.set('apikey', ANON)
      return fetch(input, { ...init, headers })
    }
    const sb = createSupabaseClient(URL, ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: authFetch },
    })
    const { data, error } = await sb.from('user_profiles').select('id, org_id, role')
    out.lib_rowcount = data?.length ?? 0
    out.lib_error = error ? error.message : null
  } catch (e) {
    out.lib_exception = String(e)
  }

  // Method C: replicate /hours EXACTLY — real getCurrentUser + real server client
  try {
    const user = await getCurrentUser()
    out.C_user = user
    const supabase = await createServerClient()
    const { data: profile, error: pErr } = await supabase
      .from('user_profiles')
      .select('org_id, role')
      .eq('id', user!.id)
      .single()
    out.C_profile = profile
    out.C_profile_error = pErr ? pErr.message : null
  } catch (e) {
    out.C_exception = String(e)
  }

  return NextResponse.json(out)
}
