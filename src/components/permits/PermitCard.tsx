'use client'

import { useState } from 'react'
import { Permit } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

function statusBadge(status: string, dueDate: string) {
  const overdue = status === 'pending' && new Date(dueDate) < new Date()
  if (overdue) return { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertCircle }
  if (status === 'submitted') return { label: 'Submitted', color: 'bg-green-100 text-green-700', icon: CheckCircle }
  if (status === 'acknowledged') return { label: 'Acknowledged', color: 'bg-red-100 text-red-700', icon: CheckCircle }
  return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock }
}

function daysUntil(date: string) {
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Due today'
  return `Due in ${diff}d`
}

export default function PermitCard({
  permit,
  userId,
}: {
  permit: Permit & { stations: { name: string } | null }
  userId: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState(permit.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const badge = statusBadge(permit.status, permit.due_date)
  const Icon = badge.icon

  async function markSubmitted() {
    setSubmitting(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('permits')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submitted_by: userId,
        notes: notes || null,
      })
      .eq('id', permit.id)
    setSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    router.refresh()
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
            <Icon className="w-3.5 h-3.5" />
            {badge.label}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{permit.permit_type}</div>
            <div className="text-xs text-gray-400">{permit.agency}{permit.stations?.name ? ` · ${permit.stations.name}` : ''}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs text-gray-500 text-right">
            <div>{new Date(permit.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div className={permit.status === 'pending' && new Date(permit.due_date) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'}>
              {daysUntil(permit.due_date)}
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {permit.description && (
            <p className="text-sm text-gray-600">{permit.description}</p>
          )}

          {permit.status === 'submitted' && permit.submitted_at && (
            <div className="text-xs text-gray-500">
              Submitted {new Date(permit.submitted_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          )}

          {permit.status !== 'submitted' && permit.status !== 'acknowledged' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. reference number, portal screenshot note…"
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
              <button
                onClick={markSubmitted}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Marking…' : 'Mark as Submitted'}
              </button>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
