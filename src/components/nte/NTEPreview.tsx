'use client'

import { NTEData } from './NTEForm'
import { Printer } from 'lucide-react'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function NTEPreview({ data }: { data: NTEData }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5 no-print">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print / Save as PDF
        </button>
        <span className="text-xs text-gray-400">Use your browser's Print → Save as PDF to save a copy.</span>
      </div>

      {/* NTE Document — styled for print */}
      <div
        id="nte-document"
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 max-w-2xl text-sm leading-relaxed print:shadow-none print:border-none print:rounded-none print:p-0"
        style={{ fontFamily: 'Times New Roman, serif' }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-lg font-bold uppercase tracking-wider">{data.orgName}</div>
          <div className="text-base font-bold uppercase mt-3">NOTICE TO EXPLAIN</div>
        </div>

        {/* Date and Addressee */}
        <div className="mb-6">
          <div className="mb-1"><span className="font-bold">Date:</span> {formatDate(data.dateIssued)}</div>
          <div className="mb-1"><span className="font-bold">To:</span> {data.employeeName}</div>
          <div><span className="font-bold">Position:</span> {data.employeePosition || '_______________'}</div>
        </div>

        {/* Body */}
        <div className="mb-5">
          <p className="mb-4">
            This constitutes a formal Notice to Explain issued to you in connection with an incident that occurred on <span className="font-bold">{formatDate(data.dateOfIncident)}</span>.
          </p>

          <p className="mb-4">
            Records show that you have committed the following violation of the Company's Code of Discipline:
          </p>

          <div className="border border-gray-300 rounded px-4 py-3 mb-4 bg-gray-50">
            <div className="font-bold">
              {data.violationCode !== 'Other' && `[${data.violationCode}] `}
              {data.violationLabel}
            </div>
            {data.sanctionSchedule && (
              <div className="text-xs text-gray-600 mt-1">Sanction schedule: {data.sanctionSchedule}</div>
            )}
            <div className="text-xs text-gray-600 mt-0.5">This is your <span className="font-bold">{data.offenseNumber} offense</span> for this violation.</div>
          </div>

          <p className="mb-4 font-bold">Description of the incident:</p>
          <div className="border-l-4 border-gray-300 pl-4 mb-4 whitespace-pre-line text-gray-700">
            {data.incidentDescription}
          </div>

          <p className="mb-4">
            You are hereby required to submit your written explanation within <span className="font-bold">{data.responseDeadlineDays} ({data.responseDeadlineDays}) calendar days</span> from receipt of this notice, or on or before <span className="font-bold">{addDays(data.dateIssued, data.responseDeadlineDays)}</span>. Your failure to submit a written explanation within the prescribed period shall be construed as a waiver of your right to be heard, and the Company shall proceed to resolve the matter based on available evidence.
          </p>

          <p className="mb-4">
            Please be reminded that this notice does not constitute a prejudgment of the case against you. You are given the opportunity to present your side and any evidence in your defense.
          </p>
        </div>

        {/* Signature blocks */}
        <div className="mt-12 grid grid-cols-2 gap-8">
          <div>
            <div className="border-t border-gray-800 pt-2 mt-12">
              <div className="font-bold">{data.issuedBy}</div>
              <div className="text-xs text-gray-600">Issued by</div>
            </div>
          </div>
          <div>
            <div className="border-t border-gray-800 pt-2 mt-12">
              <div className="font-bold">{data.employeeName}</div>
              <div className="text-xs text-gray-600">Received by (signature over printed name)</div>
            </div>
            <div className="mt-4">
              <div className="text-xs text-gray-600">Date received: ___________________</div>
            </div>
          </div>
        </div>

        {/* Note at bottom */}
        <div className="mt-10 border-t border-gray-200 pt-4 text-xs text-gray-500 italic">
          This document is issued pursuant to the Company's Code of Discipline and due process requirements under Philippine Labor Law (Labor Code, Book VI, Rule I, Section 2).
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          #nte-document { margin: 0; }
        }
      `}</style>
    </div>
  )
}
