'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { NTERecordWithEmployee } from '@/types/database'
import { CheckCircle2, Circle, ExternalLink, Download } from 'lucide-react'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const OFFENSE_BADGE: Record<string, string> = {
  '1st': 'bg-yellow-50 text-yellow-800',
  '2nd': 'bg-orange-50 text-orange-800',
  '3rd': 'bg-red-50 text-red-700',
}

export default function DisciplinaryList({ records }: { records: NTERecordWithEmployee[] }) {
  const [toggling, setToggling] = useState<string | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'acknowledged'>('all')
  const router = useRouter()
  const supabase = createClient()

  async function toggleAcknowledged(record: NTERecordWithEmployee) {
    setToggling(record.id)
    const { error } = await supabase
      .from('nte_records')
      .update({ acknowledged: !record.acknowledged })
      .eq('id', record.id)
    setToggling(null)
    if (error) {
      alert(`Could not update record: ${error.message}`)
      return
    }
    router.refresh()
  }

  async function openPdf(record: NTERecordWithEmployee, download = false) {
    if (!record.pdf_url) return
    setViewing(record.id)
    const { data, error } = await supabase.storage
      .from('nte-documents')
      .createSignedUrl(record.pdf_url, 3600)
    setViewing(null)
    if (error || !data) {
      alert('Could not generate download link. Please try again.')
      return
    }
    if (download) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = `NTE-${record.employees?.full_name ?? 'employee'}-${record.date_issued}.pdf`
      a.click()
    } else {
      window.open(data.signedUrl, '_blank')
    }
  }

  const filtered = records.filter(r => {
    if (filter === 'pending') return !r.acknowledged
    if (filter === 'acknowledged') return r.acknowledged
    return true
  })

  const pendingCount = records.filter(r => !r.acknowledged).length

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {(['pending', 'acknowledged', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f === 'pending'
              ? `Pending (${pendingCount})`
              : f === 'all'
              ? `All (${records.length})`
              : 'Acknowledged'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl px-6 py-12 text-center text-gray-400 text-sm">
          {filter === 'pending' ? 'No pending NTEs — all acknowledged.' : 'No records yet.'}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-50">
          {filtered.map(record => (
            <div
              key={record.id}
              className={`px-5 py-4 flex gap-4 items-start ${record.acknowledged ? 'opacity-60' : ''}`}
            >
              {/* Acknowledge toggle */}
              <button
                onClick={() => toggleAcknowledged(record)}
                disabled={toggling === record.id}
                title={record.acknowledged ? 'Mark pending' : 'Mark acknowledged'}
                className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors disabled:opacity-40"
              >
                {record.acknowledged
                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                  : <Circle className="w-5 h-5" />
                }
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">
                    {record.employees?.full_name ?? '—'}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      OFFENSE_BADGE[record.offense_number] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {record.offense_number} offense
                  </span>
                  {record.acknowledged && (
                    <span className="text-xs text-green-600 font-medium">Acknowledged</span>
                  )}
                </div>

                <div className="text-sm text-gray-700 font-medium">{record.violation}</div>

                <div className="text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-0.5">
                  <span>Issued {formatDate(record.date_issued)}</span>
                  <span>Incident {formatDate(record.incident_date)}</span>
                  <span>By {record.issued_by}</span>
                </div>

                {record.description && (
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mt-1">
                    {record.description}
                  </p>
                )}
              </div>

              {/* PDF actions */}
              {record.pdf_url && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openPdf(record)}
                    disabled={viewing === record.id}
                    title="View PDF"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openPdf(record, true)}
                    disabled={viewing === record.id}
                    title="Download PDF"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
