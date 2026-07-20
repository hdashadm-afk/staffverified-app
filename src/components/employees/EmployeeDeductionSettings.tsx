'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Wallet, X, Check } from 'lucide-react'
import { DeductionType, EmployeeDeductionSetting } from '@/types/database'

type ItemState = { can_deduct: boolean; weekly_amount: string }

const GROUPS: { title: string; kind: 'deduction' | 'earning'; items: { type: DeductionType; label: string }[] }[] = [
  {
    title: 'Statutory Contributions',
    kind: 'deduction',
    items: [
      { type: 'sss', label: 'SSS' },
      { type: 'philhealth', label: 'PhilHealth' },
      { type: 'pagibig', label: 'Pag-IBIG' },
    ],
  },
  {
    title: 'Loans',
    kind: 'deduction',
    items: [
      { type: 'sss_loan', label: 'SSS Loan' },
      { type: 'pagibig_loan', label: 'Pag-IBIG Loan' },
      { type: 'coop_loan', label: 'Coop Loan' },
    ],
  },
  {
    title: 'Savings / Contributions',
    kind: 'deduction',
    items: [{ type: 'coop_savings', label: 'Coop Savings' }],
  },
  {
    title: 'Other Adjustments',
    kind: 'deduction',
    items: [
      { type: 'short', label: 'Short' },
      { type: 'salary_adjustment', label: 'Salary Adjustment' },
    ],
  },
  {
    title: 'Additional Earnings',
    kind: 'earning',
    items: [
      { type: 'bonus', label: 'Bonus' },
      { type: 'thirteenth_month_pay', label: '13th Month Pay' },
      { type: 'tl_allowance', label: 'TL Allowance' },
      { type: 'gas_allowance', label: 'Gas Allowance' },
      { type: 'other_allowance', label: 'Other Allowance' },
    ],
  },
]

const ALL_TYPES = GROUPS.flatMap(g => g.items.map(i => i.type))

function emptyState(): Record<DeductionType, ItemState> {
  return Object.fromEntries(ALL_TYPES.map(t => [t, { can_deduct: false, weekly_amount: '0' }])) as Record<DeductionType, ItemState>
}

export default function EmployeeDeductionSettings({
  employeeId,
  orgId,
  fullName,
}: {
  employeeId: string
  orgId: string
  fullName: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Record<DeductionType, ItemState>>(emptyState())
  const router = useRouter()
  const supabase = createClient()

  async function handleOpen() {
    setError(null)
    setOpen(true)
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('employee_deduction_settings')
      .select('*')
      .eq('employee_id', employeeId)
    setLoading(false)

    if (loadError) {
      setError(loadError.message)
      return
    }

    const next = emptyState()
    for (const row of (data ?? []) as EmployeeDeductionSetting[]) {
      next[row.deduction_type] = {
        can_deduct: row.can_deduct,
        weekly_amount: row.weekly_amount.toString(),
      }
    }
    setItems(next)
  }

  function patch(type: DeductionType, p: Partial<ItemState>) {
    setItems(prev => ({ ...prev, [type]: { ...prev[type], ...p } }))
  }

  async function save() {
    setSaving(true)
    setError(null)

    const rows = ALL_TYPES.map(type => ({
      org_id: orgId,
      employee_id: employeeId,
      deduction_type: type,
      can_deduct: items[type].can_deduct,
      weekly_amount: parseFloat(items[type].weekly_amount) || 0,
    }))

    const { error: saveError } = await supabase
      .from('employee_deduction_settings')
      .upsert(rows, { onConflict: 'employee_id,deduction_type' })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-gray-400 hover:text-gray-700 transition-colors"
        title="Weekly Payroll Deductions & Adjustments"
      >
        <Wallet className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Weekly Payroll Deductions &amp; Adjustments</h2>
                <p className="text-xs text-gray-500 mt-0.5">{fullName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {loading ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : (
                GROUPS.map(group => (
                  <div key={group.title}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group.title}</h3>
                    <div className="space-y-3">
                      {group.items.map(({ type, label }) => {
                        const state = items[type]
                        const onLabel = group.kind === 'earning' ? 'Included' : 'Can Deduct'
                        const offLabel = group.kind === 'earning' ? 'Not Included' : 'Do Not Deduct'
                        return (
                          <div key={type} className="border border-gray-100 rounded-lg px-3 py-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-800">{label}</span>
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <span className={`text-xs font-medium ${state.can_deduct ? 'text-green-700' : 'text-gray-400'}`}>
                                  {state.can_deduct ? onLabel : offLabel}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={state.can_deduct}
                                  onChange={e => patch(type, { can_deduct: e.target.checked })}
                                  className="rounded"
                                />
                              </label>
                            </div>
                            <div className="mt-2">
                              <label className="block text-[11px] font-medium text-gray-500 mb-1">Weekly Amount (₱)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={state.weekly_amount}
                                onChange={e => patch(type, { weekly_amount: e.target.value })}
                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue-600"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg py-2.5 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || loading}
                className="flex-1 inline-flex items-center justify-center gap-1 bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
