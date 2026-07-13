# Payslip (Salary Slip) — exact format + email delivery

Requirement (Best, July 2026): generate a per-employee **Salary Slip** in the exact J&J format below, and **email it to each employee every payday** (to their own email address).

## Header
- Helium logo (top-left) — NOTE: app is generic now, but the payslip letterhead uses the Helium/He mark. Use a config/asset for the entity letterhead.
- **J&J Trading OPC**
- **TANDOC SAN CARLOS CITY PANGASINAN**
- **Salary Slip**

## Info block (2 columns)
Left: Employee Name `[full_name]` · Employee ID `[employee number]` · Employee Classification: `[Non-Confidential]`
Right: Payroll date `[e.g. JULY 2-8, 2026]` (the cutoff range) · Rate `[daily_rate e.g. 505.00]` · Days `[days worked e.g. 5.0]`

## Earnings (left column)  |  Deductions (right column)
Earnings:
- Basic Pay `[basic_pay]`
- Holiday `[holiday_pay]`
- SIL `[sil_pay]`
- Overtime `[overtime_pay]`
- Late/Undertime `[late_undertime_deduction]`
- NS Differential `[night_shift_diff]`
- Add Back `[add_back]`
- Allowances `[allowances]`
- **Total Earnings `[total_earnings]`**

Deductions:
- SSS `[sss_contribution]`
- PH `[philhealth_contribution]`
- HDMF `[hdmf_contribution]`
- Uniform `[uniform_deduction]`
- Coop Saving `[coop_saving]`
- Coop Loan `[?]`  (add field if needed)
- Gas Shortage `[gas_shortage]`
- SSS Loan/Pagibig `[sss_loan + pagibig_loan]`
- **Total Deduction `[total_deductions]`**

## Totals
- **Net Pay** `[net_pay]` (black highlight bar)
- **Gross Pay** `[total_earnings]`

## Footer (verbatim)
- "This document is STRICTLY CONFIDENTIAL."
- Tagalog message (verbatim): "Salamat sa inyong serbisyo at pakikipagdamayan. Ayon na din sa balita at inyong kaalaman, lahat ng business sa Pilipinas ay apektado ng pandemya dulot ng COVID-19 maging ang ating kompanya habang ang iba naman ay nagsasara. Bagaman bumaba ang ating sales dahil sa pandemya, kami ay nagpapasalamat at nanatili kayo sa inyong tungkulin na tumatanggap ng sahod na nakasaad sa payslip na ito, ng linguhan."
- "This is computer-generated payroll, no signature required"

## Data mapping — mostly EXISTS in `payslips` table
All earnings/deductions fields already computed and stored per payslip. Still needed:
- **Rate** = employees.daily_rate. **Days** = count of DTR days worked in the cutoff (derive from dtr_entries). **Employee ID / number** = need an employee_number field (not stored yet). **Classification** = "Non-Confidential" (add field or constant).

## PREREQUISITES for email delivery (BLOCKERS)
1. **Employee email address** — NOT stored yet. Add `email` column to `employees` and collect each employee's email.
2. **Resend API key** — email provider not configured yet (per project status: Resend/PayMongo/CRON_SECRET pending). Need RESEND_API_KEY set to send.
3. Trigger: on payday (Friday) or a "Send Payslips" button on the completed payroll run → renders each payslip (HTML/PDF) and emails to employee.

## Build approach
1. Payslip template component (HTML, print-to-PDF), exact layout above, per payslip row.
2. "View / Print payslip" per employee (works now, no email needed).
3. "Email all payslips" — server route using Resend, sends the payslip to each employee's email. Needs prereqs 1 & 2.
Belongs to roadmap Step 3 (payslip PDF/export). Build on PC.
