'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { computeRegularHours, computeOvertimeHours, computeNightShiftHours } from '@/lib/payroll-math'
import { Check, Loader2 } from 'lucide-react'

type Emp = { id: string; full_name: string; station_id: string | null; daily_rate: number }
type Entry = { employee_id: string; work_date: string; time_in: string | null; time_out: string | null }

export default function DailyAttendance({
  employees,
  entries,
  orgId,
  userId,
}: {
  employees: Emp[]
  entries: Entry[]
  orgId: string
  userId: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Record<string, boolean>>({})

  // entries for the selected date keyed by employee
  const dayEntries = Object.fromEntries(
    entries.filter(e => e.work_date === date).map(e => [e.employee_id, e])
  )

  // local editable state per employee
  const [rows, setRows] = useState<Record<string, { in: string; out: string }>>({})
  const getRow = (id: string) =>
    rows[id] ?? { in: dayEntries[id]?.time_in ?? '', out: dayEntries[id]?.time_out ?? '' }

  function setRow(id: string, patch: Partial<{ in: string; out: string }>) {
    setRows(prev => ({ ...prev, [id]: { ...getRow(id), ...patch } }))
  }

  async function save(emp: Emp) {
    const r = getRow(emp.id)
    setSaving(emp.id)
    const reg = computeRegularHours(r.in, r.out)
    const ot = computeOvertimeHours(r.in, r.out)
    const nsd = computeNightShiftHours(r.in, r.out)
    await supabase.from('dtr_entries').upsert(
      {
        org_id: orgId,
        employee_id: emp.id,
        station_id: emp.station_id,
        work_date: date,
        time_in: r.in || null,
        time_out: r.out || null,
        regular_hours: reg,
        overtime_hours: ot,
        night_shift_hours: nsd,
        late_minutes: 0,
        undertime_minutes: 0,
        entered_by: userId,
      },
      { onConflict: 'employee_id,work_date' }
    )
    setSaving(null)
    setSavedAt(prev => ({ ...prev, [emp.id]: true }))
    setTimeout(() => setSavedAt(prev => ({ ...prev, [emp.id]: false })), 1500)
    router.refresh()
  }

  function markStandard(emp: Emp) {
    setRow(emp.id, { in: '08:00', out: '17:00' })
  }

  const dayName = new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long' })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Date:</label>
        <input
          type="date"
          value={date}
          onChange={e => { setDate(e.target.value); setRows({}) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500">{dayName}</span>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Team member</th>
              <th className="text-left px-4 py-3 font-medium">Time In</th>
              <th className="text-left px-4 py-3 font-medium">Time Out</th>
              <th className="px-4 py-3 font-medium text-right">Hrs</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {employees.map(emp => {
              const r = getRow(emp.id)
              const hrs = r.in && r.out ? computeRegularHours(r.in, r.out) + computeOvertimeHours(r.in, r.out) : 0
              return (
                <tr key={emp.id}>
                  <td className="px-5 py-2.5 font-medium text-gray-800">{emp.full_name}</td>
                  <td className="px-4 py-2.5">
                    <input type="time" value={r.in} onChange={e => setRow(emp.id, { in: e.target.value })}
                      className="border border-gray-200 rounded-md px-2 py-1 text-sm w-28" />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="time" value={r.out} onChange={e => setRow(emp.id, { out: e.target.value })}
                      className="border border-gray-200 rounded-md px-2 py-1 text-sm w-28" />
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{hrs ? hrs.toFixed(1) : '—'}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => markStandard(emp)}
                      className="text-xs text-gray-500 hover:text-gray-800 mr-3">8–5</button>
                    <button onClick={() => save(emp)} disabled={saving === emp.id}
                      className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md px-3 py-1.5 disabled:opacity-50">
                      {saving === emp.id ? <Loader2 className="w-3 h-3 animate-spin" />
                        : savedAt[emp.id] ? <Check className="w-3 h-3" /> : null}
                      {savedAt[emp.id] ? 'Saved' : 'Save'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {employees.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                No team members assigned to your station yet. Ask the office to add your staff.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
