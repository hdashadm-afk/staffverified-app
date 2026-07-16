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
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    full_name: '',
    position: '',
    station_id: '',
    daily_rate: '',
    allowance: '0',
    employment_type: 'regular',
    has_sil: false,
    coop_saving_amount: '0',
    date_hired: '',
    sss_no: '',
    philhealth_no: '',
    pagibig_no: '',
    tin_no: '',
    bank_name: '',
    bank_account_no: '',
    bank_account_name: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error: insertError } = await supabase.from('employees').insert({
      org_id: orgId,
      full_name: form.full_name,
      position: form.position || null,
      station_id: form.station_id || null,
      daily_rate: parseFloat(form.daily_rate) || 0,
      allowance: parseFloat(form.allowance) || 0,
      employment_type: form.employment_type,
      has_sil: form.has_sil,
      coop_saving_amount: parseFloat(form.coop_saving_amount) || 0,
      date_hired: form.date_hired || null,
      sss_no: form.sss_no || null,
      philhealth_no: form.philhealth_no || null,
      pagibig_no: form.pagibig_no || null,
      tin_no: form.tin_no || null,
      bank_name: form.bank_name || null,
      bank_account_no: form.bank_account_no || null,
      bank_account_name: form.bank_account_name || null,
      is_active: true,
    })

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setOpen(false)
    setForm({
      full_name: '', position: '', station_id: '', daily_rate: '', employment_type: 'regular',
      allowance: '0', has_sil: false, coop_saving_amount: '0', date_hired: '', sss_no: '', philhealth_no: '',
      pagibig_no: '', tin_no: '', bank_name: '', bank_account_no: '', bank_account_name: '',
    })
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => { setError(null); setOpen(true) }}
        className="flex items-center gap-2 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
                  placeholder="Juan dela Cruz"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
                  <input
                    value={form.position}
                    onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
                    placeholder="Cashier"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Employment type</label>
                  <select
                    value={form.employment_type}
                    onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
                  >
                    <option value="regular">Regular</option>
                    <option value="probationary">Probationary</option>
                    <option value="ojt">OJT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date hired</label>
                <input
                  type="date"
                  value={form.date_hired}
                  onChange={e => setForm(f => ({ ...f, date_hired: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
                />
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
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
                    placeholder="600"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">For a standard 8-hour work day</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Allowance (₱/day)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.allowance}
                    onChange={e => setForm(f => ({ ...f, allowance: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Coop saving/cutoff (₱)</label>
                <input
                  type="number"
                  min="0"
                  value={form.coop_saving_amount}
                  onChange={e => setForm(f => ({ ...f, coop_saving_amount: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SSS No.</label>
                  <input value={form.sss_no} onChange={e => setForm(f => ({ ...f, sss_no: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">PhilHealth No.</label>
                  <input value={form.philhealth_no} onChange={e => setForm(f => ({ ...f, philhealth_no: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pag-IBIG No.</label>
                  <input value={form.pagibig_no} onChange={e => setForm(f => ({ ...f, pagibig_no: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">TIN</label>
                  <input value={form.tin_no} onChange={e => setForm(f => ({ ...f, tin_no: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bank name</label>
                  <input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                    placeholder="BDO"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bank account no.</label>
                  <input value={form.bank_account_no} onChange={e => setForm(f => ({ ...f, bank_account_no: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Account name</label>
                  <input value={form.bank_account_name} onChange={e => setForm(f => ({ ...f, bank_account_name: e.target.value }))}
                    placeholder="Defaults to full name"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600" />
                </div>
              </div>

              {stations.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Station *</label>
                  <select
                    required
                    value={form.station_id}
                    onChange={e => setForm(f => ({ ...f, station_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
                  >
                    <option value="" disabled>— select station —</option>
                    {stations.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.has_sil}
                  onChange={e => setForm(f => ({ ...f, has_sil: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Eligible for SIL (Service Incentive Leave)</span>
              </label>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}

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
                  className="flex-1 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50"
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
