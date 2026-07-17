import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import FeedbackWidget from '@/components/FeedbackWidget'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, organizations(name)')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <main className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        {children}
      </main>
      {profile && (
        <FeedbackWidget
          userId={profile.id}
          userName={profile.full_name}
          userEmail={profile.email}
          orgId={profile.org_id}
        />
      )}
    </div>
  )
}
