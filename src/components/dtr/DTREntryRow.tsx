'use client'

import { useState } from 'react'
import { DTREntry } from '@/types/database'
import { computeRegularHours, computeOvertimeHours, computeNightShiftHours } from '@/lib/payroll-math'
import { Check, Pencil } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DTREntryRow({
  date,
  entry,
  onSave,
}: {
  date: string
  entry: DTREntry | null
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

  const d = new Date(date + 'T00:00:00')
  const dayName = DAYS[d.getDay()]
  const isWeekend = d.getDay() === 0 || d.getDay() === 6

  const regHrs = entry ? entry.regular_hours : 0
  const otHrs = entry ? entry.overtime_hours : 0
  const nsdHrs = entry ? entry.night_shift_hours : 0

  async function handleSave() {
    setSaving(true)
    await onSave(date, timeIn, timeOut, { isHolidayRegular, isHolidaySpecial, notes })
    setSaving(false)
    setEditing(false)
  }

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${isWeekend ? 'bg-orange-50/30' : ''} ${editing ? 'bg-blue-50' : ''}`}>
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
              className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
            />
          </td>
          <td className="px-4 py-2">
            <input
              type="time"
              value={timeOut}
              onChange={e => setTimeOut(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
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
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-green-600 hover:text-green-700 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
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
            {entry?.is_holiday_regular && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Reg Hol</span>}
            {entry?.is_holiday_special && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">Special</span>}
          </td>
          <td className="px-4 py-2.5 text-right">
            <button
              onClick={() => setEditing(true)}
              className="text-gray-300 hover:text-gray-600 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </td>
        </>
      )}
    </tr>
  )
}
