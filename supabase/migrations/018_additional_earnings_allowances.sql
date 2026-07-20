-- ============================================================
-- StaffVerified — Migration 018
-- Additional Earnings: TL Allowance, Gas Allowance, Other Allowance
--
-- Extends the "Additional Earnings" group from Weekly Payroll Deductions
-- & Adjustments (migration 016) with three more earning types, same
-- pattern as Bonus / 13th Month Pay: employee-level weekly default +
-- toggle, overridable per payslip.
-- ============================================================

alter table employee_deduction_settings
  drop constraint employee_deduction_settings_deduction_type_check;

alter table employee_deduction_settings
  add constraint employee_deduction_settings_deduction_type_check
  check (deduction_type in (
    'sss', 'philhealth', 'pagibig',
    'sss_loan', 'pagibig_loan', 'coop_loan',
    'coop_savings',
    'short', 'salary_adjustment',
    'bonus', 'thirteenth_month_pay',
    'tl_allowance', 'gas_allowance', 'other_allowance'
  ));

alter table payslips
  add column if not exists tl_allowance    numeric(12,2) not null default 0,
  add column if not exists gas_allowance   numeric(12,2) not null default 0,
  add column if not exists other_allowance numeric(12,2) not null default 0;
