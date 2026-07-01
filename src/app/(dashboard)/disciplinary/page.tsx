import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canAccess, landingFor } from '@/lib/access'
import { redirect } from 'next/navigation'
import { NTERecordWithEmployee } from '@/types/database'
import DisciplinaryList from '@/components/disciplinary/DisciplinaryList'

export default async function DisciplinaryPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!canAccess('/disciplinary', profile?.role)) redirect(landingFor(profile?.role))

  const { data: records } = await supabase
    .from('nte_records')
    .select('*, employees(full_name)')
    .eq('org_id', profile!.org_id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Disciplinary Records</h1>
        <p className="text-sm text-gray-500 mt-0.5">NTE history across all employees</p>
      </div>
      <DisciplinaryList records={(records ?? []) as NTERecordWithEmployee[]} />
    </div>
  )
}
