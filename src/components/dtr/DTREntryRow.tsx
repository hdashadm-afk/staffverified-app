'use client'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface DTRRowDraft {
  timeIn: string
  timeOut: string
  isHolidayRegular: boolean
  isHolidaySpecial: boolean
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
      <td className="px-4 py-2 text-right tabular-nums text-gray-700 text-xs">
        {otHrs > 0 ? otHrs.toFixed(1) : '—'}
      </td>
      <td className="px-4 py-2 text-right tabular-nums text-gray-700 text-xs">
        {nsdHrs > 0 ? nsdHrs.toFixed(1) : '—'}
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
