'use client'

import { useState } from 'react'
import { DTREntry, Employee, Station } from '@/types/database'
import DTREntryRow from './DTREntryRow'
import { computeRegularHours, computeOvertimeHours, computeNightShiftHours } from '@/lib/payroll-math'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function generateDates(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start)
  const endDate = new Date(end)
  while (cur <= endDate) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export default function DTRView({
  employees,
  stations,
  dtrEntries,
  orgId,
  userId,
  cutoffStart,
  cutoffEnd,
}: {
  employees: Pick<Employee, 'id' | 'full_name' | 'daily_rate' | 'has_sil' | 'station_id'>[]
  stations: Pick<Station, 'id' | 'name'>[]
  dtrEntries: DTREntry[]
  orgId: string
  userId: string
  cutoffStart: string
  cutoffEnd: string
}) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>(employees[0]?.id ?? '')
  const router = useRouter()
  const supabase = createClient()

  const employee = employees.find(e => e.id === selectedEmployee)
  const dates = generateDates(cutoffStart, cutoffEnd)

  const entryMap = Object.fromEntries(
    dtrEntries
      .filter(e => e.employee_id === selectedEmployee)
      .map(e => [e.work_date, e])
  )

  async function upsertEntry(workDate: string, timeIn: string, timeOut: string, flags: {
    isHolidayRegular: boolean
    isHolidaySpecial: boolean
    notes: string
  }) {
    const reg = computeRegularHours(timeIn, timeOut)
    const ot = computeOvertimeHours(timeIn, timeOut)
    const nsd = computeNightShiftHours(timeIn, timeOut)

    await supabase.from('dtr_entries').upsert({
      org_id: orgId,
      employee_id: selectedEmployee,
      station_id: employee?.station_id ?? null,
      work_date: workDate,
      time_in: timeIn || null,
      time_out: timeOut || null,
      regular_hours: reg,
      overtime_hours: ot,
      night_shift_hours: nsd,
      late_minutes: 0,
      undertime_minutes: 0,
      is_holiday_regular: flags.isHolidayRegular,
      is_holiday_special: flags.isHolidaySpecial,
      notes: flags.notes || null,
      entered_by: userId,
    }, { onConflict: 'employee_id,work_date' })

    router.refresh()
  }

  const totals = dates.reduce((acc, d) => {
    const e = entryMap[d]
    if (!e) return acc
    return {
      regular: acc.regular + (e.regular_hours ?? 0),
      ot: acc.ot + (e.overtime_hours ?? 0),
      nsd: acc.nsd + (e.night_shift_hours ?? 0),
    }
  }, { regular: 0, ot: 0, nsd: 0 })

  const dailyRate = employee?.daily_rate ?? 0
  const hourly = dailyRate / 8

  return (
    <div className="space-y-4">
      {/* Employee selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Employee:</label>
        <select
          value={selectedEmployee}
          onChange={e => setSelectedEmployee(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.full_name}</option>
          ))}
        </select>
        {employee && (
          <span className="text-xs text-gray-500">₱{employee.daily_rate.toLocaleString()}/day</span>
        )}
      </div>

      {/* Cutoff label */}
      <div className="text-sm text-gray-500">
        Cutoff: <span className="font-medium text-gray-700">
          {new Date(cutoffStart).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} –{' '}
          {new Date(cutoffEnd).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* DTR table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Day</th>
              <th className="text-left px-4 py-3 font-medium">Time In</th>
              <th className="text-left px-4 py-3 font-medium">Time Out</th>
              <th className="text-right px-4 py-3 font-medium">Reg hrs</th>
              <th className="text-right px-4 py-3 font-medium">OT hrs</th>
              <th className="text-right px-4 py-3 font-medium">NSD hrs</th>
              <th className="text-left px-4 py-3 font-medium">Flags</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {dates.map(date => (
              <DTREntryRow
                key={date}
                date={date}
                entry={entryMap[date] ?? null}
                onSave={upsertEntry}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50 font-medium text-sm">
              <td className="px-5 py-3 text-gray-700" colSpan={4}>Totals</td>
              <td className="px-4 py-3 text-right">{totals.regular.toFixed(1)}</td>
              <td className="px-4 py-3 text-right">{totals.ot.toFixed(1)}</td>
              <td className="px-4 py-3 text-right">{totals.nsd.toFixed(1)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary box */}
      {employee && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm space-y-1">
          <div className="font-medium text-blue-800 mb-2">Estimated earnings for this cutoff</div>
          <div className="flex justify-between text-blue-700">
            <span>Basic pay ({totals.regular.toFixed(1)} reg hrs)</span>
            <span>₱{(hourly * totals.regular).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-blue-700">
            <span>Overtime ({totals.ot.toFixed(1)} hrs)</span>
            <span>₱{(hourly * totals.ot).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-blue-700">
            <span>NSD ({totals.nsd.toFixed(1)} hrs × 10%)</span>
            <span>₱{(hourly * totals.nsd * 0.1).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}
    </div>
  )
}
