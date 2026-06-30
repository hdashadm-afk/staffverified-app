import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canAccess, landingFor } from '@/lib/access'
import { redirect } from 'next/navigation'
import PayrollRunList from '@/components/payroll/PayrollRunList'
import NewPayrollRunButton from '@/components/payroll/NewPayrollRunButton'

export default async function PayrollPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role, id')
    .eq('id', user!.id)
    .single()

  if (!canAccess('/payroll', profile?.role)) redirect(landingFor(profile?.role))

  const { data: runs } = await supabase
    .from('payroll_runs')
    .select('*, stations(name)')
    .eq('org_id', profile!.org_id)
    .order('cutoff_end', { ascending: false })

  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, daily_rate, has_sil, coop_saving_amount, station_id')
    .eq('org_id', profile!.org_id)
    .eq('is_active', true)

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name')
    .eq('org_id', profile!.org_id)

  const { data: org } = await supabase
    .from('organizations')
    .select('ot_multiplier, nsd_rate, holiday_regular_multiplier, holiday_special_multiplier')
    .eq('id', profile!.org_id)
    .single()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Payroll</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cutoff runs and payslips</p>
        </div>
        <NewPayrollRunButton
          orgId={profile!.org_id}
          userId={profile!.id}
          stations={stations ?? []}
        />
      </div>

      <PayrollRunList
        runs={(runs ?? []) as any}
        employees={employees ?? []}
        orgId={profile!.org_id}
        orgRates={org as any}
      />
    </div>
  )
}
