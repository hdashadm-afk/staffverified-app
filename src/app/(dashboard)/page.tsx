import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardHome from '@/components/DashboardHome'

function weekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function weekEnd(start: string): string {
  const d = new Date(start + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

function currentCutoff(): { start: string; end: string; isFirst: boolean } {
  const today = new Date()
  const day = today.getDate()
  const y = today.getFullYear()
  const m = today.getMonth()
  if (day <= 15) {
    return {
      start: `${y}-${String(m + 1).padStart(2, '0')}-01`,
      end:   `${y}-${String(m + 1).padStart(2, '0')}-15`,
      isFirst: true,
    }
  }
  const lastDay = new Date(y, m + 1, 0).getDate()
  return {
    start: `${y}-${String(m + 1).padStart(2, '0')}-16`,
    end:   `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`,
    isFirst: false,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role, station_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const orgId = profile.org_id
  const role = profile.role
  const isTL = role === 'tl'

  // Stations query — TL sees only their own station
  const stationsQuery = supabase
    .from('stations')
    .select('id, name, weekly_hours_budget, budget_warning_pct')
    .eq('org_id', orgId)
    .order('name')

  if (isTL && profile.station_id) {
    stationsQuery.eq('id', profile.station_id)
  }

  const { data: stations } = await stationsQuery

  // Week hours
  const ws = weekStart(new Date())
  const we = weekEnd(ws)

  const dtrQuery = supabase
    .from('dtr_entries')
    .select('station_id, regular_hours, overtime_hours')
    .eq('org_id', orgId)
    .gte('work_date', ws)
    .lte('work_date', we)

  if (isTL && profile.station_id) {
    dtrQuery.eq('station_id', profile.station_id)
  }

  const { data: dtrEntries } = await dtrQuery

  // Compliance — overdue + due within 7 days
  const today = new Date().toISOString().split('T')[0]
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const permitsQuery = supabase
    .from('permits')
    .select('id, permit_type, agency, due_date, status, station_id, stations(name)')
    .eq('org_id', orgId)
    .in('status', ['pending', 'overdue'])
    .lte('due_date', in7)
    .order('due_date')

  if (isTL && profile.station_id) {
    permitsQuery.eq('station_id', profile.station_id)
  }

  const { data: urgentPermits } = await permitsQuery

  // Payroll — latest draft run
  const { data: latestPayroll } = await supabase
    .from('payroll_runs')
    .select('id, cutoff_start, cutoff_end, status, stations(name)')
    .eq('org_id', orgId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const cutoff = currentCutoff()

  return (
    <DashboardHome
      role={role}
      stations={stations ?? []}
      dtrEntries={dtrEntries ?? []}
      weekStart={ws}
      weekEnd={we}
      urgentPermits={(urgentPermits ?? []) as any}
      latestPayroll={latestPayroll as any}
      currentCutoff={cutoff}
      today={today}
    />
  )
}
