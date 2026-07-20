-- ============================================================
-- StaffVerified — Migration 019
-- Employee email address
--
-- Needed so HR (Rojelyn/Arlene) can enter each staff member's email,
-- as the destination for emailed payslips. This migration only adds
-- the column — actual payslip email delivery is a separate feature.
-- ============================================================

alter table employees
  add column if not exists email text;
