-- ============================================================
-- Migration 013 — DTR "Save as Draft" + lock until Payroll Date
-- Per Rojelyn's feature request (Kath AI group, 2026-07-16):
-- 1. Save as Draft (keep editing) vs Save Week (finalize) — a status
--    per employee per cutoff period, not per individual day row.
-- 2. A finalized DTR stays editable through the cutoff's Payroll Date
--    (cutoff end + 2 days, per lib/cutoff.ts), then auto-locks. An
--    HR/Admin can reopen it — reopening has no expiry, matching the
--    request's "unless HR/Admin user reopens it" (no auto re-lock
--    described).
-- ============================================================

create table dtr_cutoff_status (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references organizations(id) on delete cascade,
  employee_id  uuid not null references employees(id) on delete cascade,
  cutoff_start date not null,
  status       text not null default 'draft' check (status in ('draft', 'finalized')),
  reopened_by  uuid references user_profiles(id) on delete set null,
  reopened_at  timestamptz,
  updated_at   timestamptz not null default now(),
  unique(employee_id, cutoff_start)
);

create index dtr_cutoff_status_org_id_idx on dtr_cutoff_status(org_id);
create index dtr_cutoff_status_employee_cutoff_idx on dtr_cutoff_status(employee_id, cutoff_start);

alter table dtr_cutoff_status enable row level security;

-- Same shape as dtr_entries' own policies (001_initial_schema.sql).
create policy "members can read dtr_cutoff_status"
  on dtr_cutoff_status for select
  using (org_id = get_my_org_id());

create policy "owner or assistant can manage dtr_cutoff_status"
  on dtr_cutoff_status for all
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant', 'ops_officer', 'ceo'));
