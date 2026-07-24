import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canAccess, landingFor } from '@/lib/access'
import { redirect } from 'next/navigation'
import CashPickupsView from '@/components/cash-pickups/CashPickupsView'

export default async function CashPickupsPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role, id, station_id, full_name')
    .eq('id', user!.id)
    .single()

  if (!canAccess('/cash-pickups', profile?.role)) redirect(landingFor(profile?.role))

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name')
    .eq('org_id', profile!.org_id)
    .order('name')

  const isStationScoped = ['station_ops', 'ops_officer_delivery'].includes(profile!.role)
  const myStation = (stations ?? []).find(s => s.id === profile!.station_id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Cash Pickups</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isStationScoped
            ? `Cash pickup log at ${myStation?.name ?? 'your station'}`
            : 'Cash pickup log across stations'}
        </p>
      </div>

      <CashPickupsView
        orgId={profile!.org_id}
        userId={profile!.id}
        userName={profile!.full_name}
        stations={stations ?? []}
        lockedStationId={isStationScoped ? profile!.station_id : null}
      />
    </div>
  )
}
