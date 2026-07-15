'use client'

import { Fragment, useState } from 'react'
import { PayrollRun, Employee, Payslip, DTREntry } from '@/types/database'
import { OrgRates, computeOvertimePay, computeNSD, computeHolidayPay, computeLateUndertimeDeduction } from '@/lib/payroll-math'
import { computeAllContributions } from '@/lib/contribution-tables'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Zap, Pencil, Check, X } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  review: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
}

export default function PayrollRunCard({
  run,
  employees,
  orgId,
  orgRates,
}: {
  run: PayrollRun & { stations: { name: string } | null }
  employees: Pick<Employee, 'id' | 'full_name' | 'daily_rate' | 'has_sil' | 'coop_saving_amount' | 'station_id' | 'allowance'>[]
  orgId: string
  orgRates: OrgRates
}) {
  const [expanded, setExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [payslips, setPayslips] = useState<(Payslip & { employees: { full_name: string } })[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editingPayslipId, setEditingPayslipId] = useState<string | null>(null)
  const [savingAdjustments, setSavingAdjustments] = useState(false)
  const [adjForm, setAdjForm] = useState({
    bonus: '0',
    thirteenth_month_pay: '0',
    salary_adjustment: '0',
    salary_adjustment_reason: '',
    sss_loan: '0',
    pagibig_loan: '0',
    gas_shortage: '0',
    gas_shortage_note: '',
    uniform_deduction: '0',
    withholding_tax: '0',
  })
  const router = useRouter()
  const supabase = createClient()

  function startAdjust(p: Payslip) {
    setAdjForm({
      bonus: p.bonus.toString(),
      thirteenth_month_pay: p.thirteenth_month_pay.toString(),
      salary_adjustment: p.salary_adjustment.toString(),
      salary_adjustment_reason: p.salary_adjustment_reason ?? '',
      sss_loan: p.sss_loan.toString(),
      pagibig_loan: p.pagibig_loan.toString(),
      gas_shortage: p.gas_shortage.toString(),
      gas_shortage_note: p.gas_shortage_note ?? '',
      uniform_deduction: p.uniform_deduction.toString(),
      withholding_tax: p.withholding_tax.toString(),
    })
    setEditingPayslipId(p.id)
  }

  async function saveAdjustments(p: Payslip) {
    setSavingAdjustments(true)
    const bonus = parseFloat(adjForm.bonus) || 0
    const thirteenthMonth = parseFloat(adjForm.thirteenth_month_pay) || 0
    const salaryAdjustment = parseFloat(adjForm.salary_adjustment) || 0
    const sssLoan = parseFloat(adjForm.sss_loan) || 0
    const pagibigLoan = parseFloat(adjForm.pagibig_loan) || 0
    const gasShortage = parseFloat(adjForm.gas_shortage) || 0
    const uniformDeduction = parseFloat(adjForm.uniform_deduction) || 0
    const withholdingTax = parseFloat(adjForm.withholding_tax) || 0

    // Earnings side: basic/holiday/OT/NSD/allowances minus late-undertime are computed
    // from DTR and untouched here; bonus/13th month/adjustment are the manual add-ons.
    const totalEarnings =
      p.basic_pay + p.holiday_pay + p.overtime_pay + p.night_shift_diff + p.sil_pay +
      p.allowances + p.add_back - p.late_undertime_deduction +
      bonus + thirteenthMonth + salaryAdjustment

    const totalDeductions =
      p.sss_contribution + p.philhealth_contribution + p.hdmf_contribution + p.coop_saving +
      uniformDeduction + gasShortage + sssLoan + pagibigLoan + withholdingTax

    const netPay = totalEarnings - totalDeductions

    const updates = {
      bonus,
      thirteenth_month_pay: thirteenthMonth,
      salary_adjustment: salaryAdjustment,
      salary_adjustment_reason: adjForm.salary_adjustment_reason || null,
      sss_loan: sssLoan,
      pagibig_loan: pagibigLoan,
      gas_shortage: gasShortage,
      gas_shortage_note: adjForm.gas_shortage_note || null,
      uniform_deduction: uniformDeduction,
      withholding_tax: withholdingTax,
      total_earnings: Math.round(totalEarnings * 100) / 100,
      total_deductions: Math.round(totalDeductions * 100) / 100,
      net_pay: Math.round(netPay * 100) / 100,
    }

    await supabase.from('payslips').update(updates).eq('id', p.id)

    setPayslips(prev => prev.map(row => (row.id === p.id ? { ...row, ...updates } : row)))
    setSavingAdjustments(false)
    setEditingPayslipId(null)
    router.refresh()
  }

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

  async function generatePayslips() {
    setGenerating(true)

    // Load DTR entries for this cutoff
    const { data: dtrData } = await supabase
      .from('dtr_entries')
      .select('*')
      .eq('org_id', orgId)
      .gte('work_date', run.cutoff_start)
      .lte('work_date', run.cutoff_end)

    const dtrByEmployee: Record<string, DTREntry[]> = {}
    for (const d of dtrData ?? []) {
      if (!dtrByEmployee[d.employee_id]) dtrByEmployee[d.employee_id] = []
      dtrByEmployee[d.employee_id].push(d as DTREntry)
    }

    for (const emp of employees) {
      const entries = dtrByEmployee[emp.id] ?? []
      const dailyRate = emp.daily_rate
      const hourly = dailyRate / 8

      let basicPay = 0
      let holidayPay = 0
      let overtimePay = 0
      let nsdPay = 0
      let lateUndertime = 0

      for (const e of entries) {
        if (e.is_holiday_regular || e.is_holiday_special) {
          holidayPay += computeHolidayPay(dailyRate, e.is_holiday_regular, e.is_holiday_special, orgRates)
        } else {
          basicPay += hourly * e.regular_hours
        }
        overtimePay += computeOvertimePay(dailyRate, e.overtime_hours, orgRates)
        nsdPay += computeNSD(dailyRate, e.night_shift_hours, orgRates)
        lateUndertime += computeLateUndertimeDeduction(dailyRate, e.late_minutes, e.undertime_minutes)
      }

      const totalEarnings = basicPay + holidayPay + overtimePay + nsdPay - lateUndertime + emp.allowance

      // Monthly contributions (SSS/PhilHealth/Pag-IBIG) are deducted once per month.
      // Under weekly cutoffs (Thu–Wed), apply them on the FIRST cutoff of the month
      // i.e. the one whose start date falls within the first 7 days.
      const cutoffDay = new Date(run.cutoff_start).getDate()
      const isFirstCutoff = cutoffDay <= 7

      const contribs = computeAllContributions(basicPay + holidayPay, isFirstCutoff)

      const totalDeductions =
        contribs.sss_employee +
        contribs.philhealth_employee +
        contribs.hdmf_employee +
        emp.coop_saving_amount
      const netPay = totalEarnings - totalDeductions

      await supabase.from('payslips').upsert({
        org_id: orgId,
        payroll_run_id: run.id,
        employee_id: emp.id,
        basic_pay: Math.round(basicPay * 100) / 100,
        holiday_pay: Math.round(holidayPay * 100) / 100,
        sil_pay: 0,
        overtime_pay: Math.round(overtimePay * 100) / 100,
        late_undertime_deduction: Math.round(lateUndertime * 100) / 100,
        night_shift_diff: Math.round(nsdPay * 100) / 100,
        allowances: emp.allowance,
        add_back: 0,
        total_earnings: Math.round(totalEarnings * 100) / 100,
        sss_contribution: contribs.sss_employee,
        philhealth_contribution: contribs.philhealth_employee,
        hdmf_contribution: contribs.hdmf_employee,
        uniform_deduction: 0,
        coop_saving: emp.coop_saving_amount,
        gas_shortage: 0,
        sss_loan: 0,
        pagibig_loan: 0,
        withholding_tax: 0,
        bonus: 0,
        thirteenth_month_pay: 0,
        salary_adjustment: 0,
        total_deductions: Math.round(totalDeductions * 100) / 100,
        net_pay: Math.round(netPay * 100) / 100,
        variance_amount: 0,
      }, { onConflict: 'payroll_run_id,employee_id' })
    }

    await supabase.from('payroll_runs').update({ status: 'review' }).eq('id', run.id)

    setGenerating(false)
    await loadPayslips()
    router.refresh()
  }

  const totalNetPay = payslips.reduce((s, p) => s + p.net_pay, 0)

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
          {run.status === 'draft' && (
            <button
              onClick={generatePayslips}
              disabled={generating}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 mb-4"
            >
              <Zap className="w-4 h-4" />
              {generating ? 'Generating…' : 'Generate Payslips from DTR'}
            </button>
          )}

          {payslips.length === 0 && !generating && (
            <div className="text-sm text-gray-400 py-4">No payslips yet. Generate from DTR data above.</div>
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
                    <th className="text-right py-2 font-medium">Earnings</th>
                    <th className="text-right py-2 font-medium">SSS</th>
                    <th className="text-right py-2 font-medium">PhilHealth</th>
                    <th className="text-right py-2 font-medium">HDMF</th>
                    <th className="text-right py-2 font-medium">Coop</th>
                    <th className="text-right py-2 font-medium">Deductions</th>
                    <th className="text-right py-2 font-medium text-green-700">Net Pay</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payslips.map(p => (
                    <Fragment key={p.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-800">{(p as any).employees?.full_name}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.basic_pay.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.holiday_pay.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.overtime_pay.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.night_shift_diff.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-medium text-gray-800">₱{p.total_earnings.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-500 text-xs">₱{p.sss_contribution.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-500 text-xs">₱{p.philhealth_contribution.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-500 text-xs">₱{p.hdmf_contribution.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-500 text-xs">₱{p.coop_saving.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-red-600">-₱{p.total_deductions.toLocaleString()}</td>
                      <td className="py-2.5 pl-2 text-right tabular-nums font-semibold text-green-700">₱{p.net_pay.toLocaleString()}</td>
                      <td className="py-2.5 pl-2 text-right">
                        {editingPayslipId !== p.id && (
                          <button
                            onClick={() => startAdjust(p)}
                            title="Add bonus, 13th month, loans, shortage, adjustments"
                            className="text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {editingPayslipId === p.id && (
                      <tr className="bg-red-50/60">
                        <td colSpan={13} className="px-3 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-[11px] font-medium text-gray-500 mb-1">Bonus (₱)</label>
                              <input type="number" value={adjForm.bonus} onChange={e => setAdjForm(f => ({ ...f, bonus: e.target.value }))}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-gray-500 mb-1">13th month pay (₱)</label>
                              <input type="number" value={adjForm.thirteenth_month_pay} onChange={e => setAdjForm(f => ({ ...f, thirteenth_month_pay: e.target.value }))}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-gray-500 mb-1">Salary adjustment (₱, +/-)</label>
                              <input type="number" value={adjForm.salary_adjustment} onChange={e => setAdjForm(f => ({ ...f, salary_adjustment: e.target.value }))}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-gray-500 mb-1">Adjustment reason</label>
                              <input value={adjForm.salary_adjustment_reason} onChange={e => setAdjForm(f => ({ ...f, salary_adjustment_reason: e.target.value }))}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-500 mb-1">SSS loan (₱)</label>
                              <input type="number" value={adjForm.sss_loan} onChange={e => setAdjForm(f => ({ ...f, sss_loan: e.target.value }))}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-gray-500 mb-1">Pag-IBIG loan (₱)</label>
                              <input type="number" value={adjForm.pagibig_loan} onChange={e => setAdjForm(f => ({ ...f, pagibig_loan: e.target.value }))}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-gray-500 mb-1">Shortage (₱)</label>
                              <input type="number" value={adjForm.gas_shortage} onChange={e => setAdjForm(f => ({ ...f, gas_shortage: e.target.value }))}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-gray-500 mb-1">Shortage note</label>
                              <input value={adjForm.gas_shortage_note} onChange={e => setAdjForm(f => ({ ...f, gas_shortage_note: e.target.value }))}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>

                            <div>
                              <label className="block text-[11px] font-medium text-gray-500 mb-1">Uniform deduction (₱)</label>
                              <input type="number" value={adjForm.uniform_deduction} onChange={e => setAdjForm(f => ({ ...f, uniform_deduction: e.target.value }))}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-gray-500 mb-1">Withholding tax (₱)</label>
                              <input type="number" value={adjForm.withholding_tax} onChange={e => setAdjForm(f => ({ ...f, withholding_tax: e.target.value }))}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end mt-4">
                            <button onClick={() => setEditingPayslipId(null)} disabled={savingAdjustments}
                              className="flex items-center gap-1 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg px-4 py-2 hover:bg-gray-50 disabled:opacity-50">
                              <X className="w-4 h-4" /> Cancel
                            </button>
                            <button onClick={() => saveAdjustments(p)} disabled={savingAdjustments}
                              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50">
                              <Check className="w-4 h-4" /> {savingAdjustments ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                    <td className="py-2.5 pr-4 text-gray-700" colSpan={11}>Total net pay</td>
                    <td className="py-2.5 pl-2 text-right tabular-nums text-green-700">
                      ₱{totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
