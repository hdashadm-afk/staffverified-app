'use client'

import { useState } from 'react'
import { Employee, Position, Station } from '@/types/database'
import EmployeeRow from './EmployeeRow'

export default function EmployeeList({
  employees,
  orgId,
  stations,
  positions,
}: {
  employees: (Employee & { stations: { name: string } | null })[]
  orgId: string
  stations: Pick<Station, 'id' | 'name'>[]
  positions: Pick<Position, 'id' | 'name'>[]
}) {
  const [showInactive, setShowInactive] = useState(false)

  const visible = employees.filter(e => showInactive || e.is_active)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          {employees.filter(e => e.is_active).length} active staff
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="rounded"
          />
          Show inactive
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No employees yet. Add your first staff member.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Position</th>
                <th className="text-left px-4 py-3 font-medium">Station</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">Daily Rate</th>
                <th className="text-left px-4 py-3 font-medium">SIL</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map(emp => (
                <EmployeeRow key={emp.id} employee={emp} stations={stations} positions={positions} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
