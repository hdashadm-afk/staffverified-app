import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canAccess, landingFor } from '@/lib/access'
import { redirect } from 'next/navigation'
import FeedbackList from '@/components/feedback/FeedbackList'
import { FeedbackReport } from '@/types/database'

export default async function FeedbackPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!canAccess('/feedback', profile?.role)) redirect(landingFor(profile?.role))

  const { data: reports } = await supabase
    .from('feedback_reports')
    .select('*')
    .eq('org_id', profile!.org_id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Feedback &amp; Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Issues and suggestions submitted by your team from inside the app.
        </p>
      </div>

      <FeedbackList reports={(reports ?? []) as FeedbackReport[]} />
    </div>
  )
}
