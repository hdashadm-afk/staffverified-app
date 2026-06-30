import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DTRView from '@/components/dtr/DTRView'
import DailyAttendance from '@/components/dtr/DailyAttendance'
import { currentCutoff, payday } from '@/lib/cutoff'
import { canAccess, landingFor } from '@/lib/access'

export default async function DTRPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role, id, station_id')
    .eq('id', user!.id)
    .single()

  if (!canAccess('/dtr', profile?.role)) redirect(landingFor(profile?.role))

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

  // Weekly cutoff: Thursday -> Wednesday, payday Friday
  const { start: cutoffStart, end: cutoffEnd } = currentCutoff()
  const cutoffPayday = payday(cutoffEnd)

  const { data: dtrEntries } = await supabase
    .from('dtr_entries')
    .select('*')
    .eq('org_id', profile!.org_id)
    .gte('work_date', cutoffStart)
    .lte('work_date', cutoffEnd)

  const isTL = profile!.role === 'tl'
  const tlStation = (stations ?? []).find(s => s.id === profile!.station_id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {isTL ? 'Daily Attendance' : 'Daily Time Record'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isTL
            ? `Mark who worked at ${tlStation?.name ?? 'your station'} today — attendants float, so add whoever showed up`
            : 'Enter attendance for the current cutoff period'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Cutoff (Thu–Wed): <span className="font-medium text-gray-600">{cutoffStart} → {cutoffEnd}</span>
          {' · '}Payday (Fri): <span className="font-medium text-gray-600">{cutoffPayday}</span>
        </p>
      </div>

      {isTL ? (
        <DailyAttendance
          employees={employees ?? []}
          entries={dtrEntries ?? []}
          orgId={profile!.org_id}
          userId={profile!.id}
          stationId={profile!.station_id}
          stationName={tlStation?.name ?? null}
        />
      ) : (
        <DTRView
          employees={employees ?? []}
          stations={stations ?? []}
          dtrEntries={dtrEntries ?? []}
          orgId={profile!.org_id}
          userId={profile!.id}
          cutoffStart={cutoffStart}
          cutoffEnd={cutoffEnd}
        />
      )}
    </div>
  )
}
