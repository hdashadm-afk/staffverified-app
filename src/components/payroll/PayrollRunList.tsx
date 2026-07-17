'use client'

import { useState } from 'react'
import { PayrollRun, Employee } from '@/types/database'
import { OrgRates } from '@/lib/payroll-math'
import PayrollRunCard from './PayrollRunCard'

export default function PayrollRunList({
  runs,
  employees,
  orgId,
  orgRates,
}: {
  runs: (PayrollRun & { stations: { name: string } | null })[]
  employees: Pick<Employee, 'id' | 'full_name' | 'daily_rate' | 'has_sil' | 'coop_saving_amount' | 'station_id' | 'regular_hours_per_day'>[]
  orgId: string
  orgRates: OrgRates
}) {
  if (runs.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No payroll runs yet. Create one to get started.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {runs.map(run => (
        <PayrollRunCard
          key={run.id}
          run={run}
          employees={employees}
          orgId={orgId}
          orgRates={orgRates}
        />
      ))}
    </div>
  )
}
