import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canAccess, landingFor } from '@/lib/access'
import { redirect } from 'next/navigation'
import ScheduleView from '@/components/schedule/ScheduleView'

export default async function SchedulePage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role, id')
    .eq('id', user!.id)
    .single()

  if (!canAccess('/schedule', profile?.role)) redirect(landingFor(profile?.role))

  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, station_id')
    .eq('org_id', profile!.org_id)
    .eq('is_active', true)
    .order('full_name')

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name')
    .eq('org_id', profile!.org_id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Schedule</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Set expected shift times per employee — used for DTR late/undertime tracking
        </p>
      </div>

      <ScheduleView
        employees={employees ?? []}
        stations={stations ?? []}
        orgId={profile!.org_id}
      />
    </div>
  )
}
