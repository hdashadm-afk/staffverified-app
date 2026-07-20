'use client'

import { useState } from 'react'
import { Employee, Position, Station } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Pencil, X, Check } from 'lucide-react'
import EmployeeDeductionSettings from './EmployeeDeductionSettings'

export default function EmployeeRow({
  employee,
  stations,
  positions,
}: {
  employee: Employee & { stations: { name: string } | null }
  stations: Pick<Station, 'id' | 'name'>[]
  positions: Pick<Position, 'id' | 'name'>[]
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    full_name: employee.full_name,
    email: employee.email ?? '',
    position: employee.position ?? '',
    station_id: employee.station_id ?? '',
    daily_rate: employee.daily_rate.toString(),
    allowance: employee.allowance.toString(),
    regular_hours_per_day: employee.regular_hours_per_day.toString(),
    employment_type: employee.employment_type,
    date_hired: employee.date_hired ?? '',
    sss_no: employee.sss_no ?? '',
    philhealth_no: employee.philhealth_no ?? '',
    pagibig_no: employee.pagibig_no ?? '',
    tin_no: employee.tin_no ?? '',
    bank_name: employee.bank_name ?? '',
    bank_account_no: employee.bank_account_no ?? '',
    bank_account_name: employee.bank_account_name ?? '',
    has_sil: employee.has_sil,
    is_active: employee.is_active,
  })

  async function save() {
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('employees')
      .update({
        full_name: form.full_name,
        email: form.email || null,
        position: form.position || null,
        station_id: form.station_id || null,
        daily_rate: parseFloat(form.daily_rate) || 0,
        allowance: parseFloat(form.allowance) || 0,
        regular_hours_per_day: parseInt(form.regular_hours_per_day, 10) || 8,
        employment_type: form.employment_type,
        date_hired: form.date_hired || null,
        sss_no: form.sss_no || null,
        philhealth_no: form.philhealth_no || null,
        pagibig_no: form.pagibig_no || null,
        tin_no: form.tin_no || null,
        bank_name: form.bank_name || null,
        bank_account_no: form.bank_account_no || null,
        bank_account_name: form.bank_account_name || null,
        has_sil: form.has_sil,
        is_active: form.is_active,
      })
      .eq('id', employee.id)
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setEditing(false)
    router.refresh()
  }

  const fld = 'w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue-600'
  const lbl = 'block text-[11px] font-medium text-gray-500 mb-1'

  if (editing) {
    return (
      <tr className="bg-brand-blue-50/60">
        <td colSpan={9} className="px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Full name</label>
              <input value={form.full_name} onChange={ev => setForm(f => ({ ...f, full_name: ev.target.value }))} className={fld} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Email (for payslip delivery)</label>
              <input type="email" value={form.email} onChange={ev => setForm(f => ({ ...f, email: ev.target.value }))} className={fld} placeholder="employee@email.com" />
            </div>
            <div>
              <label className={lbl}>Position</label>
              <select required value={form.position} onChange={ev => setForm(f => ({ ...f, position: ev.target.value }))} className={fld}>
                <option value="" disabled>— select position —</option>
                {positions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Employment type</label>
              <select value={form.employment_type} onChange={ev => setForm(f => ({ ...f, employment_type: ev.target.value }))} className={fld}>
                <option value="regular">Regular</option>
                <option value="probationary">Probationary</option>
                <option value="ojt">OJT</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Date hired</label>
              <input type="date" value={form.date_hired ?? ''} onChange={ev => setForm(f => ({ ...f, date_hired: ev.target.value }))} className={fld} />
            </div>
            <div>
              <label className={lbl}>Daily Basic Rate (₱)</label>
              <input type="number" min="0" value={form.daily_rate} onChange={ev => setForm(f => ({ ...f, daily_rate: ev.target.value }))} className={fld} />
            </div>
            <div>
              <label className={lbl}>Allowance (₱/day)</label>
              <input type="number" min="0" value={form.allowance} onChange={ev => setForm(f => ({ ...f, allowance: ev.target.value }))} className={fld} />
            </div>
            <div>
              <label className={lbl}>Regular hrs/day</label>
              <select value={form.regular_hours_per_day} onChange={ev => setForm(f => ({ ...f, regular_hours_per_day: ev.target.value }))} className={fld}>
                <option value="8">8 Hours</option>
                <option value="10">10 Hours</option>
                <option value="12">12 Hours</option>
              </select>
            </div>
            <div>
              <label className={lbl}>SSS No.</label>
              <input value={form.sss_no} onChange={ev => setForm(f => ({ ...f, sss_no: ev.target.value }))} className={fld} />
            </div>
            <div>
              <label className={lbl}>PhilHealth No.</label>
              <input value={form.philhealth_no} onChange={ev => setForm(f => ({ ...f, philhealth_no: ev.target.value }))} className={fld} />
            </div>
            <div>
              <label className={lbl}>Pag-IBIG No.</label>
              <input value={form.pagibig_no} onChange={ev => setForm(f => ({ ...f, pagibig_no: ev.target.value }))} className={fld} />
            </div>
            <div>
              <label className={lbl}>TIN</label>
              <input value={form.tin_no} onChange={ev => setForm(f => ({ ...f, tin_no: ev.target.value }))} className={fld} />
            </div>
            <div>
              <label className={lbl}>Bank name</label>
              <input value={form.bank_name} onChange={ev => setForm(f => ({ ...f, bank_name: ev.target.value }))} className={fld} placeholder="BDO" />
            </div>
            <div>
              <label className={lbl}>Bank account no.</label>
              <input value={form.bank_account_no} onChange={ev => setForm(f => ({ ...f, bank_account_no: ev.target.value }))} className={fld} />
            </div>
            <div>
              <label className={lbl}>Account name</label>
              <input value={form.bank_account_name} onChange={ev => setForm(f => ({ ...f, bank_account_name: ev.target.value }))} className={fld} placeholder="Defaults to full name" />
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select value={form.is_active ? 'active' : 'inactive'} onChange={ev => setForm(f => ({ ...f, is_active: ev.target.value === 'active' }))} className={fld}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Station *</label>
              <select required value={form.station_id} onChange={ev => setForm(f => ({ ...f, station_id: ev.target.value }))} className={fld}>
                <option value="" disabled>— select station —</option>
                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input id={`sil-${employee.id}`} type="checkbox" checked={form.has_sil} onChange={ev => setForm(f => ({ ...f, has_sil: ev.target.checked }))} className="rounded" />
              <label htmlFor={`sil-${employee.id}`} className="text-sm text-gray-700">SIL eligible</label>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">{error}</p>
          )}

          <div className="flex gap-2 justify-end mt-4">
            <button onClick={() => setEditing(false)} className="border border-gray-200 text-gray-700 text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50">
              <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${!employee.is_active ? 'opacity-50' : ''}`}>
      <td className="px-5 py-3 font-medium text-gray-900">{employee.full_name}</td>
      <td className="px-4 py-3 text-gray-600">
        {employee.email ?? <span className="text-amber-600 text-xs">Missing</span>}
      </td>
      <td className="px-4 py-3 text-gray-600">{employee.position ?? '—'}</td>
      <td className="px-4 py-3 text-gray-600">{employee.stations?.name ?? '—'}</td>
      <td className="px-4 py-3">
        {(() => {
          const t = employee.employment_type || 'regular'
          const styles: Record<string, string> = {
            regular: 'bg-brand-blue-50 text-brand-blue-700',
            probationary: 'bg-amber-50 text-amber-700',
            ojt: 'bg-purple-50 text-purple-700',
          }
          const label: Record<string, string> = { regular: 'Regular', probationary: 'Proba', ojt: 'OJT' }
          return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[t]}`}>{label[t]}</span>
        })()}
      </td>
      <td className="px-4 py-3 text-right text-gray-900">
        ₱{employee.daily_rate.toLocaleString()}
        <span className="text-gray-400 text-xs"> / {employee.regular_hours_per_day}h</span>
      </td>
      <td className="px-4 py-3">
        {employee.has_sil ? (
          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Yes</span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          employee.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {employee.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-3">
          <EmployeeDeductionSettings employeeId={employee.id} orgId={employee.org_id} fullName={employee.full_name} />
          <button
            onClick={() => { setError(null); setEditing(true) }}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}
