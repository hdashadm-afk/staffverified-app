import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import RemittanceList from '@/components/remittance/RemittanceList'
import NewRemittanceButton from '@/components/remittance/NewRemittanceButton'

export default async function RemittancePage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, id')
    .eq('id', user!.id)
    .single()

  const { data: records } = await supabase
    .from('remittance_reconciliations')
    .select('*')
    .eq('org_id', profile!.org_id)
    .order('period_start', { ascending: false })

  const { data: runs } = await supabase
    .from('payroll_runs')
    .select('id, cutoff_start, cutoff_end, status')
    .eq('org_id', profile!.org_id)
    .eq('status', 'completed')
    .order('cutoff_end', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Remittance Reconciliation</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track SSS, PhilHealth, and HDMF — deducted vs. remitted</p>
        </div>
        <NewRemittanceButton orgId={profile!.org_id} userId={profile!.id} runs={runs ?? []} />
      </div>

      <RemittanceList records={(records ?? []) as any} orgId={profile!.org_id} userId={profile!.id} />
    </div>
  )
}
