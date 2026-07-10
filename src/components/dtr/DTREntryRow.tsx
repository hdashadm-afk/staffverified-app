'use client'

import { useEffect, useState } from 'react'
import { DTREntry } from '@/types/database'
import { computeRegularHours, computeOvertimeHours, computeNightShiftHours } from '@/lib/payroll-math'
import { Check, Pencil, X } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DTREntryRow({
  date,
  entry,
  autoOpen,
  onAutoOpened,
  onSave,
}: {
  date: string
  entry: DTREntry | null
  // Parent signals "open this row for editing" after the previous row was saved.
  // The row consumes it once (calls onAutoOpened to clear it) so it fires exactly once.
  autoOpen: boolean
  onAutoOpened: () => void
  onSave: (date: string, timeIn: string, timeOut: string, flags: {
    isHolidayRegular: boolean
    isHolidaySpecial: boolean
    notes: string
  }) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [timeIn, setTimeIn] = useState(entry?.time_in ?? '')
  const [timeOut, setTimeOut] = useState(entry?.time_out ?? '')
  const [isHolidayRegular, setIsHolidayRegular] = useState(entry?.is_holiday_regular ?? false)
  const [isHolidaySpecial, setIsHolidaySpecial] = useState(entry?.is_holiday_special ?? false)
  const [notes, setNotes] = useState(entry?.notes ?? '')

  // Auto-advance: parent sets autoOpen=true after saving the previous row.
  // We enter edit mode, sync inputs from the latest entry, then tell parent we consumed the signal.
  useEffect(() => {
    if (autoOpen) {
      setTimeIn(entry?.time_in ?? '')
      setTimeOut(entry?.time_out ?? '')
      setIsHolidayRegular(entry?.is_holiday_regular ?? false)
      setIsHolidaySpecial(entry?.is_holiday_special ?? false)
      setNotes(entry?.notes ?? '')
      setEditing(true)
      onAutoOpened()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen])

  function startEdit() {
    setTimeIn(entry?.time_in ?? '')
    setTimeOut(entry?.time_out ?? '')
    setIsHolidayRegular(entry?.is_holiday_regular ?? false)
    setIsHolidaySpecial(entry?.is_holiday_special ?? false)
    setNotes(entry?.notes ?? '')
    setEditing(true)
  }

  const d = new Date(date + 'T00:00:00')
  const dayName = DAYS[d.getDay()]
  const isWeekend = d.getDay() === 0 || d.getDay() === 6

  const regHrs = entry?.regular_hours ?? 0
  const otHrs = entry?.overtime_hours ?? 0
  const nsdHrs = entry?.night_shift_hours ?? 0

  async function handleSave() {
    setSaving(true)
    await onSave(date, timeIn, timeOut, { isHolidayRegular, isHolidaySpecial, notes })
    setSaving(false)
    setEditing(false)
  }

  // Close this row WITHOUT saving — revert inputs to the last saved values.
  // Other rows left in edit mode are unaffected.
  function cancelEdit() {
    setTimeIn(entry?.time_in ?? '')
    setTimeOut(entry?.time_out ?? '')
    setIsHolidayRegular(entry?.is_holiday_regular ?? false)
    setIsHolidaySpecial(entry?.is_holiday_special ?? false)
    setNotes(entry?.notes ?? '')
    setEditing(false)
  }

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${isWeekend ? 'bg-orange-50/30' : ''} ${editing ? 'bg-red-50' : ''}`}>
      <td className="px-5 py-2.5 text-gray-700 tabular-nums">
        {d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
      </td>
      <td className={`px-4 py-2.5 text-xs font-medium ${isWeekend ? 'text-orange-500' : 'text-gray-400'}`}>
        {dayName}
      </td>

      {editing ? (
        <>
          <td className="px-4 py-2">
            <input
              type="time"
              value={timeIn}
              onChange={e => setTimeIn(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 w-28"
            />
          </td>
          <td className="px-4 py-2">
            <input
              type="time"
              value={timeOut}
              onChange={e => setTimeOut(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 w-28"
            />
          </td>
          <td className="px-4 py-2 text-right text-gray-400 text-xs">
            {timeIn && timeOut ? computeRegularHours(timeIn, timeOut).toFixed(1) : '—'}
          </td>
          <td className="px-4 py-2 text-right text-gray-400 text-xs">
            {timeIn && timeOut ? computeOvertimeHours(timeIn, timeOut).toFixed(1) : '—'}
          </td>
          <td className="px-4 py-2 text-right text-gray-400 text-xs">
            {timeIn && timeOut ? computeNightShiftHours(timeIn, timeOut).toFixed(1) : '—'}
          </td>
          <td className="px-4 py-2">
            <div className="flex gap-3 text-xs">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={isHolidayRegular} onChange={e => { setIsHolidayRegular(e.target.checked); if (e.target.checked) setIsHolidaySpecial(false) }} className="rounded" />
                Reg Holiday
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={isHolidaySpecial} onChange={e => { setIsHolidaySpecial(e.target.checked); if (e.target.checked) setIsHolidayRegular(false) }} className="rounded" />
                Special
              </label>
            </div>
          </td>
          <td className="px-4 py-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                title="Save and advance to next row"
                className="flex items-center gap-1 text-green-600 hover:text-green-700 disabled:opacity-50 font-medium text-xs"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Saving…' : 'Save'}</span>
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                title="Cancel — close without saving"
                className="flex items-center gap-1 text-gray-400 hover:text-gray-700 disabled:opacity-50 text-xs"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="px-4 py-2.5 text-gray-600 tabular-nums">{entry?.time_in ?? '—'}</td>
          <td className="px-4 py-2.5 text-gray-600 tabular-nums">{entry?.time_out ?? '—'}</td>
          <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{regHrs > 0 ? regHrs.toFixed(1) : '—'}</td>
          <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{otHrs > 0 ? otHrs.toFixed(1) : '—'}</td>
          <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{nsdHrs > 0 ? nsdHrs.toFixed(1) : '—'}</td>
          <td className="px-4 py-2.5">
            <div className="flex flex-wrap gap-1">
              {entry?.is_holiday_regular && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Reg Hol</span>}
              {entry?.is_holiday_special && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">Special</span>}
              {!!entry?.late_minutes && <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Late {entry.late_minutes}m</span>}
              {!!entry?.undertime_minutes && <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">UT {entry.undertime_minutes}m</span>}
            </div>
          </td>
          <td className="px-4 py-2.5 text-right">
            <button
              onClick={startEdit}
              title="Edit this row"
              className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors text-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </td>
        </>
      )}
    </tr>
  )
}
