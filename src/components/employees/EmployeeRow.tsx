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

  const [form, setForm] = useState({
    full_name: employee.full_name,
    position: employee.position ?? '',
    station_id: employee.station_id ?? '',
    daily_rate: employee.daily_rate.toString(),
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
        has_sil: form.has_sil,
        coop_saving_amount: parseFloat(form.coop_saving_amount) || 0,
        is_active: form.is_active,
      })
      .eq('id', employee.id)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  if (editing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-5 py-3">
          <input
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </td>
        <td className="px-4 py-3">
          <input
            value={form.position}
            onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
            className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Position"
          />
        </td>
        <td className="px-4 py-3">
          <select
            value={form.station_id}
            onChange={e => setForm(f => ({ ...f, station_id: e.target.value }))}
            className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">—</option>
            {stations.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <input
            type="number"
            min="0"
            value={form.daily_rate}
            onChange={e => setForm(f => ({ ...f, daily_rate: e.target.value }))}
            className="w-24 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={form.has_sil}
            onChange={e => setForm(f => ({ ...f, has_sil: e.target.checked }))}
            className="rounded"
          />
        </td>
        <td className="px-4 py-3">
          <select
            value={form.is_active ? 'active' : 'inactive'}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'active' }))}
            className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2 justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="text-green-600 hover:text-green-700 disabled:opacity-50"
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600" title="Cancel">
              <X className="w-4 h-4" />
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
