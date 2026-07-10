'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { PayrollRunType, Station } from '@/types/database'
import { currentCutoff } from '@/lib/cutoff'

const RUN_TYPE_OPTIONS: { value: PayrollRunType; label: string; hint: string }[] = [
  { value: 'regular', label: 'Regular', hint: 'Generated from DTR for the cutoff below' },
  { value: '13th_month', label: '13th Month Pay', hint: 'Auto-computed from basic pay earned in the year below' },
  { value: 'bonus', label: 'Bonus', hint: 'Manual amount per employee' },
  { value: 'adjustment', label: 'Adjustment', hint: 'Manual amount per employee' },
]

function currentYearRange(): { start: string; end: string } {
  const year = new Date().getFullYear()
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

export default function NewPayrollRunButton({
  orgId,
  userId,
  stations,
}: {
  orgId: string
  userId: string
  stations: Pick<Station, 'id' | 'name'>[]
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Default to current weekly cutoff (Thu -> Wed, payday Fri)
  const { start: defaultStart, end: defaultEnd } = currentCutoff()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    run_type: 'regular' as PayrollRunType,
    cutoff_start: defaultStart,
    cutoff_end: defaultEnd,
    station_id: '',
    notes: '',
  })

  function setRunType(run_type: PayrollRunType) {
    if (run_type === '13th_month') {
      const { start, end } = currentYearRange()
      setForm(f => ({ ...f, run_type, cutoff_start: start, cutoff_end: end }))
    } else if (run_type === 'bonus' || run_type === 'adjustment') {
      setForm(f => ({ ...f, run_type, cutoff_start: today, cutoff_end: today }))
    } else {
      setForm(f => ({ ...f, run_type, cutoff_start: defaultStart, cutoff_end: defaultEnd }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error: insertError } = await supabase.from('payroll_runs').insert({
      org_id: orgId,
      station_id: form.station_id || null,
      run_type: form.run_type,
      cutoff_start: form.cutoff_start,
      cutoff_end: form.cutoff_end,
      notes: form.notes || null,
      prepared_by: userId,
      status: 'draft',
    })

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setOpen(false)
    router.refresh()
  }

  const selectedType = RUN_TYPE_OPTIONS.find(o => o.value === form.run_type)!
  const isOffCycle = form.run_type !== 'regular'

  return (
    <>
      <button
        onClick={() => { setError(null); setOpen(true) }}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Payroll Run
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">New Payroll Run</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Run type *</label>
                <select
                  value={form.run_type}
                  onChange={e => setRunType(e.target.value as PayrollRunType)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {RUN_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">{selectedType.hint}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {form.run_type === '13th_month' ? 'Year start *' : isOffCycle ? 'Date *' : 'Cutoff start *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={form.cutoff_start}
                    onChange={e => setForm(f => ({ ...f, cutoff_start: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {form.run_type === '13th_month' ? 'Year end *' : isOffCycle ? 'Date (end) *' : 'Cutoff end *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={form.cutoff_end}
                    onChange={e => setForm(f => ({ ...f, cutoff_end: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {stations.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Station (optional)</label>
                  <select
                    value={form.station_id}
                    onChange={e => setForm(f => ({ ...f, station_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">All stations</option>
                    {stations.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}

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
                  {saving ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
