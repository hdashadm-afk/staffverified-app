'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Employee, Schedule, Station } from '@/types/database'
import { cutoffStart, cutoffEnd } from '@/lib/cutoff'
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function generateDates(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T00:00:00')
  const endDate = new Date(end + 'T00:00:00')
  while (cur <= endDate) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

interface Draft {
  shiftStart: string
  shiftEnd: string
}
const emptyDraft: Draft = { shiftStart: '', shiftEnd: '' }

export default function ScheduleView({
  employees,
  stations,
  orgId,
}: {
  employees: Pick<Employee, 'id' | 'full_name' | 'station_id'>[]
  stations: Pick<Station, 'id' | 'name'>[]
  orgId: string
}) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>(employees[0]?.id ?? '')
  const [weekOffset, setWeekOffset] = useState(0)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(false)
  const supabase = createClient()

  const anchor = new Date()
  anchor.setDate(anchor.getDate() + weekOffset * 7)
  const start = cutoffStart(anchor)
  const end = cutoffEnd(start)
  const dates = generateDates(start, end)

  const employee = employees.find(e => e.id === selectedEmployee)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('schedules')
        .select('*')
        .eq('org_id', orgId)
        .eq('employee_id', selectedEmployee)
        .gte('work_date', start)
        .lte('work_date', end)
      if (cancelled) return
      setSchedules((data ?? []) as Schedule[])
      setLoading(false)
    }
    if (selectedEmployee) load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee, start, end])

  useEffect(() => {
    const scheduleMap = Object.fromEntries(schedules.map(s => [s.work_date, s]))
    const next: Record<string, Draft> = {}
    for (const date of dates) {
      const s = scheduleMap[date]
      next[date] = s ? { shiftStart: s.shift_start ?? '', shiftEnd: s.shift_end ?? '' } : { ...emptyDraft }
    }
    setDrafts(next)
    setSavedAt(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules])

  function setDraft(date: string, patch: Partial<Draft>) {
    setDrafts(prev => ({ ...prev, [date]: { ...(prev[date] ?? emptyDraft), ...patch } }))
    setSavedAt(false)
  }

  function applyToAllWeekdays() {
    const first = dates.map(d => drafts[d]).find(d => d?.shiftStart && d?.shiftEnd)
    if (!first) return
    setDrafts(prev => {
      const next = { ...prev }
      for (const date of dates) {
        const dow = new Date(date + 'T00:00:00').getDay()
        if (dow === 0 || dow === 6) continue // skip Sun/Sat
        next[date] = { ...first }
      }
      return next
    })
    setSavedAt(false)
  }

  async function saveWeek() {
    if (!employee) return
    setSaving(true)

    const rows = dates
      .map(date => {
        const draft = drafts[date] ?? emptyDraft
        if (!draft.shiftStart && !draft.shiftEnd) return null
        return {
          org_id: orgId,
          employee_id: selectedEmployee,
          station_id: employee.station_id,
          work_date: date,
          shift_start: draft.shiftStart || null,
          shift_end: draft.shiftEnd || null,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (rows.length > 0) {
      await supabase.from('schedules').upsert(rows, { onConflict: 'employee_id,work_date' })
    }

    setSaving(false)
    setSavedAt(true)
  }

  return (
    <div className="space-y-4">
      {/* Employee selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Employee:</label>
        <select
          value={selectedEmployee}
          onChange={e => setSelectedEmployee(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.full_name}</option>
          ))}
        </select>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-700 font-medium">
          {new Date(start + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
          {' – '}
          {new Date(end + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} className="text-xs text-red-600 hover:underline">
            Back to this week
          </button>
        )}
        <button onClick={applyToAllWeekdays} className="ml-auto text-xs text-gray-500 hover:text-gray-800 underline">
          Copy first filled day to all weekdays
        </button>
      </div>

      {/* Schedule table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Day</th>
              <th className="text-left px-4 py-3 font-medium">Shift Start</th>
              <th className="text-left px-4 py-3 font-medium">Shift End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : (
              dates.map(date => {
                const d = new Date(date + 'T00:00:00')
                const dayName = DAYS[d.getDay()]
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                const draft = drafts[date] ?? emptyDraft
                return (
                  <tr key={date} className={`hover:bg-gray-50 transition-colors ${isWeekend ? 'bg-orange-50/30' : ''}`}>
                    <td className="px-5 py-2.5 text-gray-700 tabular-nums">
                      {d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className={`px-4 py-2.5 text-xs font-medium ${isWeekend ? 'text-orange-500' : 'text-gray-400'}`}>
                      {dayName}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="time"
                        value={draft.shiftStart}
                        onChange={e => setDraft(date, { shiftStart: e.target.value })}
                        className="border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-500 w-28"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="time"
                        value={draft.shiftEnd}
                        onChange={e => setDraft(date, { shiftEnd: e.target.value })}
                        className="border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-500 w-28"
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={saveWeek}
        disabled={saving || !employee || loading}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {saving ? 'Saving…' : savedAt ? 'Saved' : 'Save Week'}
      </button>
    </div>
  )
}
