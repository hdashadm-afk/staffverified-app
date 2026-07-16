'use client'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface DTRRowDraft {
  timeIn: string
  timeOut: string
  isHolidayRegular: boolean
  isHolidaySpecial: boolean
  // null = use the auto-computed value; a number = manually overridden
  otOverride: number | null
  nsdOverride: number | null
}

function HoursField({
  computed,
  override,
  onChange,
}: {
  computed: number
  override: number | null
  onChange: (value: number | null) => void
}) {
  const overridden = override !== null
  const shown = overridden ? override : computed

  return (
    <div className="flex items-center justify-end gap-1">
      {overridden && (
        <span title="Manually overridden — payroll uses this value" className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
      )}
      <input
        type="number"
        step="0.25"
        min="0"
        value={shown ? shown.toFixed(2).replace(/\.?0+$/, '') || '0' : ''}
        placeholder="0"
        onChange={e => {
          const raw = e.target.value
          if (raw === '') { onChange(null); return }
          const val = parseFloat(raw)
          if (Number.isNaN(val)) return
          onChange(val === computed ? null : val)
        }}
        className={`w-16 border rounded px-1.5 py-1 text-right text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-brand-blue-600 ${
          overridden ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-gray-200 text-gray-700'
        }`}
      />
    </div>
  )
}

export default function DTREntryRow({
  date,
  draft,
  regHrs,
  otHrs,
  nsdHrs,
  onChange,
  disabled = false,
}: {
  date: string
  draft: DTRRowDraft
  regHrs: number
  otHrs: number
  nsdHrs: number
  onChange: (patch: Partial<DTRRowDraft>) => void
  disabled?: boolean
}) {
  const d = new Date(date + 'T00:00:00')
  const dayName = DAYS[d.getDay()]
  const isWeekend = d.getDay() === 0 || d.getDay() === 6

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
        <HoursField
          computed={otHrs}
          override={draft.otOverride}
          onChange={v => onChange({ otOverride: v })}
        />
      </td>
      <td className="px-4 py-2">
        <HoursField
          computed={nsdHrs}
          override={draft.nsdOverride}
          onChange={v => onChange({ nsdOverride: v })}
        />
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
