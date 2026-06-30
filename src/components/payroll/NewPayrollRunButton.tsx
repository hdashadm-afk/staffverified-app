'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Station } from '@/types/database'
import { currentCutoff } from '@/lib/cutoff'

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
  const router = useRouter()
  const supabase = createClient()

  // Default to current weekly cutoff (Thu -> Wed, payday Fri)
  const { start: defaultStart, end: defaultEnd } = currentCutoff()

  const [form, setForm] = useState({
    cutoff_start: defaultStart,
    cutoff_end: defaultEnd,
    station_id: '',
    notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await supabase.from('payroll_runs').insert({
      org_id: orgId,
      station_id: form.station_id || null,
      cutoff_start: form.cutoff_start,
      cutoff_end: form.cutoff_end,
      notes: form.notes || null,
      prepared_by: userId,
      status: 'draft',
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cutoff start *</label>
                  <input
                    type="date"
                    required
                    value={form.cutoff_start}
                    onChange={e => setForm(f => ({ ...f, cutoff_start: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cutoff end *</label>
                  <input
                    type="date"
                    required
                    value={form.cutoff_end}
                    onChange={e => setForm(f => ({ ...f, cutoff_end: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {stations.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Station (optional)</label>
                  <select
                    value={form.station_id}
                    onChange={e => setForm(f => ({ ...f, station_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50"
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
