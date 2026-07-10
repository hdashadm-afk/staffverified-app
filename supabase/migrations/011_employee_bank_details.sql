-- ============================================================
-- StaffVerified — Migration 011
-- Employee bank details (for payroll direct deposit / disbursement records)
-- ============================================================

alter table employees
  add column if not exists bank_name        text,
  add column if not exists bank_account_no  text,
  add column if not exists bank_account_name text;
