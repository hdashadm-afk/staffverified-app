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
    .select('id, full_name, daily_rate, has_sil, station_id, regular_hours_per_day')
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

  const { data: schedules } = await supabase
    .from('schedules')
    .select('employee_id, work_date, shift_start, shift_end')
    .eq('org_id', profile!.org_id)
    .gte('work_date', cutoffStart)
    .lte('work_date', cutoffEnd)

  const { data: org } = await supabase
    .from('organizations')
    .select('ot_multiplier, nsd_rate, holiday_regular_multiplier, holiday_special_multiplier')
    .eq('id', profile!.org_id)
    .single()

  // Station-scoped attendance marking (mark who worked, floating pool)
  // applies to anyone locked to a single station — TL and the
  // Cashier/GA (station_ops) alike — not just TL.
  const isStationScoped = profile!.role === 'tl' || profile!.role === 'station_ops'
  const tlStation = (stations ?? []).find(s => s.id === profile!.station_id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {isStationScoped ? 'Daily Attendance' : 'Daily Time Record'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isStationScoped
            ? `Mark who worked at ${tlStation?.name ?? 'your station'} today — attendants float, so add whoever showed up`
            : 'Enter attendance for the current cutoff period'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Cutoff (Thu–Wed): <span className="font-medium text-gray-600">{cutoffStart} → {cutoffEnd}</span>
          {' · '}Payday (Fri): <span className="font-medium text-gray-600">{cutoffPayday}</span>
        </p>
      </div>

      {isStationScoped ? (
        <DailyAttendance
          employees={employees ?? []}
          entries={dtrEntries ?? []}
          schedules={schedules ?? []}
          orgId={profile!.org_id}
          userId={profile!.id}
          stationId={profile!.station_id}
          stationName={tlStation?.name ?? null}
        />
      ) : (
        <DTRView
          employees={employees ?? []}
          stations={stations ?? []}
          orgRates={org ?? undefined}
          orgId={profile!.org_id}
          userId={profile!.id}
          role={profile!.role}
        />
      )}
    </div>
  )
}
