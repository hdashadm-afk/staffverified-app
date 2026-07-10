'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LeaveRequestWithEmployee } from '@/types/database'
import { Check, X, Clock } from 'lucide-react'

const SIL_DAYS_PER_YEAR = 5 // PH statutory Service Incentive Leave minimum

const TYPE_LABELS: Record<string, string> = {
  sil: 'SIL',
  vacation: 'Vacation',
  sick: 'Sick',
  special: 'Special',
  other: 'Other',
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function LeaveList({
  requests,
  employees,
}: {
  requests: LeaveRequestWithEmployee[]
  employees: { id: string; full_name: string; has_sil: boolean }[]
}) {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function setStatus(id: string, status: 'approved' | 'rejected') {
    setBusyId(id)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    await supabase
      .from('leave_requests')
      .update({ status, approved_by: user?.id ?? null, approved_at: new Date().toISOString() })
      .eq('id', id)
    setBusyId(null)
    router.refresh()
  }

  const currentYear = new Date().getFullYear()
  const silBalances = employees
    .filter(e => e.has_sil)
    .map(emp => {
      const used = requests
        .filter(
          r =>
            r.employee_id === emp.id &&
            r.leave_type === 'sil' &&
            r.status === 'approved' &&
            new Date(r.start_date).getFullYear() === currentYear
        )
        .reduce((sum, r) => sum + r.days_requested, 0)
      return { id: emp.id, name: emp.full_name, used, remaining: Math.max(0, SIL_DAYS_PER_YEAR - used) }
    })

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const filtered = filter === 'pending' ? requests.filter(r => r.status === 'pending') : requests

  return (
    <div className="space-y-6">
      {/* SIL balances */}
      {silBalances.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">
            SIL balances ({currentYear}) — {SIL_DAYS_PER_YEAR} days/year
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {silBalances.map(b => (
              <div key={b.id} className="border border-gray-100 rounded-lg px-3 py-2">
                <div className="text-xs font-medium text-gray-700 truncate">{b.name}</div>
                <div className="text-sm mt-0.5">
                  <span className="font-semibold text-gray-900">{b.remaining}</span>
                  <span className="text-gray-400"> / {SIL_DAYS_PER_YEAR} left</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {(['pending', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f === 'pending' ? `Pending (${pendingCount})` : `All (${requests.length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl px-6 py-12 text-center text-gray-400 text-sm">
          {filter === 'pending' ? 'No pending requests — all caught up.' : 'No leave requests yet.'}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-50">
          {filtered.map(r => (
            <div key={r.id} className="px-5 py-4 flex items-start gap-4">
              <Clock className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-gray-900">{r.employees?.full_name ?? 'Unknown'}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {TYPE_LABELS[r.leave_type] ?? r.leave_type}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[r.status]}`}>
                    {r.status}
                  </span>
                  {!r.is_paid && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Unpaid</span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(r.start_date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  {' – '}
                  {new Date(r.end_date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' · '}
                  <span className="font-medium">{r.days_requested}</span> day{r.days_requested === 1 ? '' : 's'}
                </div>
                {r.reason && <p className="text-sm text-gray-500 mt-1">{r.reason}</p>}
              </div>

              {r.status === 'pending' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setStatus(r.id, 'approved')}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => setStatus(r.id, 'rejected')}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium rounded-lg px-3 py-1.5 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
