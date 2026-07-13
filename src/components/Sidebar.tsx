'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { canAccess } from '@/lib/access'
import Logo from '@/components/Logo'
import {
  Users,
  Building2,
  CalendarDays,
  Banknote,
  FileCheck,
  FileWarning,
  Fuel,
  RefreshCw,
  Clock,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ShieldAlert,
  CalendarClock,
} from 'lucide-react'

const NAV_META = [
  { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/hours',      label: 'Hours Budget', icon: Clock },
  { href: '/permits',    label: 'Compliance',   icon: FileCheck },
  { href: '/dtr',        label: 'DTR',          icon: CalendarDays },
  { href: '/schedule',   label: 'Schedule',     icon: CalendarClock },
  { href: '/employees',  label: 'Employees',    icon: Users },
  { href: '/payroll',    label: 'Payroll',      icon: Banknote },
  { href: '/remittance', label: 'Remittance',   icon: RefreshCw },
  { href: '/nte',           label: 'NTE',                icon: FileWarning },
  { href: '/disciplinary',  label: 'Disciplinary',       icon: ShieldAlert },
  { href: '/doe',           label: 'DOE Report',         icon: Fuel },
  { href: '/feedback',      label: 'Feedback',           icon: MessageSquare },
]

export default function Sidebar({ profile }: { profile: any }) {
  const role: string = profile?.role ?? ''
  const NAV = NAV_META.filter(item => canAccess(item.href, role))
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col min-h-screen">
      {/* Brand — StaffVerified (platform) + client org */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <div className="leading-tight">
            <div className="text-[10px] font-medium text-gray-400 tracking-wide">Katiwala AI App</div>
            <div className="font-bold text-gray-900 text-[15px] tracking-tight -mt-0.5">
              Staff<span className="text-brand-blue-600">Verified</span>
            </div>
          </div>
        </div>
        {profile?.organizations?.name && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-brand-blue-50 border border-brand-blue-100 px-2.5 py-1.5">
            <Building2 className="w-4 h-4 text-brand-blue-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-brand-blue-700 truncate">{profile.organizations.name}</span>
          </div>
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
                  ? 'bg-brand-blue-50 text-brand-blue-700'
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
