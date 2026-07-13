'use client'

import { useEffect, useState } from 'react'
import { DTREntry, Employee, Schedule, Station } from '@/types/database'
import DTREntryRow, { DTRRowDraft } from './DTREntryRow'
import {
  computeRegularHours,
  computeOvertimeHours,
  computeNightShiftHours,
  computeLateMinutes,
  computeUndertimeMinutes,
  summarizeCutoffEarnings,
  OrgRates,
} from '@/lib/payroll-math'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'

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

const emptyDraft: DTRRowDraft = { timeIn: '', timeOut: '', isHolidayRegular: false, isHolidaySpecial: false }

export default function DTRView({
  employees,
  stations,
  dtrEntries,
  schedules,
  orgRates,
  orgId,
  userId,
  cutoffStart,
  cutoffEnd,
}: {
  employees: Pick<Employee, 'id' | 'full_name' | 'daily_rate' | 'has_sil' | 'station_id'>[]
  stations: Pick<Station, 'id' | 'name'>[]
  dtrEntries: DTREntry[]
  schedules: Pick<Schedule, 'employee_id' | 'work_date' | 'shift_start' | 'shift_end'>[]
  orgRates?: OrgRates
  orgId: string
  userId: string
  cutoffStart: string
  cutoffEnd: string
}) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>(employees[0]?.id ?? '')
  const [localEntries, setLocalEntries] = useState<DTREntry[]>(dtrEntries)
  const [drafts, setDrafts] = useState<Record<string, DTRRowDraft>>({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const employee = employees.find(e => e.id === selectedEmployee)
  const dates = generateDates(cutoffStart, cutoffEnd)

  const entryMap = Object.fromEntries(
    localEntries
      .filter(e => e.employee_id === selectedEmployee)
      .map(e => [e.work_date, e])
  )

  const scheduleMap = Object.fromEntries(
    schedules
      .filter(s => s.employee_id === selectedEmployee)
      .map(s => [s.work_date, s])
  )

  // Rebuild the whole week's editable drafts whenever the selected employee
  // (or its underlying saved entries) changes — every row is always editable,
  // no per-row edit toggle.
  useEffect(() => {
    const next: Record<string, DTRRowDraft> = {}
    for (const date of dates) {
      const e = entryMap[date]
      next[date] = e
        ? {
            timeIn: e.time_in ?? '',
            timeOut: e.time_out ?? '',
            isHolidayRegular: e.is_holiday_regular,
            isHolidaySpecial: e.is_holiday_special,
          }
        : { ...emptyDraft }
    }
    setDrafts(next)
    setSavedAt(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee, localEntries])

  function setDraft(date: string, patch: Partial<DTRRowDraft>) {
    setDrafts(prev => ({ ...prev, [date]: { ...(prev[date] ?? emptyDraft), ...patch } }))
    setSavedAt(false)
  }

  async function saveWeek() {
    if (!employee) return
    setSaving(true)
    setSaveError(null)

    const rows = dates
      .map(date => {
        const draft = drafts[date] ?? emptyDraft
        if (!draft.timeIn && !draft.timeOut && !draft.isHolidayRegular && !draft.isHolidaySpecial) return null

        const reg = computeRegularHours(draft.timeIn, draft.timeOut)
        const ot = computeOvertimeHours(draft.timeIn, draft.timeOut)
        const nsd = computeNightShiftHours(draft.timeIn, draft.timeOut)
        const schedule = scheduleMap[date]
        const late = computeLateMinutes(draft.timeIn, schedule?.shift_start ?? null)
        const undertime = computeUndertimeMinutes(draft.timeOut, schedule?.shift_end ?? null)

        return {
          org_id: orgId,
          employee_id: selectedEmployee,
          station_id: employee.station_id,
          work_date: date,
          time_in: draft.timeIn || null,
          time_out: draft.timeOut || null,
          regular_hours: reg,
          overtime_hours: ot,
          night_shift_hours: nsd,
          late_minutes: late,
          undertime_minutes: undertime,
          is_holiday_regular: draft.isHolidayRegular,
          is_holiday_special: draft.isHolidaySpecial,
          notes: entryMap[date]?.notes ?? null,
          entered_by: userId,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (rows.length > 0) {
      const { error } = await supabase.from('dtr_entries').upsert(rows, { onConflict: 'employee_id,work_date' })
      setSaving(false)
      if (error) {
        setSaveError(error.message)
        return
      }
    } else {
      setSaving(false)
    }

    setSavedAt(true)
    router.refresh()
  }

  const totals = dates.reduce((acc, date) => {
    const draft = drafts[date] ?? emptyDraft
    return {
      regular: acc.regular + computeRegularHours(draft.timeIn, draft.timeOut),
      ot: acc.ot + computeOvertimeHours(draft.timeIn, draft.timeOut),
      nsd: acc.nsd + computeNightShiftHours(draft.timeIn, draft.timeOut),
    }
  }, { regular: 0, ot: 0, nsd: 0 })

  const dailyRate = employee?.daily_rate ?? 0
  const earnings = summarizeCutoffEarnings(
    dates.map(date => {
      const draft = drafts[date] ?? emptyDraft
      return {
        regular_hours: computeRegularHours(draft.timeIn, draft.timeOut),
        overtime_hours: computeOvertimeHours(draft.timeIn, draft.timeOut),
        night_shift_hours: computeNightShiftHours(draft.timeIn, draft.timeOut),
        late_minutes: 0,
        undertime_minutes: 0,
        is_holiday_regular: draft.isHolidayRegular,
        is_holiday_special: draft.isHolidaySpecial,
      }
    }),
    dailyRate,
    orgRates
  )

  return (
    <div className="space-y-4">
      {/* Employee selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Employee:</label>
        <select
          value={selectedEmployee}
          onChange={e => setSelectedEmployee(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
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

      {/* DTR table — every row is always editable */}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {dates.map(date => {
              const draft = drafts[date] ?? emptyDraft
              return (
                <DTREntryRow
                  key={date}
                  date={date}
                  draft={draft}
                  regHrs={computeRegularHours(draft.timeIn, draft.timeOut)}
                  otHrs={computeOvertimeHours(draft.timeIn, draft.timeOut)}
                  nsdHrs={computeNightShiftHours(draft.timeIn, draft.timeOut)}
                  onChange={patch => setDraft(date, patch)}
                />
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50 font-medium text-sm">
              <td className="px-5 py-3 text-gray-700" colSpan={4}>Totals</td>
              <td className="px-4 py-3 text-right">{totals.regular.toFixed(1)}</td>
              <td className="px-4 py-3 text-right">{totals.ot.toFixed(1)}</td>
              <td className="px-4 py-3 text-right">{totals.nsd.toFixed(1)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Single save for the whole week */}
      <div className="flex items-center gap-3">
        <button
          onClick={saveWeek}
          disabled={saving || !employee}
          className="flex items-center gap-2 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Saving…' : savedAt ? 'Saved' : 'Save Week'}
        </button>
        {saveError && <span className="text-xs text-red-600">{saveError}</span>}
      </div>

      {/* Summary box */}
      {employee && (
        <div className="bg-brand-blue-50 border border-brand-blue-100 rounded-xl px-5 py-4 text-sm space-y-1">
          <div className="font-medium text-brand-blue-800 mb-2">Estimated earnings for this cutoff</div>
          <div className="flex justify-between text-brand-blue-700">
            <span>Basic pay ({totals.regular.toFixed(1)} reg hrs)</span>
            <span>₱{earnings.basicPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          {earnings.holidayPay > 0 && (
            <div className="flex justify-between text-brand-blue-700">
              <span>Holiday pay</span>
              <span>₱{earnings.holidayPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between text-brand-blue-700">
            <span>Overtime ({totals.ot.toFixed(1)} hrs)</span>
            <span>₱{earnings.overtimePay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-brand-blue-700">
            <span>NSD ({totals.nsd.toFixed(1)} hrs × 10%)</span>
            <span>₱{earnings.nsdPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-brand-blue-900 font-semibold border-t border-brand-blue-200 pt-1.5 mt-1.5">
            <span>Total</span>
            <span>₱{earnings.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}
    </div>
  )
}
