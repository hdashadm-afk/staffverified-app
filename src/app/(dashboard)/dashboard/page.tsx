import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, FileCheck, Banknote, RefreshCw, Users, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cutoffStart as weekStart, cutoffEnd as weekEnd } from '@/lib/cutoff'
import { canAccess, landingFor } from '@/lib/access'

const peso = (n: number) =>
  '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')
  if (!canAccess('/dashboard', profile.role)) redirect(landingFor(profile.role))

  const orgId = profile.org_id
  const ws = weekStart(new Date())
  const we = weekEnd(ws)
  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]

  const [{ data: stations }, { data: dtr }, { data: permits }, { data: payroll }, { data: remit }, { data: employees }] =
    await Promise.all([
      supabase.from('stations').select('id, name, weekly_hours_budget, budget_warning_pct').eq('org_id', orgId).order('name'),
      supabase.from('dtr_entries').select('station_id, regular_hours, overtime_hours').eq('org_id', orgId).gte('work_date', ws).lte('work_date', we),
      supabase.from('permits').select('station_id, permit_type, due_date, status').eq('org_id', orgId),
      supabase.from('payroll_runs').select('station_id, status, cutoff_end').eq('org_id', orgId),
      supabase.from('remittance_reconciliations').select('variance').eq('org_id', orgId),
      supabase.from('employees').select('station_id, is_active').eq('org_id', orgId),
    ])

  const sList = stations ?? []

  // Hours actual per station
  const hoursByStation = new Map<string, number>()
  for (const e of dtr ?? []) {
    const h = (e.regular_hours ?? 0) + (e.overtime_hours ?? 0)
    hoursByStation.set(e.station_id, (hoursByStation.get(e.station_id) ?? 0) + h)
  }
  const stationsOverBudget = sList.filter(s => {
    const actual = hoursByStation.get(s.id) ?? 0
    return s.weekly_hours_budget > 0 && actual > s.weekly_hours_budget
  })

  // Permits
  const overdue = (permits ?? []).filter(p => p.due_date && p.due_date < today && p.status !== 'completed')
  const dueSoon = (permits ?? []).filter(p => p.due_date && p.due_date >= today && p.due_date <= in30 && p.status !== 'completed')
  const openPermitsByStation = new Map<string, number>()
  for (const p of [...overdue, ...dueSoon]) {
    if (p.station_id) openPermitsByStation.set(p.station_id, (openPermitsByStation.get(p.station_id) ?? 0) + 1)
  }

  // Payroll
  const openPayroll = (payroll ?? []).filter(p => p.status !== 'completed')
  const nextCutoff = openPayroll.map(p => p.cutoff_end).filter(Boolean).sort()[0] ?? null

  // Remittance variance
  const totalVariance = (remit ?? []).reduce((sum, r) => sum + Math.abs(Number(r.variance) || 0), 0)
  const varianceCount = (remit ?? []).filter(r => Number(r.variance) !== 0).length

  // Headcount
  const activeHead = (employees ?? []).filter(e => e.is_active).length
  const headByStation = new Map<string, number>()
  for (const e of employees ?? []) {
    if (e.is_active && e.station_id) headByStation.set(e.station_id, (headByStation.get(e.station_id) ?? 0) + 1)
  }

  const cards = [
    { label: 'Stations over hours budget', value: `${stationsOverBudget.length} / ${sList.length}`, ok: stationsOverBudget.length === 0, icon: Clock, href: '/hours' },
    { label: 'Compliance — overdue / due soon', value: `${overdue.length} / ${dueSoon.length}`, ok: overdue.length === 0, icon: FileCheck, href: '/permits' },
    { label: 'Open payroll runs', value: `${openPayroll.length}${nextCutoff ? ` · next ${nextCutoff}` : ''}`, ok: openPayroll.length === 0, icon: Banknote, href: '/payroll' },
    { label: 'Remittance variance', value: varianceCount === 0 ? 'Clean' : `${peso(totalVariance)} (${varianceCount})`, ok: varianceCount === 0, icon: RefreshCw, href: '/remittance' },
    { label: 'Active staff', value: `${activeHead}`, ok: true, icon: Users, href: '/employees' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Bird&apos;s-eye view across all stations · week {ws} to {we}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {cards.map(c => (
          <Link key={c.label} href={c.href}
            className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <c.icon className="w-4 h-4 text-gray-400" />
              {c.ok
                ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                : <AlertTriangle className="w-4 h-4 text-amber-500" />}
            </div>
            <div className={`text-lg font-semibold ${c.ok ? 'text-gray-900' : 'text-amber-600'}`}>{c.value}</div>
            <div className="text-xs text-gray-500 mt-0.5 leading-tight">{c.label}</div>
          </Link>
        ))}
      </div>

      {/* Per-station table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Per-station status</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Station</th>
              <th className="px-4 py-2 font-medium text-right">Staff</th>
              <th className="px-4 py-2 font-medium text-right">Hours (wk)</th>
              <th className="px-4 py-2 font-medium text-right">Budget</th>
              <th className="px-4 py-2 font-medium text-right">Open permits</th>
              <th className="px-4 py-2 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {sList.map(s => {
              const actual = hoursByStation.get(s.id) ?? 0
              const over = s.weekly_hours_budget > 0 && actual > s.weekly_hours_budget
              const permitsOpen = openPermitsByStation.get(s.id) ?? 0
              const flagged = over || permitsOpen > 0
              return (
                <tr key={s.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{headByStation.get(s.id) ?? 0}</td>
                  <td className={`px-4 py-2.5 text-right ${over ? 'text-amber-600 font-semibold' : 'text-gray-600'}`}>{actual}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{s.weekly_hours_budget}</td>
                  <td className={`px-4 py-2.5 text-right ${permitsOpen > 0 ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>{permitsOpen || '—'}</td>
                  <td className="px-4 py-2.5 text-center">
                    {flagged
                      ? <span className="inline-flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="w-3 h-3" /> Check</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" /> OK</span>}
                  </td>
                </tr>
              )
            })}
            {sList.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No stations yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
