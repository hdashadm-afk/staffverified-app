import { createClient } from '@/lib/supabase/server'
import HoursBudgetDashboard from '@/components/hours/HoursBudgetDashboard'

// Get Monday of the week containing a given date
function weekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day) // Mon=0 offset
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function weekEnd(start: string): string {
  const d = new Date(start + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

export default async function HoursPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role')
    .eq('id', user!.id)
    .single()

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, weekly_hours_budget, budget_warning_pct')
    .eq('org_id', profile!.org_id)
    .order('name')

  // Current week
  const ws = weekStart(new Date())
  const we = weekEnd(ws)

  // DTR entries for this week across all stations
  const { data: dtrEntries } = await supabase
    .from('dtr_entries')
    .select('station_id, regular_hours, overtime_hours')
    .eq('org_id', profile!.org_id)
    .gte('work_date', ws)
    .lte('work_date', we)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Hours Budget</h1>
        <p className="text-sm text-gray-500 mt-0.5">Weekly labor hours — budget vs. actual per station</p>
      </div>
      <HoursBudgetDashboard
        stations={(stations ?? []) as any}
        dtrEntries={dtrEntries ?? []}
        weekStart={ws}
        weekEnd={we}
        isOwner={profile!.role === 'owner' || profile!.role === 'ceo'}
        orgId={profile!.org_id}
      />
    </div>
  )
}
