-- ============================================================
-- StaffVerified — Migration 020
-- Late Hours: same admin/HR override support already built for
-- OT/NSD (migration 014) — computed automatically from Time In vs.
-- the approved schedule's shift_start, editable with a reason, and
-- logged to dtr_override_log for audit.
-- ============================================================

alter table dtr_entries
  add column if not exists late_minutes_overridden boolean not null default false;

alter table dtr_override_log
  drop constraint dtr_override_log_field_check;

alter table dtr_override_log
  add constraint dtr_override_log_field_check
  check (field in ('overtime_hours', 'night_shift_hours', 'late_minutes'));
