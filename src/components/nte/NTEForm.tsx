'use client'

import { useState } from 'react'
import { Employee } from '@/types/database'
import NTEPreview from './NTEPreview'

// Code of Discipline reference — standard Philippine HR
const VIOLATIONS = [
  { code: 'A-1', label: 'Tardiness / Habitual Late', sanction: 'Written Reprimand (1st), 3-day suspension (2nd), Dismissal (3rd)' },
  { code: 'A-2', label: 'Unauthorized Absence (AWOL)', sanction: 'Written Reprimand (1st), 5-day suspension (2nd), Dismissal (3rd)' },
  { code: 'A-3', label: 'Undertime without permission', sanction: 'Written Reprimand (1st), 3-day suspension (2nd), Dismissal (3rd)' },
  { code: 'B-1', label: 'Insubordination / Refusal to follow orders', sanction: '3-day suspension (1st), 5-day suspension (2nd), Dismissal (3rd)' },
  { code: 'B-2', label: 'Disrespect to superior or co-employee', sanction: 'Written Reprimand (1st), 5-day suspension (2nd), Dismissal (3rd)' },
  { code: 'C-1', label: 'Cash shortage / Cash handling violation', sanction: '5-day suspension (1st), Dismissal (2nd)' },
  { code: 'C-2', label: 'Theft / Misappropriation of company funds or property', sanction: 'Dismissal (1st offense)' },
  { code: 'D-1', label: 'Sleeping on duty', sanction: 'Written Reprimand (1st), 3-day suspension (2nd), Dismissal (3rd)' },
  { code: 'D-2', label: 'Negligence of duties resulting in loss or damage', sanction: '3-day suspension (1st), Dismissal (2nd)' },
  { code: 'E-1', label: 'Falsification of records or documents', sanction: 'Dismissal (1st offense)' },
  { code: 'F-1', label: 'Gross misconduct', sanction: 'Dismissal (1st offense)' },
  { code: 'Other', label: 'Other violation (specify below)', sanction: '' },
]

export interface NTEData {
  employeeName: string
  employeePosition: string
  orgName: string
  dateIssued: string
  dateOfIncident: string
  violationCode: string
  violationLabel: string
  sanctionSchedule: string
  incidentDescription: string
  responseDeadlineDays: number
  issuedBy: string
  offenseNumber: string
}

export default function NTEForm({
  employees,
  orgName,
  issuedBy,
}: {
  employees: Pick<Employee, 'id' | 'full_name' | 'position'>[]
  orgName: string
  issuedBy: string
}) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState<NTEData>({
    employeeName: '',
    employeePosition: '',
    orgName,
    dateIssued: today,
    dateOfIncident: today,
    violationCode: '',
    violationLabel: '',
    sanctionSchedule: '',
    incidentDescription: '',
    responseDeadlineDays: 5,
    issuedBy,
    offenseNumber: '1st',
  })

  const [preview, setPreview] = useState(false)

  function selectEmployee(id: string) {
    const emp = employees.find(e => e.id === id)
    if (emp) {
      setForm(f => ({
        ...f,
        employeeName: emp.full_name,
        employeePosition: emp.position ?? '',
      }))
    }
  }

  function selectViolation(code: string) {
    const v = VIOLATIONS.find(v => v.code === code)
    if (v) {
      setForm(f => ({
        ...f,
        violationCode: v.code,
        violationLabel: v.label,
        sanctionSchedule: v.sanction,
      }))
    }
  }

  const isReady = form.employeeName && form.violationCode && form.incidentDescription

  if (preview) {
    return (
      <div>
        <button
          onClick={() => setPreview(false)}
          className="mb-4 text-sm text-red-600 hover:underline"
        >
          ← Back to form
        </button>
        <NTEPreview data={form} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Employee */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-5 space-y-4">
        <div className="text-sm font-semibold text-gray-800">Employee</div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Select employee</label>
            <select
              onChange={e => selectEmployee(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">— choose —</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
            <input
              value={form.employeePosition}
              onChange={e => setForm(f => ({ ...f, employeePosition: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Position"
            />
          </div>
        </div>
      </div>

      {/* Incident */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-5 space-y-4">
        <div className="text-sm font-semibold text-gray-800">Incident</div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date issued</label>
            <input
              type="date"
              value={form.dateIssued}
              onChange={e => setForm(f => ({ ...f, dateIssued: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date of incident</label>
            <input
              type="date"
              value={form.dateOfIncident}
              onChange={e => setForm(f => ({ ...f, dateOfIncident: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Violation (Code of Discipline)</label>
          <select
            value={form.violationCode}
            onChange={e => selectViolation(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">— select violation —</option>
            {VIOLATIONS.map(v => (
              <option key={v.code} value={v.code}>{v.code} — {v.label}</option>
            ))}
          </select>
        </div>

        {form.violationCode === 'Other' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Specify violation</label>
            <input
              value={form.violationLabel}
              onChange={e => setForm(f => ({ ...f, violationLabel: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Describe the violation"
            />
          </div>
        )}

        {form.sanctionSchedule && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 text-xs text-yellow-800">
            <span className="font-medium">Sanction schedule:</span> {form.sanctionSchedule}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Offense number</label>
            <select
              value={form.offenseNumber}
              onChange={e => setForm(f => ({ ...f, offenseNumber: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="1st">1st Offense</option>
              <option value="2nd">2nd Offense</option>
              <option value="3rd">3rd Offense</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Days to respond</label>
            <input
              type="number"
              min={1}
              max={30}
              value={form.responseDeadlineDays}
              onChange={e => setForm(f => ({ ...f, responseDeadlineDays: parseInt(e.target.value) || 5 }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description of incident *</label>
          <textarea
            value={form.incidentDescription}
            onChange={e => setForm(f => ({ ...f, incidentDescription: e.target.value }))}
            rows={5}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            placeholder="Describe what happened, when, where, and what company rule or policy was violated…"
          />
        </div>
      </div>

      <button
        onClick={() => setPreview(true)}
        disabled={!isReady}
        className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-40"
      >
        Preview & Print NTE
      </button>
    </div>
  )
}
