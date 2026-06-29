'use client'

import Link from 'next/link'
import {
  Clock, FileCheck, Banknote, AlertTriangle,
  XCircle, CheckCircle, ChevronRight, CalendarDays,
} from 'lucide-react'

interface Station {
  id: string
  name: string
  weekly_hours_budget: number
  budget_warning_pct: number
}

interface DTRSummary {
  station_id: string | null
  regular_hours: number
  overtime_hours: number
}

interface UrgentPermit {
  id: string
  permit_type: string
  agency: string
  due_date: string
  status: string
  stations: { name: string } | null
}

interface PayrollRun {
  id: string
  cutoff_start: string
  cutoff_end: string
  status: string
  stations: { name: string } | null
}

function fmt(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function StatCard({
  label, value, sub, href, icon: Icon, accent,
}: {
  label: string
  value: string | number
  sub?: string
  href: string
  icon: any
  accent?: 'red' | 'yellow' | 'green' | 'blue'
}) {
  const colors = {
    red:    'bg-red-50 text-red-600 border-red-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    green:  'bg-green-50 text-green-600 border-green-100',
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
  }
  const iconBg = accent ? colors[accent] : 'bg-gray-50 text-gray-500 border-gray-100'

  return (
    <Link href={href} className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm flex items-center gap-4 hover:border-blue-200 transition-colors group">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 truncate">{label}</div>
        <div className="text-xl font-semibold text-gray-900 leading-tight">{value}</div>
        {sub && <div className="text-xs text-gray-400 truncate">{sub}</div>}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
    </Link>
  )
}

export default function DashboardHome({
  role,
  stations,
  dtrEntries,
  weekStart,
  weekEnd,
  urgentPermits,
  latestPayroll,
  currentCutoff,
  today,
}: {
  role: string
  stations: Station[]
  dtrEntries: DTRSummary[]
  weekStart: string
  weekEnd: string
  urgentPermits: UrgentPermit[]
  latestPayroll: PayrollRun | null
  currentCutoff: { start: string; end: string; isFirst: boolean }
  today: string
}) {
  const isTL = role === 'tl'

  // Hours summary
  const usedByStation: Record<string, number> = {}
  for (const e of dtrEntries) {
    const sid = e.station_id ?? 'unassigned'
    usedByStation[sid] = (usedByStation[sid] ?? 0) + e.regular_hours + e.overtime_hours
  }
  const totalUsed = stations.reduce((s, st) => s + (usedByStation[st.id] ?? 0), 0)
  const totalBudget = stations.reduce((s, st) => s + st.weekly_hours_budget, 0)
  const overStations = stations.filter(st =>
    st.weekly_hours_budget > 0 && (usedByStation[st.id] ?? 0) > st.weekly_hours_budget
  )
  const hoursAccent = overStations.length > 0 ? 'red' : totalBudget > 0 && (totalUsed / totalBudget) >= 0.8 ? 'yellow' : 'green'

  // Compliance summary
  const overdueCount = urgentPermits.filter(p => p.status === 'overdue' || p.due_date < today).length
  const soonCount = urgentPermits.filter(p => p.due_date >= today && p.status !== 'overdue').length
  const complianceAccent = overdueCount > 0 ? 'red' : soonCount > 0 ? 'yellow' : 'green'

  const ws = new Date(weekStart + 'T00:00:00')
  const we = new Date(weekEnd + 'T00:00:00')
  const weekLabel = `${ws.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date(today + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label={`Hours this week (${weekLabel})`}
          value={`${totalUsed.toFixed(0)} / ${totalBudget} hrs`}
          sub={overStations.length > 0 ? `${overStations.length} station${overStations.length > 1 ? 's' : ''} over budget` : `${(totalBudget - totalUsed).toFixed(0)} hrs remaining`}
          href="/hours"
          icon={Clock}
          accent={hoursAccent}
        />
        <StatCard
          label="Compliance alerts"
          value={overdueCount > 0 ? `${overdueCount} overdue` : soonCount > 0 ? `${soonCount} due soon` : 'All clear'}
          sub={overdueCount > 0 ? 'Immediate action needed' : soonCount > 0 ? 'Due within 7 days' : 'No pending items'}
          href="/permits"
          icon={FileCheck}
          accent={complianceAccent}
        />
        {!isTL && (
          <StatCard
            label={`Payroll cutoff — ${currentCutoff.isFirst ? '1st' : '2nd'} (${fmt(currentCutoff.start)} – ${fmt(currentCutoff.end)})`}
            value={latestPayroll ? 'Draft in progress' : 'No active run'}
            sub={latestPayroll ? `Started for period ${fmt(latestPayroll.cutoff_start)} – ${fmt(latestPayroll.cutoff_end)}` : 'Start a new payroll run'}
            href="/payroll"
            icon={Banknote}
            accent="blue"
          />
        )}
        <StatCard
          label="DTR entry"
          value="Enter hours"
          sub={`Current cutoff: ${fmt(currentCutoff.start)} – ${fmt(currentCutoff.end)}`}
          href="/dtr"
          icon={CalendarDays}
          accent="blue"
        />
      </div>

      {/* Urgent compliance items */}
      {urgentPermits.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-gray-700">Compliance — needs attention</h2>
          </div>
          <div className="space-y-2">
            {urgentPermits.map(p => {
              const overdue = p.due_date < today || p.status === 'overdue'
              return (
                <Link
                  key={p.id}
                  href="/permits"
                  className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm hover:border-blue-200 transition-colors group"
                >
                  {overdue
                    ? <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    : <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.permit_type}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {p.agency} · {p.stations?.name ?? 'All stations'} · Due {fmt(p.due_date)}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    overdue ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                  }`}>
                    {overdue ? 'Overdue' : 'Due soon'}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Hours per station — mini view */}
      {!isTL && stations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Station hours — week of {weekLabel}</h2>
            <Link href="/hours" className="text-xs text-blue-600 hover:underline">View all →</Link>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            {stations.map((st, i) => {
              const used = usedByStation[st.id] ?? 0
              const budget = st.weekly_hours_budget
              const pct = budget > 0 ? Math.min((used / budget) * 100, 100) : 0
              const over = budget > 0 && used > budget
              const warn = !over && pct >= st.budget_warning_pct

              return (
                <div key={st.id} className={`px-4 py-3 flex items-center gap-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                  {over
                    ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    : warn
                    ? <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    : <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />}
                  <span className="text-sm text-gray-700 w-44 truncate">{st.name}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${over ? 'bg-red-400' : warn ? 'bg-yellow-400' : 'bg-green-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-24 text-right flex-shrink-0">
                    {used.toFixed(0)} / {budget} hrs
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
