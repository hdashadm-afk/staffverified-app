import { createClient } from '@/lib/supabase/server'
import DOEPumpPriceForm from '@/components/doe/DOEPumpPriceForm'

export default async function DOEPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id')
    .eq('id', user!.id)
    .single()

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name')
    .eq('org_id', profile!.org_id)

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile!.org_id)
    .single()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">DOE Pump Price Report</h1>
        <p className="text-sm text-gray-500 mt-0.5">Weekly Tuesday submission — product × station price grid</p>
      </div>
      <DOEPumpPriceForm
        stations={stations ?? []}
        orgName={org?.name ?? ''}
        orgId={profile!.org_id}
      />
    </div>
  )
}
