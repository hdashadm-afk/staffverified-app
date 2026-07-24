import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canAccess, landingFor } from '@/lib/access'
import { redirect } from 'next/navigation'
import DeliveriesView from '@/components/deliveries/DeliveriesView'

export default async function DeliveriesPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role, id, station_id, full_name')
    .eq('id', user!.id)
    .single()

  if (!canAccess('/deliveries', profile?.role)) redirect(landingFor(profile?.role))

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name')
    .eq('org_id', profile!.org_id)
    .order('name')

  // TL / station_ops / ops_officer_delivery are all station-scoped in
  // practice — TL and Cashier work one station, Delivery Supervisor's
  // RLS is scoped to their own station too. Owner/ceo/ops_officer see
  // everything.
  const isStationScoped = ['tl', 'station_ops', 'ops_officer_delivery'].includes(profile!.role)
  const myStation = (stations ?? []).find(s => s.id === profile!.station_id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Deliveries</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isStationScoped
            ? `Fuel deliveries and inter-station transfers at ${myStation?.name ?? 'your station'}`
            : 'Fuel deliveries and inter-station transfers across stations'}
        </p>
      </div>

      <DeliveriesView
        orgId={profile!.org_id}
        userId={profile!.id}
        userName={profile!.full_name}
        stations={stations ?? []}
        lockedStationId={isStationScoped ? profile!.station_id : null}
      />
    </div>
  )
}
