'use client'

import { useState } from 'react'
import { PayrollRun, Employee, Payslip, DTREntry } from '@/types/database'
import { OrgRates, summarizeCutoffEarnings } from '@/lib/payroll-math'
import {
  computeAllContributions,
  computeWeeklyWithholdingTax,
  computeThirteenthMonthTax,
  computeLumpSumTax,
} from '@/lib/contribution-tables'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Zap, Download } from 'lucide-react'
import PayslipView from './Payslip'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  review: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
}

const RUN_TYPE_LABELS: Record<string, string> = {
  regular: 'Regular',
  '13th_month': '13th Month',
  bonus: 'Bonus',
  adjustment: 'Adjustment',
}

const RUN_TYPE_BADGE: Record<string, string> = {
  regular: 'bg-brand-blue-50 text-brand-blue-700',
  '13th_month': 'bg-purple-50 text-purple-700',
  bonus: 'bg-emerald-50 text-emerald-700',
  adjustment: 'bg-amber-50 text-amber-700',
}

export default function PayrollRunCard({
  run,
  employees,
  orgId,
  orgRates,
}: {
  run: PayrollRun & { stations: { name: string } | null }
  employees: Pick<Employee, 'id' | 'full_name' | 'daily_rate' | 'has_sil' | 'coop_saving_amount' | 'station_id' | 'regular_hours_per_day'>[]
  orgId: string
  orgRates: OrgRates
}) {
  const [expanded, setExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [payslips, setPayslips] = useState<(Payslip & { employees: { full_name: string } })[]>([])
  const [loaded, setLoaded] = useState(false)
  const [offCycleDrafts, setOffCycleDrafts] = useState<Record<string, { amount: string; reason: string }>>({})
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [slipFor, setSlipFor] = useState<(Payslip & { employees: { full_name: string } }) | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const empById = Object.fromEntries(employees.map(e => [e.id, e]))

  const runType = run.run_type ?? 'regular'

  async function loadPayslips() {
    const { data } = await supabase
      .from('payslips')
      .select('*, employees(full_name)')
      .eq('payroll_run_id', run.id)
      .order('created_at')
    setPayslips((data ?? []) as any)
    setLoaded(true)
  }

  async function handleExpand() {
    setExpanded(v => !v)
    if (!loaded) await loadPayslips()
  }

  async function upsertPayslip(emp: { id: string; coop_saving_amount: number }, fields: {
    basicPay: number
    holidayPay: number
    overtimePay: number
    nsdPay: number
    lateUndertime: number
    allowances: number
    addBackReason: string | null
    totalEarnings: number
    sssEmployee: number
    philhealthEmployee: number
    hdmfEmployee: number
    withholdingTax: number
    coopSaving: number
  }) {
    const totalDeductions =
      fields.sssEmployee + fields.philhealthEmployee + fields.hdmfEmployee + fields.withholdingTax + fields.coopSaving
    const netPay = fields.totalEarnings - totalDeductions

    const { error } = await supabase.from('payslips').upsert({
      org_id: orgId,
      payroll_run_id: run.id,
      employee_id: emp.id,
      basic_pay: Math.round(fields.basicPay * 100) / 100,
      holiday_pay: Math.round(fields.holidayPay * 100) / 100,
      sil_pay: 0,
      overtime_pay: Math.round(fields.overtimePay * 100) / 100,
      late_undertime_deduction: Math.round(fields.lateUndertime * 100) / 100,
      night_shift_diff: Math.round(fields.nsdPay * 100) / 100,
      allowances: Math.round(fields.allowances * 100) / 100,
      add_back: 0,
      add_back_reason: fields.addBackReason,
      total_earnings: Math.round(fields.totalEarnings * 100) / 100,
      sss_contribution: fields.sssEmployee,
      philhealth_contribution: fields.philhealthEmployee,
      hdmf_contribution: fields.hdmfEmployee,
      withholding_tax: Math.round(fields.withholdingTax * 100) / 100,
      uniform_deduction: 0,
      coop_saving: fields.coopSaving,
      gas_shortage: 0,
      sss_loan: 0,
      pagibig_loan: 0,
      total_deductions: Math.round(totalDeductions * 100) / 100,
      net_pay: Math.round(netPay * 100) / 100,
      variance_amount: 0,
    }, { onConflict: 'payroll_run_id,employee_id' })

    return error
  }

  async function generatePayslips() {
    setGenerating(true)
    setGenerateError(null)

    // Load DTR entries for this cutoff
    const { data: dtrData, error: dtrError } = await supabase
      .from('dtr_entries')
      .select('*')
      .eq('org_id', orgId)
      .gte('work_date', run.cutoff_start)
      .lte('work_date', run.cutoff_end)

    if (dtrError) {
      setGenerating(false)
      setGenerateError(dtrError.message)
      return
    }

    const dtrByEmployee: Record<string, DTREntry[]> = {}
    for (const d of dtrData ?? []) {
      if (!dtrByEmployee[d.employee_id]) dtrByEmployee[d.employee_id] = []
      dtrByEmployee[d.employee_id].push(d as DTREntry)
    }

    for (const emp of employees) {
      const entries = dtrByEmployee[emp.id] ?? []
      const dailyRate = emp.daily_rate

      const { basicPay, holidayPay, overtimePay, nsdPay, lateUndertimeDeduction: lateUndertime, totalEarnings } =
        summarizeCutoffEarnings(entries, dailyRate, orgRates, emp.regular_hours_per_day)

      // Monthly contributions (SSS/PhilHealth/Pag-IBIG) are deducted once per month.
      // Under weekly cutoffs (Thu–Wed), apply them on the FIRST cutoff of the month
      // i.e. the one whose start date falls within the first 7 days.
      const cutoffDay = new Date(run.cutoff_start).getDate()
      const isFirstCutoff = cutoffDay <= 7

      const contribs = computeAllContributions(basicPay + holidayPay, isFirstCutoff)

      // Statutory contributions are pre-tax; coop savings and other
      // deductions below are post-tax and don't reduce taxable income.
      const taxableIncome =
        totalEarnings - contribs.sss_employee - contribs.philhealth_employee - contribs.hdmf_employee
      const withholdingTax = computeWeeklyWithholdingTax(Math.max(0, taxableIncome))

      const upsertError = await upsertPayslip(emp, {
        basicPay, holidayPay, overtimePay, nsdPay, lateUndertime,
        allowances: 0,
        addBackReason: null,
        totalEarnings,
        sssEmployee: contribs.sss_employee,
        philhealthEmployee: contribs.philhealth_employee,
        hdmfEmployee: contribs.hdmf_employee,
        withholdingTax,
        coopSaving: emp.coop_saving_amount,
      })
      if (upsertError) {
        setGenerating(false)
        setGenerateError(`${emp.full_name}: ${upsertError.message}`)
        return
      }
    }

    await supabase.from('payroll_runs').update({ status: 'review' }).eq('id', run.id)

    setGenerating(false)
    await loadPayslips()
    router.refresh()
  }

  // 13th month pay = 1/12 of total *basic* salary earned during the covered
  // year, per DOLE rules — excludes OT, holiday premium, NSD, allowances.
  // Sourced from prior regular payslips' basic_pay within the run's date range.
  async function generateThirteenthMonth() {
    setGenerating(true)
    setGenerateError(null)

    const { data: yearRuns, error: yearRunsError } = await supabase
      .from('payroll_runs')
      .select('id')
      .eq('org_id', orgId)
      .eq('run_type', 'regular')
      .in('status', ['review', 'completed'])
      .gte('cutoff_start', run.cutoff_start)
      .lte('cutoff_end', run.cutoff_end)

    if (yearRunsError) {
      setGenerating(false)
      setGenerateError(yearRunsError.message)
      return
    }

    const runIds = (yearRuns ?? []).map(r => r.id)
    const basicPayByEmployee: Record<string, number> = {}

    if (runIds.length > 0) {
      const { data: yearPayslips, error: yearPayslipsError } = await supabase
        .from('payslips')
        .select('employee_id, basic_pay')
        .in('payroll_run_id', runIds)
      if (yearPayslipsError) {
        setGenerating(false)
        setGenerateError(yearPayslipsError.message)
        return
      }
      for (const p of yearPayslips ?? []) {
        basicPayByEmployee[p.employee_id] = (basicPayByEmployee[p.employee_id] ?? 0) + p.basic_pay
      }
    }

    for (const emp of employees) {
      const totalBasicForYear = basicPayByEmployee[emp.id] ?? 0
      const thirteenthMonthPay = totalBasicForYear / 12
      const withholdingTax = computeThirteenthMonthTax(thirteenthMonthPay)

      const upsertError = await upsertPayslip(emp, {
        basicPay: thirteenthMonthPay,
        holidayPay: 0, overtimePay: 0, nsdPay: 0, lateUndertime: 0,
        allowances: 0,
        addBackReason: null,
        totalEarnings: thirteenthMonthPay,
        // 13th month pay is excluded from SSS/PhilHealth/Pag-IBIG contribution basis.
        sssEmployee: 0, philhealthEmployee: 0, hdmfEmployee: 0,
        withholdingTax,
        coopSaving: 0,
      })
      if (upsertError) {
        setGenerating(false)
        setGenerateError(`${emp.full_name}: ${upsertError.message}`)
        return
      }
    }

    await supabase.from('payroll_runs').update({ status: 'review' }).eq('id', run.id)

    setGenerating(false)
    await loadPayslips()
    router.refresh()
  }

  function setOffCycleDraft(employeeId: string, patch: Partial<{ amount: string; reason: string }>) {
    const empty = { amount: '', reason: '' }
    setOffCycleDrafts(prev => ({ ...prev, [employeeId]: { ...empty, ...prev[employeeId], ...patch } }))
  }

  // One-off bonus/adjustment: manual amount + reason per employee, fully
  // taxable as lump-sum supplemental income, no statutory contributions.
  async function saveOffCycleAmounts() {
    setGenerating(true)
    setGenerateError(null)

    for (const emp of employees) {
      const draft = offCycleDrafts[emp.id]
      const amount = parseFloat(draft?.amount ?? '') || 0
      if (amount === 0) continue

      const withholdingTax = computeLumpSumTax(amount)

      const upsertError = await upsertPayslip(emp, {
        basicPay: 0, holidayPay: 0, overtimePay: 0, nsdPay: 0, lateUndertime: 0,
        allowances: amount,
        addBackReason: draft?.reason || null,
        totalEarnings: amount,
        sssEmployee: 0, philhealthEmployee: 0, hdmfEmployee: 0,
        withholdingTax,
        coopSaving: 0,
      })
      if (upsertError) {
        setGenerating(false)
        setGenerateError(`${emp.full_name}: ${upsertError.message}`)
        return
      }
    }

    await supabase.from('payroll_runs').update({ status: 'review' }).eq('id', run.id)

    setGenerating(false)
    await loadPayslips()
    router.refresh()
  }

  const totalNetPay = payslips.reduce((s, p) => s + p.net_pay, 0)

  // Export the payslip table to CSV (opens directly in Excel).
  function exportExcel() {
    const headers = [
      'Employee', 'Basic', 'Holiday', 'OT', 'NSD', 'Allowances', 'Earnings',
      'SSS', 'PhilHealth', 'HDMF', 'WTax', 'Coop', 'Deductions', 'Net Pay',
    ]
    const esc = (v: string | number) => {
      const s = String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const body = payslips.map(p => [
      (p as { employees?: { full_name: string } }).employees?.full_name ?? '',
      p.basic_pay, p.holiday_pay, p.overtime_pay, p.night_shift_diff, p.allowances,
      p.total_earnings, p.sss_contribution, p.philhealth_contribution, p.hdmf_contribution,
      p.withholding_tax, p.coop_saving, p.total_deductions, p.net_pay,
    ])
    const totalRow = ['TOTAL NET PAY', '', '', '', '', '', '', '', '', '', '', '', '', totalNetPay]
    const csv = [headers, ...body, totalRow].map(r => r.map(esc).join(',')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll_${run.cutoff_start}_to_${run.cutoff_end}${run.stations?.name ? '_' + run.stations.name.replace(/[^a-z0-9]+/gi, '') : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleExpand}
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[run.status]}`}>
            {run.status}
          </span>
          {runType !== 'regular' && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${RUN_TYPE_BADGE[runType]}`}>
              {RUN_TYPE_LABELS[runType]}
            </span>
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">
              {new Date(run.cutoff_start).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} –{' '}
              {new Date(run.cutoff_end).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            {run.stations?.name && (
              <div className="text-xs text-gray-400">{run.stations.name}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {loaded && payslips.length > 0 && (
            <div className="text-sm font-medium text-gray-900">
              ₱{totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2 })} net
            </div>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4">
          {run.status === 'draft' && runType === 'regular' && (
            <button
              onClick={generatePayslips}
              disabled={generating}
              className="flex items-center gap-2 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 mb-4"
            >
              <Zap className="w-4 h-4" />
              {generating ? 'Generating…' : 'Generate Payslips from DTR'}
            </button>
          )}

          {run.status === 'draft' && runType === '13th_month' && (
            <button
              onClick={generateThirteenthMonth}
              disabled={generating}
              className="flex items-center gap-2 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 mb-4"
            >
              <Zap className="w-4 h-4" />
              {generating ? 'Computing…' : 'Generate 13th Month Payslips'}
            </button>
          )}

          {run.status === 'draft' && (runType === 'bonus' || runType === 'adjustment') && (
            <div className="mb-4 space-y-3">
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                      <th className="text-left px-4 py-2 font-medium">Employee</th>
                      <th className="text-right px-4 py-2 font-medium">Amount (₱)</th>
                      <th className="text-left px-4 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {employees.map(emp => {
                      const draft = offCycleDrafts[emp.id] ?? { amount: '', reason: '' }
                      return (
                        <tr key={emp.id}>
                          <td className="px-4 py-2 font-medium text-gray-800">{emp.full_name}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={draft.amount}
                              onChange={e => setOffCycleDraft(emp.id, { amount: e.target.value })}
                              className="w-28 border border-gray-200 rounded px-2 py-1 text-sm text-right text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              value={draft.reason}
                              onChange={e => setOffCycleDraft(emp.id, { reason: e.target.value })}
                              placeholder={runType === 'bonus' ? 'e.g. performance bonus' : 'e.g. salary correction'}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <button
                onClick={saveOffCycleAmounts}
                disabled={generating}
                className="flex items-center gap-2 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                {generating ? 'Saving…' : 'Save Payslips'}
              </button>
            </div>
          )}

          {generateError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
              {generateError}
            </p>
          )}

          {payslips.length === 0 && !generating && (
            <div className="text-sm text-gray-400 py-4">No payslips yet.</div>
          )}

          {payslips.length > 0 && (
            <div className="flex justify-end mb-3">
              <button
                onClick={exportExcel}
                className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            </div>
          )}

          {payslips.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left py-2 font-medium">Employee</th>
                    <th className="text-right py-2 font-medium">Basic</th>
                    <th className="text-right py-2 font-medium">Holiday</th>
                    <th className="text-right py-2 font-medium">OT</th>
                    <th className="text-right py-2 font-medium">NSD</th>
                    <th className="text-right py-2 font-medium">Allowances</th>
                    <th className="text-right py-2 font-medium">Earnings</th>
                    <th className="text-right py-2 font-medium">SSS</th>
                    <th className="text-right py-2 font-medium">PhilHealth</th>
                    <th className="text-right py-2 font-medium">HDMF</th>
                    <th className="text-right py-2 font-medium">WTax</th>
                    <th className="text-right py-2 font-medium">Coop</th>
                    <th className="text-right py-2 font-medium">Deductions</th>
                    <th className="text-right py-2 font-medium text-green-700">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payslips.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-800">
                        {(p as any).employees?.full_name}
                        <button onClick={() => setSlipFor(p)} className="ml-2 text-xs text-red-600 hover:underline no-print">Slip</button>
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.basic_pay.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.holiday_pay.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.overtime_pay.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.night_shift_diff.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.allowances.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-medium text-gray-800">₱{p.total_earnings.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-500 text-xs">₱{p.sss_contribution.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-500 text-xs">₱{p.philhealth_contribution.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-500 text-xs">₱{p.hdmf_contribution.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-500 text-xs">₱{p.withholding_tax.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-500 text-xs">₱{p.coop_saving.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-red-600">-₱{p.total_deductions.toLocaleString()}</td>
                      <td className="py-2.5 pl-2 text-right tabular-nums font-semibold text-green-700">₱{p.net_pay.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                    <td className="py-2.5 pr-4 text-gray-700" colSpan={13}>Total net pay</td>
                    <td className="py-2.5 pl-2 text-right tabular-nums text-green-700">
                      ₱{totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {slipFor && (
        <PayslipView
          slip={slipFor as any}
          fullName={slipFor.employees?.full_name ?? ''}
          dailyRate={empById[slipFor.employee_id]?.daily_rate ?? 0}
          employeeNo={null}
          cutoffStart={run.cutoff_start}
          cutoffEnd={run.cutoff_end}
          onClose={() => setSlipFor(null)}
        />
      )}
    </div>
  )
}
