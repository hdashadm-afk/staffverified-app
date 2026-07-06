'use client'

import { useEffect, useState } from 'react'
import { Permit, CompliancePenaltyRate, PermitHistoryEntry } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, History } from 'lucide-react'

function statusBadge(status: string, dueDate: string) {
  const overdue = status === 'pending' && new Date(dueDate) < new Date()
  if (overdue) return { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertCircle }
  if (status === 'submitted') return { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle }
  if (status === 'acknowledged') return { label: 'Acknowledged', color: 'bg-red-100 text-red-700', icon: CheckCircle }
  return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock }
}

function daysUntil(date: string) {
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Due today'
  return `Due in ${diff}d`
}

function monthsOverdue(dueDate: string) {
  const diffDays = Math.ceil((Date.now() - new Date(dueDate).getTime()) / 86400000)
  return Math.max(1, Math.ceil(diffDays / 30))
}

export default function PermitCard({
  permit,
  userId,
  penaltyRates,
}: {
  permit: Permit & { stations: { name: string } | null }
  userId: string
  penaltyRates: CompliancePenaltyRate[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState(permit.notes ?? '')
  const [amountDue, setAmountDue] = useState(permit.amount_due?.toString() ?? '')
  const [amountPaid, setAmountPaid] = useState(permit.amount_paid?.toString() ?? permit.amount_due?.toString() ?? '')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [history, setHistory] = useState<PermitHistoryEntry[] | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const badge = statusBadge(permit.status, permit.due_date)
  const Icon = badge.icon
  const overdue = permit.status === 'pending' && new Date(permit.due_date) < new Date()

  const penaltyRate = penaltyRates.find(r => r.agency === permit.agency)
  const dueAmountForEstimate = permit.amount_due ?? (amountDue ? Number(amountDue) : null)
  const penaltyEstimate =
    overdue && penaltyRate && dueAmountForEstimate
      ? (dueAmountForEstimate * penaltyRate.rate_percent) / 100 * monthsOverdue(permit.due_date)
      : null

  useEffect(() => {
    if (!expanded || history !== null) return
    supabase
      .from('permit_history')
      .select('*')
      .eq('permit_id', permit.id)
      .order('changed_at', { ascending: false })
      .then(({ data }) => setHistory(data ?? []))
  }, [expanded, history, permit.id, supabase])

  async function markResolved() {
    setSubmitting(true)

    let proofFilePath = permit.proof_file_path
    if (receipt) {
      const path = `${permit.org_id}/${permit.id}-${Date.now()}-${receipt.name}`
      const { data: upload, error: uploadError } = await supabase.storage
        .from('compliance-receipts')
        .upload(path, receipt)
      if (!uploadError && upload) proofFilePath = upload.path
    }

    const now = new Date().toISOString()
    await supabase
      .from('permits')
      .update({
        status: 'submitted',
        submitted_at: now,
        submitted_by: userId,
        resolved_at: now,
        resolved_by: userId,
        amount_due: amountDue ? Number(amountDue) : null,
        amount_paid: amountPaid ? Number(amountPaid) : null,
        proof_file_path: proofFilePath,
        notes: notes || null,
      })
      .eq('id', permit.id)

    await supabase.from('permit_history').insert({
      permit_id: permit.id,
      org_id: permit.org_id,
      from_status: permit.status,
      to_status: 'submitted',
      amount_paid: amountPaid ? Number(amountPaid) : null,
      notes: notes || null,
      changed_by: userId,
    })

    setSubmitting(false)
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

          {permit.status === 'submitted' && permit.resolved_at && (
            <div className="text-xs text-gray-500">
              Resolved {new Date(permit.resolved_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
              {permit.amount_paid != null && ` · Paid ₱${permit.amount_paid.toLocaleString()}`}
            </div>
          )}

          {overdue && penaltyEstimate != null && penaltyRate && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
              Est. penalty if paid now: <span className="font-semibold">₱{penaltyEstimate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              {' '}({penaltyRate.rate_percent}%/{penaltyRate.rate_period} — reference only, confirm with {permit.agency} before relying on this)
            </div>
          )}

          {permit.status !== 'submitted' && permit.status !== 'acknowledged' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount due (₱, optional)</label>
                  <input
                    type="number"
                    value={amountDue}
                    onChange={e => setAmountDue(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount paid (₱)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Receipt / proof (optional)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => setReceipt(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-600"
                />
              </div>
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
                onClick={markResolved}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Resolving…' : 'Resolve now'}
              </button>
            </div>
          )}

          {history && history.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
                <History className="w-3.5 h-3.5" /> History
              </div>
              <ul className="space-y-1.5">
                {history.map(h => (
                  <li key={h.id} className="text-xs text-gray-500">
                    {new Date(h.changed_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' — '}{h.from_status ?? 'new'} → {h.to_status}
                    {h.amount_paid != null && ` · ₱${h.amount_paid.toLocaleString()}`}
                    {h.notes ? ` · ${h.notes}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
