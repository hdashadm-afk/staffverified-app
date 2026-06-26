'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  CalendarDays,
  Banknote,
  FileCheck,
  FileWarning,
  Fuel,
  RefreshCw,
  Clock,
  LogOut,
} from 'lucide-react'

const NAV = [
  { href: '/hours', label: 'Hours Budget', icon: Clock },
  { href: '/permits', label: 'Compliance', icon: FileCheck },
  { href: '/dtr', label: 'DTR', icon: CalendarDays },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/payroll', label: 'Payroll', icon: Banknote },
  { href: '/remittance', label: 'Remittance', icon: RefreshCw },
  { href: '/nte', label: 'NTE', icon: FileWarning },
  { href: '/doe', label: 'DOE Report', icon: Fuel },
]

export default function Sidebar({ profile }: { profile: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col min-h-screen">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="font-bold text-gray-900 text-base tracking-tight">StaffVerified</div>
        {profile?.organizations?.name && (
          <div className="text-xs text-gray-400 mt-0.5 truncate">{profile.organizations.name}</div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + Sign out */}
      <div className="px-3 py-4 border-t border-gray-100">
        {profile && (
          <div className="px-3 mb-2">
            <div className="text-xs font-medium text-gray-700 truncate">{profile.full_name}</div>
            <div className="text-xs text-gray-400 truncate capitalize">{profile.role}</div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
