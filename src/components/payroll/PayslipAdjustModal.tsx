'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Payslip } from '@/types/database'
import { X, Check } from 'lucide-react'

type Slip = Payslip & { employees?: { full_name: string } }

const FIELDS: { key: keyof Pick<Payslip,
  'sss_contribution' | 'sss_loan' | 'philhealth_contribution' | 'hdmf_contribution' | 'pagibig_loan' |
  'coop_loan' | 'coop_saving' | 'gas_shortage' | 'salary_adjustment' | 'bonus' | 'thirteenth_month_pay'
>; label: string }[] = [
  { key: 'sss_contribution', label: 'SSS' },
  { key: 'sss_loan', label: 'SSS Loan' },
  { key: 'philhealth_contribution', label: 'PhilHealth' },
  { key: 'hdmf_contribution', label: 'Pag-IBIG' },
  { key: 'pagibig_loan', label: 'Pag-IBIG Loan' },
  { key: 'coop_loan', label: 'Coop Loan' },
  { key: 'coop_saving', label: 'Coop Savings' },
  { key: 'gas_shortage', label: 'Short' },
  { key: 'salary_adjustment', label: 'Salary Adjustment (+/-)' },
  { key: 'bonus', label: 'Bonus' },
  { key: 'thirteenth_month_pay', label: '13th Month Pay' },
]

// Deductions: everything except the "additive" items (salary_adjustment can go
// either way but is applied post-deduction, same as bonus/13th month, per the
// weekly payroll calculation: Gross − deductions +/− Salary Adjustment +
// Bonus + 13th Month Pay = Net Pay.
const DEDUCTION_KEYS = ['sss_contribution', 'sss_loan', 'philhealth_contribution', 'hdmf_contribution', 'pagibig_loan', 'coop_loan', 'coop_saving', 'gas_shortage'] as const

export default function PayslipAdjustModal({
  slip,
  onClose,
  onSaved,
}: {
  slip: Slip
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map(f => [f.key, (slip[f.key] as number).toString()]))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  function num(key: string): number {
    return parseFloat(form[key]) || 0
  }

  async function save() {
    setSaving(true)
    setError(null)

    const deductionsSum = DEDUCTION_KEYS.reduce((s, k) => s + num(k), 0)
    const totalDeductions = deductionsSum + slip.uniform_deduction + slip.withholding_tax
    const netPay = slip.total_earnings - totalDeductions + num('salary_adjustment') + num('bonus') + num('thirteenth_month_pay')

    const { error: updateError } = await supabase
      .from('payslips')
      .update({
        sss_contribution: num('sss_contribution'),
        sss_loan: num('sss_loan'),
        philhealth_contribution: num('philhealth_contribution'),
        hdmf_contribution: num('hdmf_contribution'),
        pagibig_loan: num('pagibig_loan'),
        coop_loan: num('coop_loan'),
        coop_saving: num('coop_saving'),
        gas_shortage: num('gas_shortage'),
        salary_adjustment: num('salary_adjustment'),
        bonus: num('bonus'),
        thirteenth_month_pay: num('thirteenth_month_pay'),
        total_deductions: Math.round(totalDeductions * 100) / 100,
        net_pay: Math.round(netPay * 100) / 100,
      })
      .eq('id', slip.id)

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Adjust This Payslip</h2>
            <p className="text-xs text-gray-500 mt-0.5">{slip.employees?.full_name} — this period only, doesn&apos;t change employee defaults</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-3">
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">{label} (₱)</label>
              <input
                type="number"
                step="0.01"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mx-6 mb-3">{error}</p>
        )}

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg py-2.5 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-1 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
