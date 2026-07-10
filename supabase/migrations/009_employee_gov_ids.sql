-- ============================================================
-- StaffVerified — Migration 009
-- Employee government IDs + employment type
-- The employee add/edit forms have saved these fields since the
-- "gov IDs" UI shipped, but no migration ever added the columns —
-- every employee save has been failing. This adds them.
--
-- IF NOT EXISTS: `employment_type` was already present on production
-- (added by hand before this migration existed), so each column is
-- guarded individually rather than failing the whole statement.
-- ============================================================

alter table employees
  add column if not exists employment_type text not null default 'regular',
  add column if not exists sss_no          text,
  add column if not exists philhealth_no   text,
  add column if not exists pagibig_no      text,
  add column if not exists tin_no          text;
