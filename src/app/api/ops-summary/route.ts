// Read-only per-station operational snapshot for OpsVerified — same shape
// of integration as src/app/api/lens-summary/route.ts (Owner's Lens): a
// narrow, computed summary rather than raw table access, so OpsVerified
// stays a read-only signal consumer, not a second client into this app's
// data model.
//
// Auth is a shared secret header (x-ops-sync-secret), not a user session —
// server-to-server call from OpsVerified's own backend. Requires
// SUPABASE_SERVICE_ROLE_KEY (bypasses RLS, no logged-in user here) and
// OPS_SYNC_SECRET (shared with the OpsVerified/StationVerified project —
// same value on both sides).
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { currentCutoff, manilaTodayISO } from '@/lib/cutoff'

// Same project as src/lib/supabase/*.ts — public value, safe to hardcode
// (matches the existing BOM-corruption workaround already in this repo).
const SUPABASE_URL = 'https://ttytducwrldmgdqskyym.supabase.co'

export async function GET(request: Request) {
  const secret = request.headers.get('x-ops-sync-secret')
  const expectedSecret = process.env.OPS_SYNC_SECRET
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
  const stationFilter = searchParams.get('station') // station id or name, optional

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

  const today = manilaTodayISO()
  const { start: cutoffStartDate, end: cutoffEndDate } = currentCutoff()

  const [stationsRes, employeesRes, scheduleRes, dtrTodayRes, cutoffStatusRes] = await Promise.all([
    supabase.from('stations').select('id, name').eq('org_id', org.id),
    supabase.from('employees').select('id, station_id').eq('org_id', org.id).eq('is_active', true),
    supabase.from('schedules').select('employee_id, station_id').eq('org_id', org.id).eq('work_date', today),
    supabase.from('dtr_entries').select('employee_id, station_id, time_in').eq('org_id', org.id).eq('work_date', today),
    supabase.from('dtr_cutoff_status').select('employee_id, status').eq('org_id', org.id).eq('cutoff_start', cutoffStartDate),
  ])

  for (const [label, res] of Object.entries({
    stations: stationsRes, employees: employeesRes, schedule: scheduleRes,
    dtrToday: dtrTodayRes, cutoffStatus: cutoffStatusRes,
  })) {
    if (res.error) return NextResponse.json({ error: `Failed to load ${label}.` }, { status: 500 })
  }

  let stations = stationsRes.data ?? []
  if (stationFilter) {
    stations = stations.filter(s => s.id === stationFilter || s.name.toLowerCase() === stationFilter.toLowerCase())
  }

  const employees = employeesRes.data ?? []
  const scheduledToday = scheduleRes.data ?? []
  const dtrToday = dtrTodayRes.data ?? []
  const cutoffStatusByEmployee = Object.fromEntries((cutoffStatusRes.data ?? []).map(r => [r.employee_id, r.status]))

  const snapshot = stations.map(station => {
    const stationEmployeeIds = new Set(employees.filter(e => e.station_id === station.id).map(e => e.id))
    const activeHeadcount = stationEmployeeIds.size

    const scheduledCount = scheduledToday.filter(s => s.station_id === station.id).length
    const clockedInCount = dtrToday.filter(d => d.station_id === station.id && !!d.time_in).length

    const finalizedCount = [...stationEmployeeIds].filter(id => cutoffStatusByEmployee[id] === 'finalized').length

    return {
      station: station.name,
      activeHeadcount,
      scheduledToday: scheduledCount,
      clockedInToday: clockedInCount,
      cutoffDtrFinalized: `${finalizedCount} of ${activeHeadcount}`,
    }
  })

  return NextResponse.json({
    org: org.name,
    generatedAt: new Date().toISOString(),
    today,
    cutoff: `${cutoffStartDate} to ${cutoffEndDate}`,
    stations: snapshot,
  })
}
