'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { LeaveType } from '@/types/database'

const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: 'sil',      label: 'SIL (Service Incentive Leave)' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick',     label: 'Sick' },
  { value: 'special',  label: 'Special' },
  { value: 'other',    label: 'Other' },
]

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return Math.max(0, diff)
}

export default function NewLeaveRequestButton({
  orgId,
  userId,
  employees,
}: {
  orgId: string
  userId: string
  employees: { id: string; full_name: string; has_sil: boolean }[]
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const emptyForm = {
    employee_id: employees[0]?.id ?? '',
    leave_type: 'vacation' as LeaveType,
    start_date: '',
    end_date: '',
    days_requested: '',
    is_paid: true,
    reason: '',
  }
  const [form, setForm] = useState(emptyForm)

  function setDates(patch: Partial<{ start_date: string; end_date: string }>) {
    setForm(f => {
      const next = { ...f, ...patch }
      const computed = daysBetween(next.start_date, next.end_date)
      return { ...next, days_requested: computed > 0 ? String(computed) : f.days_requested }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await supabase.from('leave_requests').insert({
      org_id: orgId,
      employee_id: form.employee_id,
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      days_requested: parseFloat(form.days_requested) || 0,
      is_paid: form.is_paid,
      reason: form.reason || null,
      status: 'pending',
      requested_by: userId,
    })

    setSaving(false)
    setOpen(false)
    setForm(emptyForm)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Leave Request
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">New Leave Request</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employee *</label>
                <select
                  required
                  value={form.employee_id}
                  onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Leave type *</label>
                <select
                  required
                  value={form.leave_type}
                  onChange={e => setForm(f => ({ ...f, leave_type: e.target.value as LeaveType }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {LEAVE_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start date *</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={e => setDates({ start_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End date *</label>
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={e => setDates({ end_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Days requested *</label>
                <input
                  type="number"
                  required
                  min="0.5"
                  step="0.5"
                  value={form.days_requested}
                  onChange={e => setForm(f => ({ ...f, days_requested: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-xs text-gray-400 mt-1">Auto-filled from dates — adjust for half-days.</p>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_paid}
                  onChange={e => setForm(f => ({ ...f, is_paid: e.target.checked }))}
                  className="rounded"
                />
                Paid leave
              </label>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg py-2.5 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
