# Staffverified — Dev Master Plan (Phase 2: HR & Payroll)

Working plan for closing the gap between the current codebase and the
[KOS Phase 2 HR/Payroll checklist](#appendix-full-checklist) needed to be
competitive with modern SMB HR/payroll platforms and Gusto Cofounder.

Status legend: ✅ built · 🟡 partial/buggy · ⬜ not started

## Known bugs (fix before anything else)

- **Employee add/edit is likely broken in production.** `EmployeeRow.tsx`
  and `NewEmployeeButton.tsx` save `employment_type`, `sss_no`,
  `philhealth_no`, `pagibig_no`, `tin_no` to the `employees` table, but no
  migration in the repo ever added those columns. Unless the live Supabase
  schema was hand-patched outside of git, every employee save fails
  silently (the Supabase error isn't checked). **Fix: migration + type
  update.**

## Tier 1 — must-have for launch

| Area | Status | Notes |
|---|---|---|
| Employee records | 🟡 | CRUD UI exists; save is broken (see bug above). Missing bank details field. |
| Time/attendance | ✅ | DTR + daily attendance (TL view) both work; regular/OT/NSD/holiday computed correctly; late/undertime now wired to `schedules` table (needs a schedule-entry UI to actually populate — see Tier 2). |
| Leave / PTO | ⬜ | `has_sil` is just a boolean flag on the employee record. No request/approve flow, no balance tracking, nothing syncs into payroll. |
| Payroll calculations | ✅ | Gross computation (basic, OT, NSD, holiday pay) shared between DTR preview and payslip generation via `summarizeCutoffEarnings()`. |
| PH statutory contributions | 🟡 | SSS, PhilHealth, Pag-IBIG implemented with real 2025 bracket tables (`contribution-tables.ts`). **BIR withholding tax is completely missing** — net pay is not real net pay yet. |
| Payslips | 🟡 | Generated with full earnings/deductions breakdown; incomplete until BIR tax is added. SIL pay always 0 (stubbed). |
| Owner cockpit payroll views | 🟡 | Single-org dashboard exists; no cross-venture rollup because the app is single-tenant-per-org today — "multi-venture owner" concept isn't modeled at the data layer yet. |

## Tier 2 — near-term enhancements

| Area | Status | Notes |
|---|---|---|
| Self-service portal | ⬜ | No employee-facing role exists at all — current roles are all internal staff (ceo/cfo/ops_officer/owner/assistant/tl). |
| Schedule entry UI | ⬜ | `schedules` table exists and is now read by DTR for late/undertime, but nothing lets anyone create a schedule row yet. |
| Industry-specific intake | ⬜ | No department/intake data model exists yet. |
| Attachments/comments on intake | ⬜ | Depends on intake existing first. |
| Feedback loop | ✅ | Report Issue widget supports file/image attachments; admin inbox shows them via signed URLs. |

## Tier 3 — competitive edge

| Area | Status | Notes |
|---|---|---|
| Agentic workflows / alerts | ⬜ | Not started. |
| Vertical ops module integration | ⬜ | Not started — no Gas/hotel/F&B ops modules exist in this repo yet. |
| Multi-market compliance | ⬜ | PH-only currently. |

## Immediate priority order

1. **Fix employee save** — migration for `employment_type`, `sss_no`,
   `philhealth_no`, `pagibig_no`, `tin_no` on `employees`; sync the
   `Employee` TypeScript type.
2. **BIR withholding tax** — add a tax-table function alongside
   `contribution-tables.ts`; add `withholding_tax` column to `payslips`;
   wire into `PayrollRunCard` net pay.
3. **Leave/PTO module** — request/approve flow + balance tracking,
   synced into payroll runs.
4. **Schedule entry UI** — so late/undertime tracking (already wired) has
   real data to compare against.
5. Self-service portal, industry intake, agentic workflows — deferred
   until Tier 1 is solid.

---

## Appendix: full checklist (as given)

### 1. Core HRIS / employee records
- Central employee database across ventures and departments.
- Fields for: personal details, contact info, role/title, department,
  location, employment type (regular/contract/seasonal), start/end dates.
- Compensation: base salary/hourly rate, allowances, benefits, variable pay.
- IDs and tax details: TIN, government IDs, bank details.
- Status tracking: active/inactive, probation, separation reasons.

### 2. Time, attendance, and leave
- Capture time/attendance independently of POS (clock-ins, shifts, schedules).
- Support overtime, night differential, and basic shift rules.
- Leave/PTO module: request, approve, track balances (vacation, sick, special leaves).
- Sync approved time and leave into payroll runs automatically.

### 3. Payroll processing engine
- Gross-to-net calculation: basic, overtime, allowances, deductions, bonuses.
- Multiple pay schedules per venture (weekly, bi-monthly, monthly).
- Support for different worker types (salary vs hourly vs contractor).
- Off-cycle payroll runs (13th month, adjustments, one-off bonuses).
- Payslip generation with clear breakdowns.

### 4. Local compliance – Philippines (initial focus)
- Automatic computation for SSS, PhilHealth, Pag-IBIG, BIR withholding tax.
- Compliant payslips (required fields and formats).
- Generation/export of key BIR-related reports and forms (employee
  certificates, alphalists, monthly/quarterly summaries).
- Export compliance data (CSV/JSON) for filing or integration.

### 5. Self-service and employee experience
- Employee portal (web/mobile): payslips, tax/contribution breakdowns,
  leave balances/requests, profile updates.
- Notifications for payroll release, leave approvals, schedule changes.

### 6. Owner cockpit integration
- Cross-venture payroll views: cost per venture/department/period.
- Headcount and staff mix metrics.
- Compliance status indicators: upcoming deadlines, late submissions,
  missing IDs.
- Filters by venture, department, location, role.

### 7. Department and industry structure
- General departments (Admin, Accounting, Marketing, Operations,
  Engineering/Repair, HR & Payroll) with owners and members.
- Industry-specific departments generated from intake templates (gas
  stations, hotels, coffee/restaurants, repair shops, carwash/detailing,
  service businesses).
- Assign payroll/HR responsibilities per department.

### 8. Industry-specific intake for HR/payroll
- Intake forms per industry/department: staff mix, shift patterns,
  tip/service-charge handling, occupancy-driven staffing, special
  allowances/hazard pay.
- Extra entries where needed; comments/remarks, approvals, attachments.

### 9. AI and automation ("Staffverified as teammate")
- Prepare payroll runs from time/attendance.
- Flag anomalies (missing entries, cost spikes, unusual deductions).
- Remind owners/HR of upcoming cutoffs and filings.
- Simple text-like interface inside KOS cockpit for payroll actions,
  summaries, and HR/payroll Q&A.

### 10. Integrations and exports
- Basic accounting export (journal entries) per venture.
- Optional integration paths to POS/time systems, not required.
- Structured export formats (CSV/JSON) for payroll, HR, compliance data.

### Priority tiers (source)
**Tier 1 – must-have for launch:** employee records, time/attendance and
leave, payroll calculations, PH statutory contributions and payslips,
owner cockpit payroll views.

**Tier 2 – near-term enhancements:** self-service portal, industry-specific
intake for HR/payroll per department, attachments and comments for intake.

**Tier 3 – competitive edge:** agentic workflows and alerts, deeper
integrations with vertical ops modules, additional markets beyond PH.
