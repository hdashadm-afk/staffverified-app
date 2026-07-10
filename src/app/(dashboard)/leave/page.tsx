import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canAccess, landingFor } from '@/lib/access'
import { redirect } from 'next/navigation'
import { LeaveRequestWithEmployee } from '@/types/database'
import LeaveList from '@/components/leave/LeaveList'
import NewLeaveRequestButton from '@/components/leave/NewLeaveRequestButton'

export default async function LeavePage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role, id')
    .eq('id', user!.id)
    .single()

  if (!canAccess('/leave', profile?.role)) redirect(landingFor(profile?.role))

  const { data: requests } = await supabase
    .from('leave_requests')
    .select('*, employees(full_name, has_sil)')
    .eq('org_id', profile!.org_id)
    .order('created_at', { ascending: false })

  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, has_sil')
    .eq('org_id', profile!.org_id)
    .eq('is_active', true)
    .order('full_name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Leave</h1>
          <p className="text-sm text-gray-500 mt-0.5">Requests, approvals, and SIL balances</p>
        </div>
        <NewLeaveRequestButton
          orgId={profile!.org_id}
          userId={profile!.id}
          employees={employees ?? []}
        />
      </div>

      <LeaveList
        requests={(requests ?? []) as LeaveRequestWithEmployee[]}
        employees={employees ?? []}
      />
    </div>
  )
}
