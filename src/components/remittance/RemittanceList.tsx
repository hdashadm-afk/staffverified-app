'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useState } from 'react'

interface RemittanceRecord {
  id: string
  agency: string
  period_start: string
  period_end: string
  total_deducted: number
  total_remitted: number
  variance: number
  variance_reason: string | null
  submitted_at: string | null
  reference_number: string | null
  notes: string | null
}

function VarianceBadge({ variance }: { variance: number }) {
  if (variance === 0) return (
    <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
      <CheckCircle className="w-3 h-3" /> Zero variance
    </span>
  )
  if (variance < 0) return (
    <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
      <AlertTriangle className="w-3 h-3" /> Short ₱{Math.abs(variance).toLocaleString()}
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
      <AlertTriangle className="w-3 h-3" /> Over ₱{variance.toLocaleString()}
    </span>
  )
}

function AgencyBadge({ agency }: { agency: string }) {
  const colors: Record<string, string> = {
    SSS: 'bg-blue-100 text-blue-700',
    PhilHealth: 'bg-green-100 text-green-700',
    HDMF: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors[agency] ?? 'bg-gray-100 text-gray-700'}`}>
      {agency}
    </span>
  )
}

export default function RemittanceList({
  records,
  orgId,
  userId,
}: {
  records: RemittanceRecord[]
  orgId: string
  userId: string
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, { remitted: string; ref: string; reason: string; notes: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  function startEdit(r: RemittanceRecord) {
    setEditing(prev => ({
      ...prev,
      [r.id]: {
        remitted: r.total_remitted.toString(),
        ref: r.reference_number ?? '',
        reason: r.variance_reason ?? '',
        notes: r.notes ?? '',
      },
    }))
    setExpanded(r.id)
  }

  async function save(r: RemittanceRecord) {
    const e = editing[r.id]
    if (!e) return
    setSaving(r.id)

    await supabase.from('remittance_reconciliations').update({
      total_remitted: parseFloat(e.remitted) || 0,
      reference_number: e.ref || null,
      variance_reason: e.reason || null,
      notes: e.notes || null,
      submitted_at: e.ref ? new Date().toISOString() : r.submitted_at,
      submitted_by: userId,
    }).eq('id', r.id)

    setSaving(null)
    setExpanded(null)
    router.refresh()
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No remittance records yet. Create one after each payroll run.
      </div>
    )
  }

  const withVariance = records.filter(r => r.variance !== 0)

  return (
    <div className="space-y-4">
      {withVariance.length > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span><strong>{withVariance.length} record{withVariance.length > 1 ? 's' : ''}</strong> with variance — add explanation or correct the remitted amount.</span>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Agency</th>
              <th className="text-left px-4 py-3 font-medium">Period</th>
              <th className="text-right px-4 py-3 font-medium">Deducted</th>
              <th className="text-right px-4 py-3 font-medium">Remitted</th>
              <th className="text-left px-4 py-3 font-medium">Variance</th>
              <th className="text-left px-4 py-3 font-medium">Ref #</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {records.map(r => (
              <>
                <tr
                  key={r.id}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${r.variance !== 0 ? 'bg-red-50/30' : ''}`}
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <td className="px-5 py-3"><AgencyBadge agency={r.agency} /></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {new Date(r.period_start + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} –{' '}
                    {new Date(r.period_end + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">₱{r.total_deducted.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">₱{r.total_remitted.toLocaleString()}</td>
                  <td className="px-4 py-3"><VarianceBadge variance={r.variance} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.reference_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); startEdit(r) }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Update
                    </button>
                  </td>
                </tr>

                {expanded === r.id && (
                  <tr key={`${r.id}-detail`}>
                    <td colSpan={7} className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4 max-w-lg">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Amount actually remitted (₱)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editing[r.id]?.remitted ?? r.total_remitted}
                            onChange={e => setEditing(prev => ({ ...prev, [r.id]: { ...prev[r.id], remitted: e.target.value } }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Agency reference / SBR number</label>
                          <input
                            value={editing[r.id]?.ref ?? ''}
                            onChange={e => setEditing(prev => ({ ...prev, [r.id]: { ...prev[r.id], ref: e.target.value } }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. SBR-2025-001234"
                          />
                        </div>
                        {(editing[r.id]?.remitted && parseFloat(editing[r.id].remitted) !== r.total_deducted) && (
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-red-600 mb-1">Variance reason (required when variance ≠ 0)</label>
                            <input
                              value={editing[r.id]?.reason ?? ''}
                              onChange={e => setEditing(prev => ({ ...prev, [r.id]: { ...prev[r.id], reason: e.target.value } }))}
                              className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                              placeholder="e.g. new hire first month, adjusted rate, late enrollment"
                            />
                          </div>
                        )}
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                          <input
                            value={editing[r.id]?.notes ?? ''}
                            onChange={e => setEditing(prev => ({ ...prev, [r.id]: { ...prev[r.id], notes: e.target.value } }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional"
                          />
                        </div>
                        <div className="col-span-2">
                          <button
                            onClick={() => save(r)}
                            disabled={saving === r.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {saving === r.id ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
