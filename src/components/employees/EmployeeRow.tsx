'use client'

import { useState } from 'react'
import { Employee, Station } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Pencil, X, Check } from 'lucide-react'

export default function EmployeeRow({
  employee,
  stations,
}: {
  employee: Employee & { stations: { name: string } | null }
  stations: Pick<Station, 'id' | 'name'>[]
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const e = employee as Employee & {
    employment_type?: string
    date_hired?: string | null
    sss_no?: string | null
    philhealth_no?: string | null
    pagibig_no?: string | null
    tin_no?: string | null
  }
  const [form, setForm] = useState({
    full_name: employee.full_name,
    position: employee.position ?? '',
    station_id: employee.station_id ?? '',
    daily_rate: employee.daily_rate.toString(),
    employment_type: e.employment_type ?? 'regular',
    date_hired: e.date_hired ?? '',
    sss_no: e.sss_no ?? '',
    philhealth_no: e.philhealth_no ?? '',
    pagibig_no: e.pagibig_no ?? '',
    tin_no: e.tin_no ?? '',
    has_sil: employee.has_sil,
    coop_saving_amount: employee.coop_saving_amount.toString(),
    is_active: employee.is_active,
  })

  async function save() {
    setSaving(true)
    await supabase
      .from('employees')
      .update({
        full_name: form.full_name,
        position: form.position || null,
        station_id: form.station_id || null,
        daily_rate: parseFloat(form.daily_rate) || 0,
        employment_type: form.employment_type,
        date_hired: form.date_hired || null,
        sss_no: form.sss_no || null,
        philhealth_no: form.philhealth_no || null,
        pagibig_no: form.pagibig_no || null,
        tin_no: form.tin_no || null,
        has_sil: form.has_sil,
        coop_saving_amount: parseFloat(form.coop_saving_amount) || 0,
        is_active: form.is_active,
      })
      .eq('id', employee.id)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  const fld = 'w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'
  const lbl = 'block text-[11px] font-medium text-gray-500 mb-1'

  if (editing) {
    return (
      <tr className="bg-blue-50/60">
        <td colSpan={8} className="px-5 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Full name</label>
              <input value={form.full_name} onChange={ev => setForm(f => ({ ...f, full_name: ev.target.value }))} className={fld} />
            </div>
            <div>
              <label className={lbl}>Position</label>
              <input value={form.position} onChange={ev => setForm(f => ({ ...f, position: ev.target.value }))} className={fld} placeholder="Attendant" />
            </div>
            <div>
              <label className={lbl}>Station (home)</label>
              <select value={form.station_id} onChange={ev => setForm(f => ({ ...f, station_id: ev.target.value }))} className={fld}>
                <option value="">— roving / none —</option>
                {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              <label className={lbl}>Daily rate (₱)</label>
              <input type="number" min="0" value={form.daily_rate} onChange={ev => setForm(f => ({ ...f, daily_rate: ev.target.value }))} className={fld} />
            </div>
            <div>
              <label className={lbl}>Coop saving / cutoff (₱)</label>
              <input type="number" min="0" value={form.coop_saving_amount} onChange={ev => setForm(f => ({ ...f, coop_saving_amount: ev.target.value }))} className={fld} />
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

            <div className="flex items-center gap-2">
              <input id={`sil-${employee.id}`} type="checkbox" checked={form.has_sil} onChange={ev => setForm(f => ({ ...f, has_sil: ev.target.checked }))} className="rounded" />
              <label htmlFor={`sil-${employee.id}`} className="text-sm text-gray-700">SIL eligible</label>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select value={form.is_active ? 'active' : 'inactive'} onChange={ev => setForm(f => ({ ...f, is_active: ev.target.value === 'active' }))} className={fld}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <button onClick={() => setEditing(false)} className="border border-gray-200 text-gray-700 text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50">
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
      <td className="px-4 py-3 text-gray-600">{employee.position ?? '—'}</td>
      <td className="px-4 py-3 text-gray-600">{employee.stations?.name ?? '—'}</td>
      <td className="px-4 py-3">
        {(() => {
          const t = (employee as { employment_type?: string }).employment_type ?? 'regular'
          const styles: Record<string, string> = {
            regular: 'bg-blue-50 text-blue-700',
            probationary: 'bg-amber-50 text-amber-700',
            ojt: 'bg-purple-50 text-purple-700',
          }
          const label: Record<string, string> = { regular: 'Regular', probationary: 'Proba', ojt: 'OJT' }
          return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[t]}`}>{label[t]}</span>
        })()}
      </td>
      <td className="px-4 py-3 text-right text-gray-900">
        ₱{employee.daily_rate.toLocaleString()}
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
        <button
          onClick={() => setEditing(true)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}
