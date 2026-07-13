'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FeedbackReport } from '@/types/database'
import { CheckCircle2, Circle, Bug, Lightbulb, HelpCircle, Paperclip, Loader2 } from 'lucide-react'

function attachmentName(path: string) {
  const withoutPrefix = path.split('/').pop() ?? path
  return withoutPrefix.replace(/^\d+-/, '')
}

const SEVERITY_META = {
  bug:        { label: 'Bug',        Icon: Bug,         badge: 'bg-red-50 text-red-700' },
  suggestion: { label: 'Suggestion', Icon: Lightbulb,   badge: 'bg-blue-50 text-blue-700' },
  question:   { label: 'Question',   Icon: HelpCircle,  badge: 'bg-amber-50 text-amber-700' },
}

export default function FeedbackList({ reports }: { reports: FeedbackReport[] }) {
  const [toggling, setToggling] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open')
  const [openingPath, setOpeningPath] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function openAttachment(path: string) {
    setOpeningPath(path)
    const { data, error } = await supabase.storage
      .from('feedback-attachments')
      .createSignedUrl(path, 60)
    setOpeningPath(null)
    if (error || !data) return
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function toggleResolved(report: FeedbackReport) {
    setToggling(report.id)
    const { error } = await supabase
      .from('feedback_reports')
      .update({
        is_resolved: !report.is_resolved,
        resolved_at: !report.is_resolved ? new Date().toISOString() : null,
      })
      .eq('id', report.id)
    setToggling(null)
    if (error) {
      alert(`Could not update report: ${error.message}`)
      return
    }
    router.refresh()
  }

  const filtered = reports.filter(r => {
    if (filter === 'open') return !r.is_resolved
    if (filter === 'resolved') return r.is_resolved
    return true
  })

  const openCount = reports.filter(r => !r.is_resolved).length

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {(['open', 'resolved', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-brand-blue-50 text-brand-blue-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f === 'open' ? `Open (${openCount})` : f === 'all' ? `All (${reports.length})` : 'Resolved'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl px-6 py-12 text-center text-gray-400 text-sm">
          {filter === 'open' ? 'No open reports — all clear.' : 'Nothing here yet.'}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-50">
          {filtered.map(report => {
            const meta = SEVERITY_META[report.severity as keyof typeof SEVERITY_META] ?? SEVERITY_META.bug
            const SIcon = meta.Icon
            return (
              <div key={report.id} className={`px-5 py-4 flex gap-4 ${report.is_resolved ? 'opacity-60' : ''}`}>
                {/* Resolve toggle */}
                <button
                  onClick={() => toggleResolved(report)}
                  disabled={toggling === report.id}
                  title={report.is_resolved ? 'Mark open' : 'Mark resolved'}
                  className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors disabled:opacity-40"
                >
                  {report.is_resolved
                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                    : <Circle className="w-5 h-5" />
                  }
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${meta.badge}`}>
                      <SIcon className="w-3 h-3" />
                      {meta.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(report.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{report.message}</p>
                  {report.attachment_paths.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {report.attachment_paths.map(path => (
                        <button
                          key={path}
                          type="button"
                          onClick={() => openAttachment(path)}
                          disabled={openingPath === path}
                          title={attachmentName(path)}
                          className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 max-w-[10rem] disabled:opacity-50"
                        >
                          {openingPath === path
                            ? <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                            : <Paperclip className="w-3 h-3 flex-shrink-0" />}
                          <span className="truncate">{attachmentName(path)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                    <span>{report.user_name} · {report.user_email}</span>
                    <span className="truncate max-w-xs">{report.page_url}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
