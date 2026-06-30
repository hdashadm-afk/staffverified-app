import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canAccess, landingFor } from '@/lib/access'
import { redirect } from 'next/navigation'
import EmployeeList from '@/components/employees/EmployeeList'
import NewEmployeeButton from '@/components/employees/NewEmployeeButton'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role')
    .eq('id', user!.id)
    .single()

  if (!canAccess('/employees', profile?.role)) redirect(landingFor(profile?.role))

  const { data: employees } = await supabase
    .from('employees')
    .select('*, stations(name)')
    .eq('org_id', profile!.org_id)
    .order('full_name')

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name')
    .eq('org_id', profile!.org_id)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">Staff records for all stations</p>
        </div>
        <NewEmployeeButton orgId={profile!.org_id} stations={stations ?? []} />
      </div>

      <EmployeeList employees={(employees ?? []) as any} orgId={profile!.org_id} stations={stations ?? []} />
    </div>
  )
}
