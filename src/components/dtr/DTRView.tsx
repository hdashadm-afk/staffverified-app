'use client'

import { useEffect, useState } from 'react'
import { DTREntry, DTRCutoffStatus, Employee, Schedule, Station } from '@/types/database'
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
import { cutoffStart, cutoffEnd, payday, isPastPayday } from '@/lib/cutoff'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, Loader2, ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react'

function generateDates(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T00:00:00')
  const endDate = new Date(end + 'T00:00:00')
  while (cur <= endDate) {
    // Format from the Date object's own calendar fields — never toISOString(),
    // which reconverts to UTC and can silently shift the date. See lib/cutoff.ts.
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const day = String(cur.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${day}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

// Roles that can reopen a payday-locked DTR — same set that can write dtr_cutoff_status (see migration 013).
const REOPEN_ROLES = ['owner', 'assistant', 'ops_officer', 'ceo']

// HR (assistant) and Admin (ops_officer) — company-authorized — can override
// computed OT/NSD hours without needing Owner sign-off; Owner approval is
// reserved for payroll release, not DTR entry. Owner can still edit too.
const OT_NSD_OVERRIDE_ROLES = ['owner', 'assistant', 'ops_officer']

const emptyDraft: DTRRowDraft = {
  timeIn: '', timeOut: '', isHolidayRegular: false, isHolidaySpecial: false,
  otOverride: null, nsdOverride: null, otOverrideReason: '', nsdOverrideReason: '', stationId: '',
}

export default function DTRView({
  employees,
  stations,
  orgRates,
  orgId,
  userId,
  role,
}: {
  employees: Pick<Employee, 'id' | 'full_name' | 'daily_rate' | 'has_sil' | 'station_id' | 'regular_hours_per_day'>[]
  stations: Pick<Station, 'id' | 'name'>[]
  orgRates?: OrgRates
  orgId: string
  userId: string
  role: string | null | undefined
}) {
  const [selectedStation, setSelectedStation] = useState<string>('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>(employees[0]?.id ?? '')
  const [cutoffOffset, setCutoffOffset] = useState(0)
  const [entries, setEntries] = useState<DTREntry[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [cutoffStatus, setCutoffStatus] = useState<DTRCutoffStatus | null>(null)
  const [drafts, setDrafts] = useState<Record<string, DTRRowDraft>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<'draft' | 'final' | null>(null)
  const [savedAt, setSavedAt] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [reopening, setReopening] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const canOverrideOtNsd = OT_NSD_OVERRIDE_ROLES.includes(role ?? '')

  const visibleEmployees = selectedStation
    ? employees.filter(e => e.station_id === selectedStation)
    : employees

  // Keep the employee selector in sync when the station filter narrows the list
  useEffect(() => {
    if (!visibleEmployees.some(e => e.id === selectedEmployee)) {
      setSelectedEmployee(visibleEmployees[0]?.id ?? '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStation])

  const employee = employees.find(e => e.id === selectedEmployee)
  const regularHoursPerDay = employee?.regular_hours_per_day ?? 8

  const anchor = new Date()
  anchor.setDate(anchor.getDate() + cutoffOffset * 7)
  const start = cutoffStart(anchor)
  const end = cutoffEnd(start)
  const cutoffPayday = payday(end)
  const dates = generateDates(start, end)

  // Every cutoff period this component can show is either the current one
  // (offset 0) or a past one (offset < 0) — schedule/DTR entry never look
  // ahead, same as before this feature. A finalized past cutoff locks once
  // today reaches its payday, unless someone has reopened it.
  const locked = cutoffStatus?.status === 'finalized' && isPastPayday(end) && !cutoffStatus.reopened_at

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!selectedEmployee) return
      setLoading(true)
      const [entriesRes, schedulesRes, statusRes] = await Promise.all([
        supabase.from('dtr_entries').select('*')
          .eq('org_id', orgId).eq('employee_id', selectedEmployee)
          .gte('work_date', start).lte('work_date', end),
        supabase.from('schedules').select('*')
          .eq('org_id', orgId).eq('employee_id', selectedEmployee)
          .gte('work_date', start).lte('work_date', end),
        supabase.from('dtr_cutoff_status').select('*')
          .eq('org_id', orgId).eq('employee_id', selectedEmployee)
          .eq('cutoff_start', start).maybeSingle(),
      ])
      if (cancelled) return
      setEntries((entriesRes.data ?? []) as DTREntry[])
      setSchedules((schedulesRes.data ?? []) as Schedule[])
      setCutoffStatus((statusRes.data ?? null) as DTRCutoffStatus | null)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee, start, end])

  const entryMap = Object.fromEntries(entries.map(e => [e.work_date, e]))
  const scheduleMap = Object.fromEntries(schedules.map(s => [s.work_date, s]))

  // Rebuild the whole week's editable drafts whenever the selected employee,
  // cutoff, or underlying saved entries change — every row is always
  // editable (unless locked), no per-row edit toggle.
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
            otOverride: e.overtime_hours_overridden ? e.overtime_hours : null,
            nsdOverride: e.night_shift_hours_overridden ? e.night_shift_hours : null,
            otOverrideReason: '',
            nsdOverrideReason: '',
            stationId: e.station_id ?? employee?.station_id ?? '',
          }
        : { ...emptyDraft, stationId: employee?.station_id ?? '' }
    }
    setDrafts(next)
    setSavedAt(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  function setDraft(date: string, patch: Partial<DTRRowDraft>) {
    if (locked) return
    setDrafts(prev => ({ ...prev, [date]: { ...(prev[date] ?? emptyDraft), ...patch } }))
    setSavedAt(false)
  }

  async function save(finalize: boolean) {
    if (!employee || locked) return
    setSaving(finalize ? 'final' : 'draft')
    setSaveError(null)

    const overrideLogRows: {
      org_id: string
      employee_id: string
      work_date: string
      field: 'overtime_hours' | 'night_shift_hours'
      old_value: number
      new_value: number
      reason: string | null
      changed_by: string
    }[] = []

    const rows = dates
      .map(date => {
        const draft = drafts[date] ?? emptyDraft
        if (!draft.timeIn && !draft.timeOut && !draft.isHolidayRegular && !draft.isHolidaySpecial
          && draft.otOverride === null && draft.nsdOverride === null) return null

        const reg = computeRegularHours(draft.timeIn, draft.timeOut, regularHoursPerDay)
        const computedOt = computeOvertimeHours(draft.timeIn, draft.timeOut, regularHoursPerDay)
        const computedNsd = computeNightShiftHours(draft.timeIn, draft.timeOut)
        const schedule = scheduleMap[date]
        const late = computeLateMinutes(draft.timeIn, schedule?.shift_start ?? null)
        const undertime = computeUndertimeMinutes(draft.timeOut, schedule?.shift_end ?? null)

        const otOverridden = canOverrideOtNsd && draft.otOverride !== null
        const nsdOverridden = canOverrideOtNsd && draft.nsdOverride !== null
        const finalOt = otOverridden ? (draft.otOverride as number) : computedOt
        const finalNsd = nsdOverridden ? (draft.nsdOverride as number) : computedNsd

        const existing = entryMap[date]
        if (otOverridden && (!existing?.overtime_hours_overridden || existing.overtime_hours !== finalOt)) {
          overrideLogRows.push({
            org_id: orgId, employee_id: selectedEmployee, work_date: date, field: 'overtime_hours',
            old_value: computedOt, new_value: finalOt, reason: draft.otOverrideReason || null, changed_by: userId,
          })
        }
        if (nsdOverridden && (!existing?.night_shift_hours_overridden || existing.night_shift_hours !== finalNsd)) {
          overrideLogRows.push({
            org_id: orgId, employee_id: selectedEmployee, work_date: date, field: 'night_shift_hours',
            old_value: computedNsd, new_value: finalNsd, reason: draft.nsdOverrideReason || null, changed_by: userId,
          })
        }

        return {
          org_id: orgId,
          employee_id: selectedEmployee,
          station_id: draft.stationId || employee.station_id,
          work_date: date,
          time_in: draft.timeIn || null,
          time_out: draft.timeOut || null,
          regular_hours: reg,
          overtime_hours: finalOt,
          night_shift_hours: finalNsd,
          overtime_hours_overridden: otOverridden,
          night_shift_hours_overridden: nsdOverridden,
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
      if (error) {
        setSaving(null)
        setSaveError(error.message)
        return
      }
    }

    if (overrideLogRows.length > 0) {
      await supabase.from('dtr_override_log').insert(overrideLogRows)
    }

    const { data: statusRow, error: statusError } = await supabase
      .from('dtr_cutoff_status')
      .upsert(
        {
          org_id: orgId,
          employee_id: selectedEmployee,
          cutoff_start: start,
          status: finalize ? 'finalized' : 'draft',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id,cutoff_start' }
      )
      .select()
      .single()

    setSaving(null)
    if (statusError) {
      setSaveError(statusError.message)
      return
    }
    setCutoffStatus(statusRow as DTRCutoffStatus)
    setSavedAt(true)
    router.refresh()
  }

  async function reopen() {
    if (!cutoffStatus) return
    setReopening(true)
    const { data, error } = await supabase
      .from('dtr_cutoff_status')
      .update({ reopened_by: userId, reopened_at: new Date().toISOString() })
      .eq('id', cutoffStatus.id)
      .select()
      .single()
    setReopening(false)
    if (!error) setCutoffStatus(data as DTRCutoffStatus)
  }

  const totals = dates.reduce((acc, date) => {
    const draft = drafts[date] ?? emptyDraft
    const ot = draft.otOverride ?? computeOvertimeHours(draft.timeIn, draft.timeOut, regularHoursPerDay)
    const nsd = draft.nsdOverride ?? computeNightShiftHours(draft.timeIn, draft.timeOut)
    return {
      regular: acc.regular + computeRegularHours(draft.timeIn, draft.timeOut, regularHoursPerDay),
      ot: acc.ot + ot,
      nsd: acc.nsd + nsd,
    }
  }, { regular: 0, ot: 0, nsd: 0 })

  const dailyRate = employee?.daily_rate ?? 0
  const earnings = summarizeCutoffEarnings(
    dates.map(date => {
      const draft = drafts[date] ?? emptyDraft
      return {
        regular_hours: computeRegularHours(draft.timeIn, draft.timeOut, regularHoursPerDay),
        overtime_hours: draft.otOverride ?? computeOvertimeHours(draft.timeIn, draft.timeOut, regularHoursPerDay),
        night_shift_hours: draft.nsdOverride ?? computeNightShiftHours(draft.timeIn, draft.timeOut),
        late_minutes: 0,
        undertime_minutes: 0,
        is_holiday_regular: draft.isHolidayRegular,
        is_holiday_special: draft.isHolidaySpecial,
      }
    }),
    dailyRate,
    orgRates,
    regularHoursPerDay
  )

  return (
    <div className="space-y-4">
      {/* Station + Employee selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        {stations.length > 0 && (
          <>
            <label className="text-sm font-medium text-gray-700">Station:</label>
            <select
              value={selectedStation}
              onChange={e => setSelectedStation(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
            >
              <option value="">All stations</option>
              {stations.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </>
        )}
        <label className="text-sm font-medium text-gray-700">Employee:</label>
        <select
          value={selectedEmployee}
          onChange={e => setSelectedEmployee(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-600"
        >
          {visibleEmployees.map(e => (
            <option key={e.id} value={e.id}>{e.full_name}</option>
          ))}
        </select>
        {employee && (
          <span className="text-xs text-gray-500">₱{employee.daily_rate.toLocaleString()}/day · {regularHoursPerDay}h/day</span>
        )}
      </div>

      {/* Cutoff nav */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setCutoffOffset(o => o - 1)}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          aria-label="Previous cutoff"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-sm text-gray-500">
          Cutoff: <span className="font-medium text-gray-700">
            {new Date(start + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} –{' '}
            {new Date(end + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          {' · '}Payday (Fri): <span className="font-medium text-gray-700">
            {new Date(cutoffPayday + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <button
          onClick={() => setCutoffOffset(o => o + 1)}
          disabled={cutoffOffset >= 0}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Next cutoff"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {cutoffOffset !== 0 && (
          <button onClick={() => setCutoffOffset(0)} className="text-xs text-brand-blue-600 hover:underline">
            Back to current cutoff
          </button>
        )}
        {cutoffStatus?.status === 'draft' && (
          <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">Draft</span>
        )}
        {cutoffStatus?.status === 'finalized' && (
          <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">Finalized</span>
        )}
      </div>

      {locked && (
        <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Lock className="w-4 h-4" />
            Payroll for this cutoff has been processed (payday {new Date(cutoffPayday + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}) — DTR is locked.
          </div>
          {REOPEN_ROLES.includes(role ?? '') && (
            <button
              onClick={reopen}
              disabled={reopening}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-blue-700 hover:underline disabled:opacity-50"
            >
              {reopening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
              Reopen
            </button>
          )}
        </div>
      )}
      {cutoffStatus?.reopened_at && (
        <div className="text-xs text-gray-400">
          Reopened {new Date(cutoffStatus.reopened_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </div>
      )}

      {/* DTR table — every row is always editable, unless locked.
          Scrolls horizontally on narrow screens instead of breaking the page layout. */}
      <div className={`bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto ${loading ? 'opacity-50' : ''}`}>
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Date</th>
              {stations.length > 1 && <th className="text-left px-4 py-3 font-medium">Station</th>}
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
              const existing = entryMap[date]
              return (
                <DTREntryRow
                  key={date}
                  date={date}
                  draft={draft}
                  regHrs={computeRegularHours(draft.timeIn, draft.timeOut, regularHoursPerDay)}
                  otHrs={computeOvertimeHours(draft.timeIn, draft.timeOut, regularHoursPerDay)}
                  nsdHrs={computeNightShiftHours(draft.timeIn, draft.timeOut)}
                  otOverridden={existing?.overtime_hours_overridden ?? false}
                  nsdOverridden={existing?.night_shift_hours_overridden ?? false}
                  canOverride={canOverrideOtNsd}
                  stations={stations}
                  onChange={patch => setDraft(date, patch)}
                  disabled={locked}
                />
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50 font-medium text-sm">
              <td className="px-5 py-3 text-gray-700" colSpan={stations.length > 1 ? 5 : 4}>Totals</td>
              <td className="px-4 py-3 text-right">{totals.regular.toFixed(1)}</td>
              <td className="px-4 py-3 text-right">{totals.ot.toFixed(1)}</td>
              <td className="px-4 py-3 text-right">{totals.nsd.toFixed(1)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {canOverrideOtNsd && (
        <p className="text-xs text-gray-400">
          OT and NSD hours are auto-computed from Time In/Out. As HR or Admin you can type a different value to override it — use the ↺ icon to go back to the auto-computed value.
        </p>
      )}

      {/* Save as Draft (keep editing) vs Save Week (finalize for payroll) */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => save(false)}
          disabled={!!saving || !employee || locked}
          className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving === 'draft' ? 'Saving…' : 'Save as Draft'}
        </button>
        <button
          onClick={() => save(true)}
          disabled={!!saving || !employee || locked}
          className="flex items-center gap-2 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving === 'final' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving === 'final' ? 'Saving…' : savedAt && cutoffStatus?.status === 'finalized' ? 'Saved' : 'Save Week'}
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
