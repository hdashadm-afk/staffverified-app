'use client'

import { RotateCcw } from 'lucide-react'

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
  otOverrideReason: string
  nsdOverrideReason: string
}

export default function DTREntryRow({
  date,
  draft,
  regHrs,
  otHrs,
  nsdHrs,
  otOverridden,
  nsdOverridden,
  canOverride,
  onChange,
  disabled = false,
}: {
  date: string
  draft: DTRRowDraft
  /** Auto-computed from Time In/Out — always reflects the current time entry, regardless of override. */
  regHrs: number
  otHrs: number
  nsdHrs: number
  /** Whether the currently-saved entry (if any) was already overridden — shown as a badge. */
  otOverridden: boolean
  nsdOverridden: boolean
  /** Only Admin (owner) and HR (assistant) can edit OT/NSD directly — everyone else sees read-only values. */
  canOverride: boolean
  onChange: (patch: Partial<DTRRowDraft>) => void
  disabled?: boolean
}) {
  const d = new Date(date + 'T00:00:00')
  const dayName = DAYS[d.getDay()]
  const isWeekend = d.getDay() === 0 || d.getDay() === 6

  const otValue = draft.otOverride ?? otHrs
  const nsdValue = draft.nsdOverride ?? nsdHrs

  const numFld = 'w-16 border border-gray-200 rounded px-1.5 py-1 text-xs text-right text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-600 disabled:bg-gray-50 disabled:text-gray-400'

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${isWeekend ? 'bg-orange-50/30' : ''}`}>
      <td className="px-5 py-2.5 text-gray-700 tabular-nums">
        {d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
      </td>
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
