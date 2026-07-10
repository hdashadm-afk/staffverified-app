'use client'

import { useState } from 'react'
import { PayrollRun, Employee, Payslip, DTREntry } from '@/types/database'
import { OrgRates, summarizeCutoffEarnings } from '@/lib/payroll-math'
import { computeAllContributions, computeWeeklyWithholdingTax } from '@/lib/contribution-tables'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Zap } from 'lucide-react'

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
  employees: Pick<Employee, 'id' | 'full_name' | 'daily_rate' | 'has_sil' | 'coop_saving_amount' | 'station_id'>[]
  orgId: string
  orgRates: OrgRates
}) {
  const [expanded, setExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [payslips, setPayslips] = useState<(Payslip & { employees: { full_name: string } })[]>([])
  const [loaded, setLoaded] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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

    // Approved, paid leave that overlaps this cutoff — pays out via the
    // existing sil_pay field (statutory SIL and any other company-paid
    // leave share one payslip line since there's no per-type ledger yet).
    const { data: leaveData } = await supabase
      .from('leave_requests')
      .select('employee_id, start_date, end_date, is_paid, status')
      .eq('org_id', orgId)
      .eq('status', 'approved')
      .eq('is_paid', true)
      .lte('start_date', run.cutoff_end)
      .gte('end_date', run.cutoff_start)

    const cutoffStartMs = new Date(run.cutoff_start).getTime()
    const cutoffEndMs = new Date(run.cutoff_end).getTime()
    const MS_PER_DAY = 24 * 60 * 60 * 1000
    const leaveDaysByEmployee: Record<string, number> = {}
    for (const l of leaveData ?? []) {
      const overlapStart = Math.max(new Date(l.start_date).getTime(), cutoffStartMs)
      const overlapEnd = Math.min(new Date(l.end_date).getTime(), cutoffEndMs)
      const overlapDays = Math.round((overlapEnd - overlapStart) / MS_PER_DAY) + 1
      if (overlapDays > 0) {
        leaveDaysByEmployee[l.employee_id] = (leaveDaysByEmployee[l.employee_id] ?? 0) + overlapDays
      }
    }

    for (const emp of employees) {
      const entries = dtrByEmployee[emp.id] ?? []
      const dailyRate = emp.daily_rate

      const { basicPay, holidayPay, overtimePay, nsdPay, lateUndertimeDeduction: lateUndertime, totalEarnings: earningsFromDTR } =
        summarizeCutoffEarnings(entries, dailyRate, orgRates)

      const leavePay = (leaveDaysByEmployee[emp.id] ?? 0) * dailyRate
      const totalEarnings = earningsFromDTR + leavePay

      // Monthly contributions (SSS/PhilHealth/Pag-IBIG) are deducted once per month.
      // Under weekly cutoffs (Thu–Wed), apply them on the FIRST cutoff of the month
      // i.e. the one whose start date falls within the first 7 days.
      const cutoffDay = new Date(run.cutoff_start).getDate()
      const isFirstCutoff = cutoffDay <= 7

      const contribs = computeAllContributions(basicPay + holidayPay + leavePay, isFirstCutoff)

      // Statutory contributions are pre-tax; coop savings and other
      // deductions below are post-tax and don't reduce taxable income.
      const taxableIncome =
        totalEarnings - contribs.sss_employee - contribs.philhealth_employee - contribs.hdmf_employee
      const withholdingTax = computeWeeklyWithholdingTax(Math.max(0, taxableIncome))

      const totalDeductions =
        contribs.sss_employee +
        contribs.philhealth_employee +
        contribs.hdmf_employee +
        withholdingTax +
        emp.coop_saving_amount
      const netPay = totalEarnings - totalDeductions

      await supabase.from('payslips').upsert({
        org_id: orgId,
        payroll_run_id: run.id,
        employee_id: emp.id,
        basic_pay: Math.round(basicPay * 100) / 100,
        holiday_pay: Math.round(holidayPay * 100) / 100,
        sil_pay: Math.round(leavePay * 100) / 100,
        overtime_pay: Math.round(overtimePay * 100) / 100,
        late_undertime_deduction: Math.round(lateUndertime * 100) / 100,
        night_shift_diff: Math.round(nsdPay * 100) / 100,
        allowances: 0,
        add_back: 0,
        total_earnings: Math.round(totalEarnings * 100) / 100,
        sss_contribution: contribs.sss_employee,
        philhealth_contribution: contribs.philhealth_employee,
        hdmf_contribution: contribs.hdmf_employee,
        withholding_tax: Math.round(withholdingTax * 100) / 100,
        uniform_deduction: 0,
        coop_saving: emp.coop_saving_amount,
        gas_shortage: 0,
        sss_loan: 0,
        pagibig_loan: 0,
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
                    <th className="text-right py-2 font-medium">Leave</th>
                    <th className="text-right py-2 font-medium">OT</th>
                    <th className="text-right py-2 font-medium">NSD</th>
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
                      <td className="py-2.5 pr-4 font-medium text-gray-800">{(p as any).employees?.full_name}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.basic_pay.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.holiday_pay.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.sil_pay.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.overtime_pay.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-gray-600">₱{p.night_shift_diff.toLocaleString()}</td>
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
    </div>
  )
}
