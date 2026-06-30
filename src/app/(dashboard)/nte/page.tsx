import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import NTEForm from '@/components/nte/NTEForm'

export default async function NTEPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, full_name')
    .eq('id', user!.id)
    .single()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, position, station_id')
    .eq('org_id', profile!.org_id)
    .eq('is_active', true)
    .order('full_name')

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile!.org_id)
    .single()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Notice to Explain (NTE)</h1>
        <p className="text-sm text-gray-500 mt-0.5">Generate and print NTE documents</p>
      </div>
      <NTEForm
        employees={employees ?? []}
        orgName={org?.name ?? ''}
        issuedBy={profile?.full_name ?? ''}
      />
    </div>
  )
}
