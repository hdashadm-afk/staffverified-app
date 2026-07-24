'use client'

import { RotateCcw, Fuel } from 'lucide-react'
import { OpsAttendanceEntry } from '@/lib/ops-outtake'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface DTRRowDraft {
  timeIn: string
  timeOut: string
  isHolidayRegular: boolean
  isHolidaySpecial: boolean
  // null = use the auto-computed value (from Time In/Out). A number here
  // means Admin/HR manually overrode it — see lib/payroll-math for how
  // OT/NSD are normally computed.
  otOverride: number | null
  nsdOverride: number | null
  lateOverride: number | null
  otOverrideReason: string
  nsdOverrideReason: string
  lateOverrideReason: string
  // Station this entry's hours count against — defaults to the employee's
  // home station, but staff sometimes float to cover another station for
  // a day, and that's where their hours/pay should be attributed.
  stationId: string
}

export default function DTREntryRow({
  date,
  draft,
  regHrs,
  otHrs,
  nsdHrs,
  lateMin,
  otOverridden,
  nsdOverridden,
  lateOverridden,
  canOverride,
  stations,
  opsSuggestion,
  opsIntegrationEnabled = false,
  onChange,
  disabled = false,
}: {
  date: string
  draft: DTRRowDraft
  /** Auto-computed from Time In/Out — always reflects the current time entry, regardless of override. */
  regHrs: number
  otHrs: number
  nsdHrs: number
  /** Auto-computed from Time In vs. the approved schedule's shift_start — minutes late, 0 if on time or no schedule. */
  lateMin: number
  /** Whether the currently-saved entry (if any) was already overridden — shown as a badge. */
  otOverridden: boolean
  nsdOverridden: boolean
  lateOverridden: boolean
  /** HR (assistant) and Admin (ops_officer) can edit OT/NSD directly — everyone else sees read-only values. */
  canOverride: boolean
  /** Org stations, for the per-day station reassignment dropdown. Omitted/empty hides the column. */
  stations: { id: string; name: string }[]
  /** Ops's confirmed Daily Outtake attendance for this employee/date, if a confident name match exists — a suggestion to apply, never auto-written. */
  opsSuggestion?: OpsAttendanceEntry | null
  /** Toggle-governance: the Ops reference always shows when opsSuggestion exists; this only controls whether it's a clickable apply action or plain read-only text. */
  opsIntegrationEnabled?: boolean
  onChange: (patch: Partial<DTRRowDraft>) => void
  disabled?: boolean
}) {
  const d = new Date(date + 'T00:00:00')
  const dayName = DAYS[d.getDay()]
  const isWeekend = d.getDay() === 0 || d.getDay() === 6

  const otValue = draft.otOverride ?? otHrs
  const nsdValue = draft.nsdOverride ?? nsdHrs
  const lateValue = draft.lateOverride ?? lateMin

  const numFld = 'w-16 border border-gray-200 rounded px-1.5 py-1 text-xs text-right text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-600 disabled:bg-gray-50 disabled:text-gray-400'

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${isWeekend ? 'bg-orange-50/30' : ''}`}>
      <td className="px-5 py-2.5 text-gray-700 tabular-nums">
        {d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
      </td>
      {stations.length > 1 && (
        <td className="px-4 py-2">
          <select
            value={draft.stationId}
            onChange={e => onChange({ stationId: e.target.value })}
            disabled={disabled}
            title="Station this day's hours count against — change if the employee floated to cover another station"
            className="border border-gray-200 rounded px-1.5 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-600 disabled:bg-gray-50 disabled:text-gray-400 max-w-[110px]"
          >
            {stations.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </td>
      )}
      <td className={`px-4 py-2.5 text-xs font-medium ${isWeekend ? 'text-orange-500' : 'text-gray-400'}`}>
        {dayName}
      </td>
      <td className="px-4 py-2">
        <input
          type="time"
          value={draft.timeIn}
          onChange={e => onChange({ timeIn: e.target.value })}
          disabled={disabled}
          className="border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-600 w-28 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="time"
          value={draft.timeOut}
          onChange={e => onChange({ timeOut: e.target.value })}
          disabled={disabled}
          className="border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-600 w-28 disabled:bg-gray-50 disabled:text-gray-400"
        />
        {opsSuggestion?.time_in && opsSuggestion?.time_out
          && (draft.timeIn !== opsSuggestion.time_in || draft.timeOut !== opsSuggestion.time_out) && (
          opsIntegrationEnabled ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange({ timeIn: opsSuggestion.time_in ?? '', timeOut: opsSuggestion.time_out ?? '' })}
              title="From fuel-ops's confirmed Daily Outtake for this station/date"
              className="mt-1 flex items-center gap-1 text-[10px] text-brand-blue-700 bg-brand-blue-50 border border-brand-blue-200 rounded px-1.5 py-0.5 hover:bg-brand-blue-100 disabled:opacity-50 whitespace-nowrap"
            >
              <Fuel className="w-2.5 h-2.5" />
              Ops: {opsSuggestion.time_in}–{opsSuggestion.time_out}
            </button>
          ) : (
            <div
              title="Ops integration isn't activated yet — reference only, ask an Owner/Admin to activate it above to enable one-click apply"
              className="mt-1 flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 whitespace-nowrap"
            >
              <Fuel className="w-2.5 h-2.5" />
              Ops: {opsSuggestion.time_in}–{opsSuggestion.time_out} (reference only)
            </div>
          )
        )}
      </td>
      <td className="px-4 py-2 text-right tabular-nums text-gray-700 text-xs">
        {regHrs > 0 ? regHrs.toFixed(1) : '—'}
      </td>
      <td className="px-4 py-2">
        {canOverride ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.25"
                min="0"
                value={otValue === 0 ? '' : otValue}
                placeholder="0"
                onChange={e => onChange({ otOverride: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                disabled={disabled}
                className={numFld}
                title="Overtime hours — editable by Admin/HR"
              />
              {draft.otOverride !== null && (
                <button
                  type="button"
                  onClick={() => onChange({ otOverride: null, otOverrideReason: '' })}
                  title="Reset to auto-computed"
                  className="text-gray-400 hover:text-gray-700"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
              {(draft.otOverride !== null || otOverridden) && (
                <span className="text-[9px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 whitespace-nowrap">Overridden</span>
              )}
            </div>
            {(draft.otOverride !== null || otOverridden) && (
              <input
                type="text"
                value={draft.otOverrideReason}
                onChange={e => onChange({ otOverrideReason: e.target.value })}
                disabled={disabled}
                placeholder="Reason (optional)"
                className="w-28 border border-gray-100 rounded px-1.5 py-0.5 text-[10px] text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
              />
            )}
          </div>
        ) : (
          <div className="text-right tabular-nums text-gray-700 text-xs">
            {otValue > 0 ? otValue.toFixed(1) : '—'}
            {otOverridden && <span className="ml-1 text-[9px] text-amber-600 align-top">Overridden</span>}
          </div>
        )}
      </td>
      <td className="px-4 py-2">
        {canOverride ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.25"
                min="0"
                value={nsdValue === 0 ? '' : nsdValue}
                placeholder="0"
                onChange={e => onChange({ nsdOverride: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                disabled={disabled}
                className={numFld}
                title="Night shift differential hours — editable by Admin/HR"
              />
              {draft.nsdOverride !== null && (
                <button
                  type="button"
                  onClick={() => onChange({ nsdOverride: null, nsdOverrideReason: '' })}
                  title="Reset to auto-computed"
                  className="text-gray-400 hover:text-gray-700"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
              {(draft.nsdOverride !== null || nsdOverridden) && (
                <span className="text-[9px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 whitespace-nowrap">Overridden</span>
              )}
            </div>
            {(draft.nsdOverride !== null || nsdOverridden) && (
              <input
                type="text"
                value={draft.nsdOverrideReason}
                onChange={e => onChange({ nsdOverrideReason: e.target.value })}
                disabled={disabled}
                placeholder="Reason (optional)"
                className="w-28 border border-gray-100 rounded px-1.5 py-0.5 text-[10px] text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
              />
            )}
          </div>
        ) : (
          <div className="text-right tabular-nums text-gray-700 text-xs">
            {nsdValue > 0 ? nsdValue.toFixed(1) : '—'}
            {nsdOverridden && <span className="ml-1 text-[9px] text-amber-600 align-top">Overridden</span>}
          </div>
        )}
      </td>
      <td className="px-4 py-2">
        {canOverride ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="1"
                min="0"
                value={lateValue === 0 ? '' : lateValue}
                placeholder="0"
                onChange={e => onChange({ lateOverride: e.target.value === '' ? 0 : parseInt(e.target.value, 10) })}
                disabled={disabled}
                className={numFld}
                title="Late minutes — computed from Time In vs. the approved schedule's start time, editable by Admin/HR"
              />
              {draft.lateOverride !== null && (
                <button
                  type="button"
                  onClick={() => onChange({ lateOverride: null, lateOverrideReason: '' })}
                  title="Reset to auto-computed"
                  className="text-gray-400 hover:text-gray-700"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
            {(draft.lateOverride !== null || lateOverridden) && (
              <input
                type="text"
                value={draft.lateOverrideReason}
                onChange={e => onChange({ lateOverrideReason: e.target.value })}
                disabled={disabled}
                placeholder="Reason (optional)"
                className="w-28 border border-gray-100 rounded px-1.5 py-0.5 text-[10px] text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
              />
            )}
          </div>
        ) : (
          <div className="text-right tabular-nums text-gray-700 text-xs">
            {lateValue > 0 ? lateValue : '—'}
            {lateOverridden && <span className="ml-1 text-[9px] text-amber-600 align-top">Overridden</span>}
          </div>
        )}
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-3 text-xs">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.isHolidayRegular}
              onChange={e => onChange({ isHolidayRegular: e.target.checked, isHolidaySpecial: e.target.checked ? false : draft.isHolidaySpecial })}
              disabled={disabled}
              className="rounded"
            />
            Reg Holiday
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.isHolidaySpecial}
              onChange={e => onChange({ isHolidaySpecial: e.target.checked, isHolidayRegular: e.target.checked ? false : draft.isHolidayRegular })}
              disabled={disabled}
              className="rounded"
            />
            Special
          </label>
        </div>
      </td>
    </tr>
  )
}
