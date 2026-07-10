-- ============================================================
-- StaffVerified — Migration 012
-- Off-cycle payroll runs: 13th month pay, one-off bonuses, adjustments
-- ============================================================

alter table payroll_runs
  add column if not exists run_type text not null default 'regular'; -- 'regular' | '13th_month' | 'bonus' | 'adjustment'
