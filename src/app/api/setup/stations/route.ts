import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Returns stations for the setup page dropdown — no auth required (setup only)
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stations')
    .select('id, name')
    .eq('org_id', '00000000-0000-0000-0000-000000000001')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stations: data })
}
