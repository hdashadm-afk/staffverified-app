'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle, XCircle, Settings } from 'lucide-react'

interface StationWithBudget {
  id: string
  name: string
  weekly_hours_budget: number
  budget_warning_pct: number
}

interface DTRSummary {
  station_id: string | null
  regular_hours: number
  overtime_hours: number
}

function BudgetBar({ used, budget, warningPct }: { used: number; budget: number; warningPct: number }) {
  if (budget === 0) return <div className="text-xs text-gray-400">No budget set</div>
  const pct = Math.min((used / budget) * 100, 100)
  const over = used > budget
  const warning = pct >= warningPct && !over

  return (
    <div className="space-y-1">
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            over ? 'bg-red-500' : warning ? 'bg-yellow-400' : 'bg-green-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{used.toFixed(1)} hrs used</span>
        <span>{budget} hrs budget</span>
      </div>
    </div>
  )
}

function StatusIcon({ used, budget, warningPct }: { used: number; budget: number; warningPct: number }) {
  if (budget === 0) return null
  const pct = (used / budget) * 100
  if (used > budget) return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
  if (pct >= warningPct) return <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
  return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
}

export default function HoursBudgetDashboard({
  stations,
  dtrEntries,
  weekStart,
  weekEnd,
  isOwner,
  orgId,
}: {
  stations: StationWithBudget[]
  dtrEntries: DTRSummary[]
  weekStart: string
  weekEnd: string
  isOwner: boolean
  orgId: string
}) {
  const [editing, setEditing] = useState(false)
  const [budgets, setBudgets] = useState<Record<string, string>>(
    Object.fromEntries(stations.map(s => [s.id, s.weekly_hours_budget.toString()]))
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Compute used hours per station for this week
  const usedByStation: Record<string, number> = {}
  for (const entry of dtrEntries) {
    const sid = entry.station_id ?? 'unassigned'
    usedByStation[sid] = (usedByStation[sid] ?? 0) + entry.regular_hours + entry.overtime_hours
  }

  const totalBudget = stations.reduce((s, st) => s + st.weekly_hours_budget, 0)
  const totalUsed = stations.reduce((s, st) => s + (usedByStation[st.id] ?? 0), 0)
  const overCount = stations.filter(st => (usedByStation[st.id] ?? 0) > st.weekly_hours_budget && st.weekly_hours_budget > 0).length
  const warningCount = stations.filter(st => {
    const used = usedByStation[st.id] ?? 0
    const pct = st.weekly_hours_budget > 0 ? (used / st.weekly_hours_budget) * 100 : 0
    return pct >= st.budget_warning_pct && used <= st.weekly_hours_budget
  }).length

  async function saveBudgets() {
    setSaving(true)
    setSaveError(null)
    const failed: string[] = []
    for (const station of stations) {
      const val = parseFloat(budgets[station.id]) || 0
      if (val !== station.weekly_hours_budget) {
        const { error } = await supabase
          .from('stations')
          .update({ weekly_hours_budget: val })
          .eq('id', station.id)
        if (error) failed.push(station.name)
      }
    }
    setSaving(false)

    if (failed.length > 0) {
      setSaveError(`Could not save budget for: ${failed.join(', ')}`)
      return
    }

    setEditing(false)
    router.refresh()
  }

  const ws = new Date(weekStart + 'T00:00:00')
  const we = new Date(weekEnd + 'T00:00:00')
  const weekLabel = `${ws.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="space-y-5">
      {/* Week header + summary */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-gray-700">Week of {weekLabel}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {totalUsed.toFixed(1)} / {totalBudget} total hrs used across all stations
          </div>
        </div>
        {isOwner && (
          <button
            onClick={() => setEditing(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            {editing ? 'Cancel' : 'Edit budgets'}
          </button>
        )}
      </div>

      {/* Alert banners */}
      {overCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span><strong>{overCount} station{overCount > 1 ? 's' : ''} over budget</strong> this week — review schedules.</span>
        </div>
      )}
      {warningCount > 0 && overCount === 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 text-sm text-yellow-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span><strong>{warningCount} station{warningCount > 1 ? 's' : ''} approaching budget</strong> — watch hours for the rest of the week.</span>
        </div>
      )}

      {/* Station cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {stations.map(station => {
          const used = usedByStation[station.id] ?? 0
          const budget = editing
            ? parseFloat(budgets[station.id]) || 0
            : station.weekly_hours_budget
          const remaining = Math.max(budget - used, 0)
          const over = used > budget && budget > 0

          return (
            <div
              key={station.id}
              className={`bg-white border rounded-xl shadow-sm px-5 py-4 space-y-3 ${
                over ? 'border-red-200' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon used={used} budget={budget} warningPct={station.budget_warning_pct} />
                  <span className="font-medium text-gray-900 text-sm">{station.name}</span>
                </div>
                {over && (
                  <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    +{(used - budget).toFixed(1)} hrs over
                  </span>
                )}
                {!over && budget > 0 && (
                  <span className="text-xs text-gray-400">{remaining.toFixed(1)} hrs left</span>
                )}
              </div>

              {editing && isOwner ? (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Weekly budget (hrs):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={budgets[station.id]}
                    onChange={e => setBudgets(prev => ({ ...prev, [station.id]: e.target.value }))}
                    className="w-24 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
                  />
                </div>
              ) : (
                <BudgetBar used={used} budget={budget} warningPct={station.budget_warning_pct} />
              )}
            </div>
          )
        })}
      </div>

      {/* Save budgets button */}
      {editing && isOwner && (
        <div className="flex items-center gap-3">
          <button
            onClick={saveBudgets}
            disabled={saving}
            className="bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save all budgets'}
          </button>
          {saveError && <span className="text-xs text-red-600">{saveError}</span>}
        </div>
      )}

      {/* Unassigned hours note */}
      {usedByStation['unassigned'] > 0 && (
        <div className="text-xs text-gray-400">
          {usedByStation['unassigned'].toFixed(1)} hrs logged without a station assignment — assign employees to stations to include them in budget tracking.
        </div>
      )}
    </div>
  )
}
