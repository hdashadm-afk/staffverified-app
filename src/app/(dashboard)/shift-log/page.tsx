import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canAccess, landingFor } from '@/lib/access'
import { redirect } from 'next/navigation'
import ShiftLogView from '@/components/shift-log/ShiftLogView'
import { manilaTodayISO } from '@/lib/cutoff'

export default async function ShiftLogPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role, id, station_id, full_name')
    .eq('id', user!.id)
    .single()

  if (!canAccess('/shift-log', profile?.role)) redirect(landingFor(profile?.role))

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name')
    .eq('org_id', profile!.org_id)
    .order('name')

  // TL / GA (station_ops) are locked to their own station, same pattern
  // as DTR's DailyAttendance. HQ roles (owner, ceo, ops_officer) get a
  // station picker instead, defaulting to the first station.
  const isStationScoped = profile!.role === 'tl' || profile!.role === 'station_ops'
  const myStation = (stations ?? []).find(s => s.id === profile!.station_id)

  const today = manilaTodayISO()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Shift Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isStationScoped
            ? `Pump readings and shift handoff at ${myStation?.name ?? 'your station'}`
            : 'Pump readings and shift handoff across stations'}
        </p>
      </div>

      <ShiftLogView
        orgId={profile!.org_id}
        userId={profile!.id}
        userName={profile!.full_name}
        role={profile!.role}
        stations={stations ?? []}
        lockedStationId={isStationScoped ? profile!.station_id : null}
        today={today}
      />
    </div>
  )
}
