import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { canAccess } from '@/lib/access'
import { formatPayrollCutoff } from '@/lib/cutoff'
import { payslipGrossPay } from '@/lib/payroll-math'
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const peso = (n: number) =>
  (n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type PayslipRow = {
  net_pay: number
  total_deductions: number
  employees: { full_name: string; email: string | null; daily_rate: number } | null
} & Record<string, number | string | null>

function payslipEmailHtml(orgName: string, cutoffLabel: string, fullName: string, slip: PayslipRow): string {
  const gross = payslipGrossPay(slip as never)
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="margin-bottom: 4px;">${orgName} — Salary Slip</h2>
      <p style="color: #555; margin-top: 0;">Payroll date: ${cutoffLabel}</p>
      <p>Hi ${fullName},</p>
      <p>Your payslip for this cutoff:</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 4px 0;">Gross Pay</td><td style="text-align: right;">₱${peso(gross)}</td></tr>
        <tr><td style="padding: 4px 0;">Total Deductions</td><td style="text-align: right; color: #b91c1c;">-₱${peso(slip.total_deductions)}</td></tr>
        <tr style="border-top: 1px solid #333; font-weight: bold;">
          <td style="padding: 6px 0;">Net Pay</td><td style="text-align: right;">₱${peso(slip.net_pay)}</td>
        </tr>
      </table>
      <p style="color: #888; font-size: 12px; margin-top: 20px;">
        This document is strictly confidential. For a full breakdown, ask HR for your printed salary slip.
      </p>
    </div>
  `
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !canAccess('/payroll', profile.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { payrollRunId } = await req.json()
  if (!payrollRunId) {
    return NextResponse.json({ error: 'Missing payrollRunId' }, { status: 400 })
  }

  const { data: run, error: runError } = await supabase
    .from('payroll_runs')
    .select('id, org_id, cutoff_start, cutoff_end')
    .eq('id', payrollRunId)
    .single()

  if (runError || !run) {
    return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', run.org_id)
    .single()

  const { data: payslips, error: payslipsError } = await supabase
    .from('payslips')
    .select('*, employees(full_name, email, daily_rate)')
    .eq('payroll_run_id', payrollRunId)

  if (payslipsError) {
    return NextResponse.json({ error: payslipsError.message }, { status: 500 })
  }

  const gmailUser = process.env.GMAIL_USER
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
  if (!gmailUser || !gmailAppPassword) {
    return NextResponse.json(
      { error: 'Email is not configured yet — GMAIL_USER/GMAIL_APP_PASSWORD are not set.' },
      { status: 500 }
    )
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailAppPassword },
  })

  const cutoffLabel = formatPayrollCutoff(run.cutoff_start, run.cutoff_end)
  const orgName = org?.name ?? 'StaffVerified'

  const sent: string[] = []
  const skipped: string[] = []
  const failed: string[] = []

  for (const slip of (payslips ?? []) as PayslipRow[]) {
    const employee = slip.employees
    if (!employee?.full_name) continue
    if (!employee.email) {
      skipped.push(employee.full_name)
      continue
    }
    try {
      await transporter.sendMail({
        from: `"${orgName} HR" <${gmailUser}>`,
        to: employee.email,
        subject: `Payslip — ${cutoffLabel}`,
        html: payslipEmailHtml(orgName, cutoffLabel, employee.full_name, slip),
      })
      sent.push(employee.full_name)
    } catch {
      failed.push(employee.full_name)
    }
  }

  await supabase.from('payroll_runs').update({ status: 'completed' }).eq('id', payrollRunId)

  return NextResponse.json({ sent, skipped, failed })
}
