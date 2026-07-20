'use client'

import { X, Printer } from 'lucide-react'

type PayslipData = {
  employee_id: string
  basic_pay: number
  holiday_pay: number
  sil_pay: number
  overtime_pay: number
  late_undertime_deduction: number
  night_shift_diff: number
  add_back: number
  allowances: number
  total_earnings: number
  sss_contribution: number
  philhealth_contribution: number
  hdmf_contribution: number
  uniform_deduction: number
  coop_saving: number
  coop_loan?: number
  gas_shortage: number
  sss_loan: number
  pagibig_loan: number
  salary_adjustment?: number
  bonus?: number
  thirteenth_month_pay?: number
  total_deductions: number
  net_pay: number
  employees?: { full_name: string }
}

const peso = (n: number) => (n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// "JULY 2-8, 2026" (or cross-month "JULY 30-AUGUST 5, 2026")
function payrollDate(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const M = (d: Date) => d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase()
  if (s.getMonth() === e.getMonth()) return `${M(s)} ${s.getDate()}-${e.getDate()}, ${e.getFullYear()}`
  return `${M(s)} ${s.getDate()}-${M(e)} ${e.getDate()}, ${e.getFullYear()}`
}

export default function Payslip({
  slip,
  fullName,
  dailyRate,
  employeeNo,
  cutoffStart,
  cutoffEnd,
  onClose,
}: {
  slip: PayslipData
  fullName: string
  dailyRate: number
  employeeNo?: string | null
  cutoffStart: string
  cutoffEnd: string
  onClose: () => void
}) {
  const days = dailyRate > 0 ? (slip.basic_pay / dailyRate) : 0

  const Row = ({ label, value, red = false, bold = false }: { label: string; value: number; red?: boolean; bold?: boolean }) => (
    <div className="flex justify-between border-t border-black px-2 py-[3px]">
      <span className={bold ? 'font-bold' : ''}>{label}</span>
      <span className={`tabular-nums ${red && value > 0 ? 'text-red-600' : ''} ${bold ? 'font-bold' : ''}`}>{peso(value)}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-auto">
      <div className="bg-white w-full max-w-2xl">
        {/* toolbar (hidden on print) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 no-print">
          <span className="text-sm font-semibold text-gray-700">Salary Slip — {fullName}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* printable slip */}
        <div id="payslip-print" className="p-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '13px', color: '#000' }}>
          <div className="border border-black">
            {/* Header */}
            <div className="flex items-stretch border-b border-black">
              <div className="w-16 flex items-center justify-center border-r border-black py-2">
                <div className="text-center leading-none">
                  <div className="inline-block rounded-full" style={{ background: 'radial-gradient(circle at 30% 30%, #E2231A, #b91c1c)', width: 28, height: 28 }} />
                  <div className="text-[9px] font-bold mt-0.5">HELIUM</div>
                </div>
              </div>
              <div className="flex-1 text-center py-2">
                <div className="font-bold">J&amp;J Trading OPC</div>
                <div className="font-bold text-[12px]">TANDOC SAN CARLOS CITY PANGASINAN</div>
                <div>Salary Slip</div>
              </div>
            </div>

            {/* Info block */}
            <div className="grid grid-cols-2 text-[12px]">
              <div className="border-r border-black">
                <div className="px-2 py-[3px] border-b border-black">Employee Name: <span className="underline font-semibold">{fullName}</span></div>
                <div className="px-2 py-[3px] border-b border-black">Employee ID: {employeeNo ?? ''}</div>
                <div className="px-2 py-[3px]">Employee Classification: Non-Confidential</div>
              </div>
              <div>
                <div className="flex justify-between px-2 py-[3px] border-b border-black"><span>Payroll date</span><span className="font-semibold">{payrollDate(cutoffStart, cutoffEnd)}</span></div>
                <div className="flex justify-between px-2 py-[3px] border-b border-black"><span>Rate:</span><span className="tabular-nums">{peso(dailyRate)}</span></div>
                <div className="flex justify-between px-2 py-[3px]"><span>Days:</span><span className="tabular-nums">{days.toFixed(1)}</span></div>
              </div>
            </div>

            {/* Earnings | Deductions */}
            <div className="grid grid-cols-2 border-t border-black">
              <div className="border-r border-black">
                <div className="px-2 py-[3px] font-bold">Earnings</div>
                <Row label="Basic Pay" value={slip.basic_pay} />
                <Row label="Holiday" value={slip.holiday_pay} />
                <Row label="SIL" value={slip.sil_pay} />
                <Row label="Overtime" value={slip.overtime_pay} />
                <Row label="Late/Undertime" value={slip.late_undertime_deduction} />
                <Row label="NS Differential" value={slip.night_shift_diff} />
                <Row label="Add Back" value={slip.add_back} />
                <Row label="Allowances" value={slip.allowances} />
                <Row label="Total Earnings" value={slip.total_earnings} bold />
              </div>
              <div>
                <div className="px-2 py-[3px] font-bold">Deductions</div>
                <Row label="SSS" value={slip.sss_contribution} />
                <Row label="SSS Loan" value={slip.sss_loan} red />
                <Row label="PhilHealth" value={slip.philhealth_contribution} />
                <Row label="Pag-IBIG" value={slip.hdmf_contribution} />
                <Row label="Pag-IBIG Loan" value={slip.pagibig_loan} red />
                <Row label="Coop Loan" value={slip.coop_loan ?? 0} />
                <Row label="Coop Savings" value={slip.coop_saving} />
                <Row label="Short" value={slip.gas_shortage} red />
                <Row label="Uniform" value={slip.uniform_deduction} />
                <Row label="Total Deduction" value={slip.total_deductions} bold />
              </div>
            </div>

            {/* Salary Adjustment / Bonus / 13th Month Pay — applied after
                deductions, not part of Gross Pay/Total Earnings above. */}
            <div className="border-t border-black">
              <div className="px-2 py-[3px] font-bold">Adjustments</div>
              <Row label="Salary Adjustment" value={slip.salary_adjustment ?? 0} />
              <Row label="Bonus" value={slip.bonus ?? 0} />
              <Row label="13th Month Pay" value={slip.thirteenth_month_pay ?? 0} />
            </div>

            {/* Net / Gross */}
            <div className="flex justify-between items-center border-t border-black bg-black text-white px-2 py-1">
              <span className="font-bold">Net Pay</span>
              <span className="font-bold tabular-nums">{peso(slip.net_pay)}</span>
            </div>
            <div className="flex justify-between border-t border-black px-2 py-[3px]">
              <span className="font-bold">Gross Pay</span>
              <span className="font-bold tabular-nums">{peso(slip.total_earnings)}</span>
            </div>

            {/* Footer */}
            <div className="border-t border-black text-center px-3 py-2 text-[12px]">This document is STRICTLY CONFIDENTIAL.</div>
            <div className="border-t border-black text-center px-4 py-2 text-[11px] leading-snug">
              Salamat sa inyong serbisyo at pakikipagdamayan. Ayon na din sa balita at inyong kaalaman, lahat ng business sa Pilipinas ay apektado ng pandemya dulot ng COVID-19 maging ang ating kompanya habang ang iba naman ay nagsasara. Bagaman bumaba ang ating sales dahil sa pandemya, kami ay nagpapasalamat at nanatili kayo sa inyong tungkulin na tumatanggap ng sahod na nakasaad sa payslip na ito, ng linguhan.
            </div>
            <div className="border-t border-black text-center px-3 py-1 text-[10px] italic">This is computer-generated payroll, no signature required</div>
          </div>
        </div>
      </div>

      <style>{`@media print {
        body * { visibility: hidden; }
        #payslip-print, #payslip-print * { visibility: visible; }
        #payslip-print { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
      }`}</style>
    </div>
  )
}
