import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Inserts a user_profile row for an existing auth user.
// Only works in non-production or when SETUP_ENABLED=true.
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && process.env.SETUP_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Setup disabled in production' }, { status: 403 })
  }

  const body = await req.json()
  const { id, org_id, role, full_name, email, station_id } = body

  if (!id || !org_id || !role || !full_name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase.from('user_profiles').insert({
    id,
    org_id,
    role,
    full_name,
    email,
    station_id: station_id ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
