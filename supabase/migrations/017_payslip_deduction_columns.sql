-- ============================================================
-- StaffVerified — Migration 017
-- Payslip columns for the new Weekly Payroll Deductions & Adjustments
-- line items not already covered by existing payslip columns:
--   sss_contribution, philhealth_contribution, hdmf_contribution (= Pag-IBIG),
--   sss_loan, pagibig_loan, coop_saving, gas_shortage (= Short) already exist.
-- ============================================================

alter table payslips
  add column if not exists coop_loan          numeric(12,2) not null default 0,
  add column if not exists salary_adjustment  numeric(12,2) not null default 0,
  add column if not exists bonus              numeric(12,2) not null default 0,
  add column if not exists thirteenth_month_pay numeric(12,2) not null default 0;
