'use client'

import { useState } from 'react'
import { Permit, CompliancePenaltyRate } from '@/types/database'
import PermitCard from './PermitCard'

const STATUS_TABS = ['all', 'pending', 'overdue', 'submitted'] as const
type Tab = typeof STATUS_TABS[number]

export default function PermitList({
  permits,
  orgId,
  userId,
  penaltyRates,
}: {
  permits: (Permit & { stations: { name: string } | null })[]
  orgId: string
  userId: string
  penaltyRates: CompliancePenaltyRate[]
}) {
  const [tab, setTab] = useState<Tab>('all')

  const filtered = permits.filter(p => {
    if (tab === 'all') return true
    if (tab === 'overdue') {
      return p.status === 'pending' && new Date(p.due_date) < new Date()
    }
    return p.status === tab
  })

  const counts = {
    all: permits.length,
    pending: permits.filter(p => p.status === 'pending' && new Date(p.due_date) >= new Date()).length,
    overdue: permits.filter(p => p.status === 'pending' && new Date(p.due_date) < new Date()).length,
    submitted: permits.filter(p => p.status === 'submitted').length,
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        {STATUS_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t} {counts[t] > 0 && <span className="ml-1 text-xs opacity-60">{counts[t]}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No {tab === 'all' ? '' : tab} submissions found.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(permit => (
            <PermitCard key={permit.id} permit={permit} userId={userId} penaltyRates={penaltyRates} />
          ))}
        </div>
      )}
    </div>
  )
}
