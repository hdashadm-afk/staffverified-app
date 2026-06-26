import { createClient } from '@/lib/supabase/server'
import DTRView from '@/components/dtr/DTRView'

export default async function DTRPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role, id')
    .eq('id', user!.id)
    .single()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, daily_rate, has_sil, station_id')
    .eq('org_id', profile!.org_id)
    .eq('is_active', true)
    .order('full_name')

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name')
    .eq('org_id', profile!.org_id)

  // Default: current cutoff period (1st–15th or 16th–end of month)
  const today = new Date()
  const day = today.getDate()
  const year = today.getFullYear()
  const month = today.getMonth()
  const cutoffStart = day <= 15
    ? new Date(year, month, 1).toISOString().split('T')[0]
    : new Date(year, month, 16).toISOString().split('T')[0]
  const cutoffEnd = day <= 15
    ? new Date(year, month, 15).toISOString().split('T')[0]
    : new Date(year, month + 1, 0).toISOString().split('T')[0]

  const { data: dtrEntries } = await supabase
    .from('dtr_entries')
    .select('*')
    .eq('org_id', profile!.org_id)
    .gte('work_date', cutoffStart)
    .lte('work_date', cutoffEnd)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Daily Time Record</h1>
        <p className="text-sm text-gray-500 mt-0.5">Enter attendance for the current cutoff period</p>
      </div>

      <DTRView
        employees={employees ?? []}
        stations={stations ?? []}
        dtrEntries={dtrEntries ?? []}
        orgId={profile!.org_id}
        userId={profile!.id}
        cutoffStart={cutoffStart}
        cutoffEnd={cutoffEnd}
      />
    </div>
  )
}
