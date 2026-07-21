// Read-only summary endpoint for Owner's Lens (katiwala-owner-os-) to pull
// a real StaffVerified signal into its dashboard — see that repo's
// docs/OWNERS_LENS_MODULE_INTEGRATION.md. Deliberately narrow: returns a
// small computed payroll-status summary, not raw table access, so Owner's
// Lens stays a read-only signal consumer rather than a second client into
// this app's own data model.
//
// Auth is a shared secret header (x-lens-sync-secret), not a user session
// — this is a server-to-server call from Owner's Lens's own backend, not
// a browser request. Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS,
// since there's no logged-in user here) and LENS_SYNC_SECRET (shared
// with katiwala-owner-os-'s Vercel project — same value on both sides).
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Same project as src/lib/supabase/*.ts — public value, safe to hardcode
// (matches the existing BOM-corruption workaround already in this repo).
const SUPABASE_URL = 'https://ttytducwrldmgdqskyym.supabase.co'

export async function GET(request: Request) {
  const secret = request.headers.get('x-lens-sync-secret')
  const expectedSecret = process.env.LENS_SYNC_SECRET
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'Not configured — missing SUPABASE_SERVICE_ROLE_KEY on Vercel.' },
      { status: 200 }
    )
  }

  const { searchParams } = new URL(request.url)
  const orgSlug = searchParams.get('org') || 'helium-fuels'

  const supabase = createSupabaseClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('slug', orgSlug)
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: `No organization found for slug "${orgSlug}".` }, { status: 404 })
  }

  const { data: latestRun, error: runError } = await supabase
    .from('payroll_runs')
    .select('status, cutoff_start, cutoff_end, completed_at')
    .eq('org_id', org.id)
    .order('cutoff_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (runError) {
    return NextResponse.json({ error: 'Failed to load payroll status.' }, { status: 500 })
  }

  return NextResponse.json({
    org: org.name,
    generatedAt: new Date().toISOString(),
    payrollStatus: latestRun
      ? {
          status: latestRun.status,
          cutoff: `${latestRun.cutoff_start} to ${latestRun.cutoff_end}`,
          completedAt: latestRun.completed_at,
        }
      : null,
  })
}
