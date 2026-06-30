import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PermitList from '@/components/permits/PermitList'
import NewPermitButton from '@/components/permits/NewPermitButton'
import { Permit, Station } from '@/types/database'

export default async function PermitsPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role')
    .eq('id', user!.id)
    .single()

  const { data: permits } = await supabase
    .from('permits')
    .select('*, stations(name)')
    .eq('org_id', profile!.org_id)
    .order('due_date', { ascending: true })

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name')
    .eq('org_id', profile!.org_id)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Compliance Tracker</h1>
          <p className="text-sm text-gray-500 mt-0.5">Government submissions, permits, and recurring reports</p>
        </div>
        <NewPermitButton orgId={profile!.org_id} stations={stations ?? []} userId={user!.id} />
      </div>

      <PermitList permits={(permits ?? []) as any} orgId={profile!.org_id} userId={user!.id} />
    </div>
  )
}
