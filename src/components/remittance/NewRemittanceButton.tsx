'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

const AGENCIES = ['SSS', 'PhilHealth', 'HDMF']

export default function NewRemittanceButton({
  orgId,
  userId,
  runs,
}: {
  orgId: string
  userId: string
  runs: { id: string; cutoff_start: string; cutoff_end: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = today.slice(0, 8) + '01'
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]

  const [form, setForm] = useState({
    agency: 'SSS',
    period_start: firstOfMonth,
    period_end: endOfMonth,
    total_deducted: '',
    total_remitted: '',
    payroll_run_id: '',
    reference_number: '',
    notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await supabase.from('remittance_reconciliations').insert({
      org_id: orgId,
      agency: form.agency,
      period_start: form.period_start,
      period_end: form.period_end,
      total_deducted: parseFloat(form.total_deducted) || 0,
      total_remitted: parseFloat(form.total_remitted) || 0,
      payroll_run_id: form.payroll_run_id || null,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
      submitted_by: userId,
    })

    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Record
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">New Remittance Record</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {AGENCIES.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, agency: a }))}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.agency === a
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Period start</label>
                  <input type="date" required value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Period end</label>
                  <input type="date" required value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total deducted (₱)</label>
                  <input type="number" min="0" step="0.01" required value={form.total_deducted}
                    onChange={e => setForm(f => ({ ...f, total_deducted: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Total remitted (₱)</label>
                  <input type="number" min="0" step="0.01" required value={form.total_remitted}
                    onChange={e => setForm(f => ({ ...f, total_remitted: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reference / SBR number</label>
                <input value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional — agency confirmation number" />
              </div>

              {runs.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Link to payroll run (optional)</label>
                  <select value={form.payroll_run_id} onChange={e => setForm(f => ({ ...f, payroll_run_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— not linked —</option>
                    {runs.map(r => (
                      <option key={r.id} value={r.id}>
                        {new Date(r.cutoff_start + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} –{' '}
                        {new Date(r.cutoff_end + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg py-2.5 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
