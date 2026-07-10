-- ============================================================
-- StaffVerified — Migration 010
-- BIR withholding tax on payslips
-- ============================================================

alter table payslips
  add column if not exists withholding_tax numeric(12,2) not null default 0;
