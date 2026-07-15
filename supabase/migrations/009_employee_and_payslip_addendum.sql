-- ============================================================
-- StaffVerified — Migration 009
-- Addendum requested by HR (Rojelyn) after reviewing the live app:
--   Employees   — banking details + allowance for payroll deposit
--   Payslips    — bonus / 13th month / one-off salary adjustment,
--                 so these no longer need to be jammed into "add_back"
--
-- The employees.employment_type / sss_no / philhealth_no / pagibig_no /
-- tin_no / bank_name / bank_account_no / bank_account_name / allowance
-- columns, and payslips.withholding_tax, already exist on the live
-- database (added directly in an earlier session) but were never
-- captured in a migration file — this brings the migration history
-- back in sync with reality. `if not exists` makes it a no-op there
-- and a real add-column everywhere else (fresh envs, CI, etc).
-- ============================================================

alter table employees
  add column if not exists employment_type     text not null default 'regular',
  add column if not exists sss_no              text,
  add column if not exists philhealth_no       text,
  add column if not exists pagibig_no          text,
  add column if not exists tin_no              text,
  add column if not exists bank_name           text,
  add column if not exists bank_account_no     text,
  add column if not exists bank_account_name   text,
  add column if not exists allowance           numeric(12,2) not null default 0;

alter table payslips
  add column if not exists withholding_tax     numeric(12,2) not null default 0,
  add column if not exists bonus               numeric(12,2) not null default 0,
  add column if not exists thirteenth_month_pay numeric(12,2) not null default 0,
  add column if not exists salary_adjustment   numeric(12,2) not null default 0,
  add column if not exists salary_adjustment_reason text;
