'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  computeRegularHours,
  computeOvertimeHours,
  computeNightShiftHours,
  computeLateMinutes,
  computeUndertimeMinutes,
} from '@/lib/payroll-math'
import { Check, Loader2, Search } from 'lucide-react'

type Emp = { id: string; full_name: string; station_id: string | null; daily_rate: number }
type Entry = { employee_id: string; work_date: string; time_in: string | null; time_out: string | null }
type Sched = { employee_id: string; work_date: string; shift_start: string | null; shift_end: string | null }

export default function DailyAttendance({
  employees,
  entries,
  schedules,
  orgId,
  userId,
  stationId,
  stationName,
}: {
  employees: Emp[]
  entries: Entry[]
  schedules: Sched[]
  orgId: string
  userId: string
  stationId: string | null
  stationName: string | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Record<string, boolean>>({})
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')

  // entries already recorded at THIS station for the selected date
  const dayEntries = Object.fromEntries(
    entries.filter(e => e.work_date === date).map(e => [e.employee_id, e])
  )
  const markedCount = Object.keys(dayEntries).length

  // schedules for the selected date, keyed by employee
  const daySchedules = Object.fromEntries(
    schedules.filter(s => s.work_date === date).map(s => [s.employee_id, s])
  )

  const [rows, setRows] = useState<Record<string, { in: string; out: string }>>({})
  const getRow = (id: string) =>
    rows[id] ?? { in: dayEntries[id]?.time_in ?? '', out: dayEntries[id]?.time_out ?? '' }
  function setRow(id: string, patch: Partial<{ in: string; out: string }>) {
    setRows(prev => ({ ...prev, [id]: { ...getRow(id), ...patch } }))
  }

  async function save(emp: Emp) {
    if (!stationId) return
    const r = getRow(emp.id)
    setSaving(emp.id)
    setRowErrors(prev => ({ ...prev, [emp.id]: '' }))
    const reg = computeRegularHours(r.in, r.out)
    const ot = computeOvertimeHours(r.in, r.out)
    const nsd = computeNightShiftHours(r.in, r.out)
    const sched = daySchedules[emp.id]
    const late = computeLateMinutes(r.in, sched?.shift_start ?? null)
    const undertime = computeUndertimeMinutes(r.out, sched?.shift_end ?? null)
    const { error } = await supabase.from('dtr_entries').upsert(
      {
        org_id: orgId,
        employee_id: emp.id,
        station_id: stationId, // attendance is logged at the TL's station, not the employee's home
        work_date: date,
        time_in: r.in || null,
        time_out: r.out || null,
        regular_hours: reg,
        overtime_hours: ot,
        night_shift_hours: nsd,
        late_minutes: late,
        undertime_minutes: undertime,
        entered_by: userId,
      },
      { onConflict: 'employee_id,work_date' }
    )
    setSaving(null)

    if (error) {
      setRowErrors(prev => ({ ...prev, [emp.id]: error.message }))
      return
    }

    setSavedAt(prev => ({ ...prev, [emp.id]: true }))
    setTimeout(() => setSavedAt(prev => ({ ...prev, [emp.id]: false })), 1500)
    router.refresh()
  }

  const dayName = new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long' })

  // Sort: already-marked first, then alphabetical; then apply search filter
  const q = query.trim().toLowerCase()
  const visible = employees
    .filter(e => !q || e.full_name.toLowerCase().includes(q))
    .sort((a, b) => {
      const am = dayEntries[a.id] ? 0 : 1
      const bm = dayEntries[b.id] ? 0 : 1
      return am - bm || a.full_name.localeCompare(b.full_name)
    })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Date:</label>
        <input
          type="date"
          value={date}
          onChange={e => { setDate(e.target.value); setRows({}) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
        />
        <span className="text-sm text-gray-500">{dayName}</span>
        <span className="ml-auto text-sm">
          <span className="font-semibold text-brand-blue-700">{markedCount}</span>
          <span className="text-gray-500"> marked at {stationName ?? 'your station'} today</span>
        </span>
      </div>

      {/* Search the floating attendant pool */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search attendant by name…"
          className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Attendant</th>
              <th className="text-left px-4 py-3 font-medium">Time In</th>
              <th className="text-left px-4 py-3 font-medium">Time Out</th>
              <th className="px-4 py-3 font-medium text-right">Hrs</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.map(emp => {
              const r = getRow(emp.id)
              const hrs = r.in && r.out ? computeRegularHours(r.in, r.out) + computeOvertimeHours(r.in, r.out) : 0
              const marked = !!dayEntries[emp.id]
              return (
                <tr key={emp.id} className={marked ? 'bg-green-50/40' : ''}>
                  <td className="px-5 py-2.5 font-medium text-gray-800">
                    {emp.full_name}
                    {marked && <Check className="inline w-3.5 h-3.5 text-green-600 ml-1.5" />}
                  </td>
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
                    <button onClick={() => setRow(emp.id, { in: '08:00', out: '17:00' })}
                      className="text-xs text-gray-500 hover:text-gray-800 mr-3">8–5</button>
                    <button onClick={() => save(emp)} disabled={saving === emp.id || !stationId}
                      className="inline-flex items-center gap-1 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-xs font-medium rounded-md px-3 py-1.5 disabled:opacity-50">
                      {saving === emp.id ? <Loader2 className="w-3 h-3 animate-spin" />
                        : savedAt[emp.id] ? <Check className="w-3 h-3" /> : null}
                      {savedAt[emp.id] ? 'Saved' : marked ? 'Update' : 'Save'}
                    </button>
                    {rowErrors[emp.id] && (
                      <div className="text-xs text-red-600 mt-1">{rowErrors[emp.id]}</div>
                    )}
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                {employees.length === 0
                  ? 'No staff in the system yet. Ask the office to add attendants.'
                  : 'No attendant matches your search.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {!stationId && (
        <p className="text-xs text-amber-600">
          Your account has no station assigned — ask the office to set your station so attendance can be saved.
        </p>
      )}
    </div>
  )
}
