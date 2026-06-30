'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Station } from '@/types/database'

export default function NewEmployeeButton({
  orgId,
  stations,
}: {
  orgId: string
  stations: Pick<Station, 'id' | 'name'>[]
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    full_name: '',
    position: '',
    station_id: '',
    daily_rate: '',
    employment_type: 'regular',
    has_sil: false,
    coop_saving_amount: '0',
    date_hired: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await supabase.from('employees').insert({
      org_id: orgId,
      full_name: form.full_name,
      position: form.position || null,
      station_id: form.station_id || null,
      daily_rate: parseFloat(form.daily_rate) || 0,
      employment_type: form.employment_type,
      has_sil: form.has_sil,
      coop_saving_amount: parseFloat(form.coop_saving_amount) || 0,
      date_hired: form.date_hired || null,
      is_active: true,
    })

    setSaving(false)
    setOpen(false)
    setForm({ full_name: '', position: '', station_id: '', daily_rate: '', employment_type: 'regular', has_sil: false, coop_saving_amount: '0', date_hired: '' })
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Employee
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Add Employee</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full name *</label>
                <input
                  required
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Juan dela Cruz"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
                  <input
                    value={form.position}
                    onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cashier"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date hired</label>
                  <input
                    type="date"
                    value={form.date_hired}
                    onChange={e => setForm(f => ({ ...f, date_hired: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {stations.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Station</label>
                  <select
                    value={form.station_id}
                    onChange={e => setForm(f => ({ ...f, station_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— not assigned —</option>
                    {stations.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employment type</label>
                <select
                  value={form.employment_type}
                  onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="regular">Regular</option>
                  <option value="probationary">Probationary</option>
                  <option value="ojt">OJT</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Daily rate (₱) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.daily_rate}
                    onChange={e => setForm(f => ({ ...f, daily_rate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Coop saving/cutoff (₱)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.coop_saving_amount}
                    onChange={e => setForm(f => ({ ...f, coop_saving_amount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.has_sil}
                  onChange={e => setForm(f => ({ ...f, has_sil: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Eligible for SIL (Service Incentive Leave)</span>
              </label>

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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
