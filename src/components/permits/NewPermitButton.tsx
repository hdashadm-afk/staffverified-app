'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Station } from '@/types/database'

const PRESET_TYPES = [
  { label: 'SSS Remittance', agency: 'SSS' },
  { label: 'PhilHealth Remittance', agency: 'PhilHealth' },
  { label: 'Pag-IBIG/HDMF Remittance', agency: 'HDMF' },
  { label: 'DOE Pump Price Report', agency: 'DOE' },
  { label: 'BIR EMFC', agency: 'BIR' },
  { label: 'BIR BLDC', agency: 'BIR' },
  { label: 'Notice to Explain (NTE)', agency: 'Other' },
  { label: '201 File Update', agency: 'Other' },
]

const RECURRENCE_OPTIONS = [
  { value: '', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export default function NewPermitButton({
  orgId,
  stations,
  userId,
}: {
  orgId: string
  stations: Pick<Station, 'id' | 'name'>[]
  userId: string
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    permit_type: '',
    agency: '',
    description: '',
    station_id: '',
    due_date: '',
    recurrence_rule: '',
    notes: '',
    amount_due: '',
  })

  function applyPreset(preset: { label: string; agency: string }) {
    setForm(f => ({ ...f, permit_type: preset.label, agency: preset.agency }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await supabase.from('permits').insert({
      org_id: orgId,
      station_id: form.station_id || null,
      permit_type: form.permit_type,
      agency: form.agency,
      description: form.description || null,
      due_date: form.due_date,
      is_recurring: !!form.recurrence_rule,
      recurrence_rule: form.recurrence_rule || null,
      notes: form.notes || null,
      amount_due: form.amount_due ? Number(form.amount_due) : null,
      status: 'pending',
    })

    setSaving(false)
    setOpen(false)
    setForm({ permit_type: '', agency: '', description: '', station_id: '', due_date: '', recurrence_rule: '', notes: '', amount_due: '' })
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Submission
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">New Compliance Record</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Presets */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Quick select</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TYPES.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        form.permit_type === p.label
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Submission type *</label>
                <input
                  required
                  value={form.permit_type}
                  onChange={e => setForm(f => ({ ...f, permit_type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g. SSS Remittance"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Agency *</label>
                <input
                  required
                  value={form.agency}
                  onChange={e => setForm(f => ({ ...f, agency: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g. SSS, BIR, DOE"
                />
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Due date *</label>
                <input
                  type="date"
                  required
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount due (₱, optional)</label>
                <input
                  type="number"
                  value={form.amount_due}
                  onChange={e => setForm(f => ({ ...f, amount_due: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g. 15000"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Recurrence</label>
                <select
                  value={form.recurrence_rule}
                  onChange={e => setForm(f => ({ ...f, recurrence_rule: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {RECURRENCE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description / notes</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  placeholder="Optional details…"
                />
              </div>

              <div className="flex gap-3 pt-2">
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
