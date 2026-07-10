-- ============================================================
-- StaffVerified — Migration 009
-- Employee government IDs + employment type
-- The employee add/edit forms have saved these fields since the
-- "gov IDs" UI shipped, but no migration ever added the columns —
-- every employee save has been failing. This adds them.
-- ============================================================

alter table employees
  add column employment_type text not null default 'regular',
  add column sss_no          text,
  add column philhealth_no   text,
  add column pagibig_no      text,
  add column tin_no          text;
