# Staffverified — Dev Master Plan (Phase 2: HR & Payroll)

Working plan for closing the gap between the current codebase and the
[KOS Phase 2 HR/Payroll checklist](#appendix-full-checklist) needed to be
competitive with modern SMB HR/payroll platforms and Gusto Cofounder.

## Where this fits in the KOS build sequence

Per the KOS architecture work (tracked separately in Notion — Founder Space
+ build sequence docs): StaffVerified is locked in as the **HR + Payroll
module under KOS**, step 2 in the build sequence. It keeps its own repo —
no rename, no merge into a KOS monorepo.

The other Ops Extension modules (Gas, Coffee, Hotel, Accounting, Marketing)
are being validated cheaply first via manual tools (Excel file reports,
logbooks) before any digital integration is built for them — an MVP
pattern where the Owner's Space accepts Excel reports from each
department's key person. **HR & Payroll skips that validation step
entirely, because StaffVerified is already real, active code** — not a
placeholder to prove out. That's the standard this repo needs to keep
holding itself to: every fix and feature here should already be
production-real, not throwaway validation.

Status legend: ✅ built · 🟡 partial/buggy · ⬜ not started

## Known bugs (fixed)

- ~~Employee add/edit broken in production~~ — **fixed.** Migration 009
  added `employment_type`, `sss_no`, `philhealth_no`, `pagibig_no`,
  `tin_no` to `employees`.
- ~~`feedback_reports` and `nte_records` tables didn't exist on the live
  database at all~~ — **fixed.** Migrations 006/007/008 applied; Report
  Issue submissions and NTE disciplinary notices were both silently
  failing before this, not just employee saves.
- ~~Attach-file button on the feedback widget silently failed to open the
  file picker on mobile in-app browsers~~ — **fixed.** Switched from a
  JS-triggered `ref.click()` to a native `<label htmlFor>`, which doesn't
  depend on JS to open the OS file picker. (PR #2, pending merge.)

## Tier 1 — must-have for launch

| Area | Status | Notes |
|---|---|---|
| Employee records | ✅ | CRUD UI + save working; gov IDs and bank details (name/account no./account name) both present. |
| Time/attendance | ✅ | DTR + daily attendance (TL view) both work; regular/OT/NSD/holiday computed correctly; DTR grid is now always-editable with one Save (no more per-row edit toggle that blocked rows past the first). Late/undertime wired to `schedules` table, and a `/schedule` page now exists to actually populate it. |
| Leave / PTO | ⬜ | Out of scope for this app per owner direction — `has_sil` remains a flag only, no request/approve/balance module. (A working version was built and then intentionally reverted.) |
| Payroll calculations | ✅ | Gross computation (basic, OT, NSD, holiday pay) shared between DTR preview and payslip generation via `summarizeCutoffEarnings()`. |
| PH statutory contributions | ✅ | SSS, PhilHealth, Pag-IBIG bracket tables (`contribution-tables.ts`) still back the numbers, but Regular weekly payroll now sources amounts from each employee's saved deduction defaults (below) rather than computing live off the tables — the tables remain the source used to set those defaults and for the off-cycle/13th-month path. Monthly-salary conversion fixed to match actual weekly cutoffs (was `×2`, now `×52/12`). |
| Employee payroll deductions & adjustments | ✅ | Each employee profile has an 11-item weekly deductions section (SSS/PhilHealth/Pag-IBIG, loans, coop savings, short/salary adjustment, bonus/13th month), each with a Can Deduct toggle (default off) and a default weekly ₱ amount — `EmployeeDeductionSettings.tsx`, migration 016. Supersedes the old flat `coop_saving_amount` field (backfilled into the new `coop_savings` type). |
| Payslips | ✅ | Full gross-to-net breakdown including BIR withholding tax. Per-payslip **Adjust** action (`PayslipAdjustModal.tsx`, migration 017) lets an admin override an employee's deduction amounts for a single payroll period without touching their saved defaults. `sil_pay` field is back to unused/0 (leave sync reverted with the leave module). |
| Off-cycle payroll runs | ✅ | New Payroll Run flow supports 13th Month Pay (auto-computed from year's basic pay, DOLE rule, ₱90k tax exemption), Bonus, and Adjustment (manual amount/reason per employee), alongside the existing Regular DTR-based run. |
| Owner cockpit payroll views | 🟡 | Single-org dashboard exists; no cross-venture rollup because the app is single-tenant-per-org today — "multi-venture owner" concept isn't modeled at the data layer yet. |

## Tier 2 — near-term enhancements

| Area | Status | Notes |
|---|---|---|
| Self-service portal | ⬜ | No employee-facing role exists at all — current roles are all internal staff (ceo/cfo/ops_officer/owner/assistant/tl). |
| Schedule entry UI | ✅ | `/schedule` page — set shift start/end per employee per day, same always-editable/single-save pattern as DTR. |
| Industry-specific intake | ⬜ | No department/intake data model exists yet. |
| Attachments/comments on intake | ⬜ | Depends on intake existing first. |
| Feedback loop | ✅ | Report Issue (now "Kath") widget supports file/image attachments; admin inbox shows them via signed URLs. |

## Tier 3 — competitive edge

| Area | Status | Notes |
|---|---|---|
| Agentic workflows / alerts | ⬜ | Not started. |
| Vertical ops module integration | ⬜ | Not started — no Gas/hotel/F&B ops modules exist in this repo yet. |
| Multi-market compliance | ⬜ | PH-only currently. |

## Immediate priority order

1. ~~Fix employee save~~ — done.
2. ~~BIR withholding tax~~ — done.
3. ~~Leave/PTO module~~ — built, then reverted per owner direction (out of
   scope for this app).
4. ~~Schedule entry UI~~ — done.
5. ~~Bank details field~~ — done.
6. ~~Off-cycle payroll runs~~ — done.
7. ~~Weekly payroll deductions & adjustments (employee-level defaults +
   per-payslip override)~~ — done.
8. Self-service portal, industry intake, agentic workflows, cross-venture
   owner cockpit — deferred; each is a bigger architectural lift (new
   auth model, new data model, or multi-tenant support) than what's been
   tackled so far and deserves its own scoping conversation first.

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
