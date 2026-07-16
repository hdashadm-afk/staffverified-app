-- ============================================================
-- StaffVerified — Migration 014
-- Manual OT/NSD hour overrides on DTR entries, with an audit trail.
-- Admin/HR-tier roles (everyone with /dtr access apart from TLs, who use
-- the separate DailyAttendance station view) can override the
-- auto-computed overtime and night-shift-differential hours per day.
-- The override replaces the value used everywhere downstream (payroll),
-- since it's written directly into dtr_entries.overtime_hours /
-- night_shift_hours — no separate read path needed.
-- ============================================================

alter table dtr_entries
  add column if not exists overtime_hours_override boolean not null default false;

alter table dtr_entries
  add column if not exists night_shift_hours_override boolean not null default false;

create table if not exists dtr_hour_overrides (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  dtr_entry_id    uuid not null references dtr_entries(id) on delete cascade,
  employee_id     uuid not null references employees(id) on delete cascade,
  work_date       date not null,
  field           text not null check (field in ('overtime', 'night_shift')),
  original_value  numeric(6,2) not null,
  new_value       numeric(6,2) not null,
  reason          text,
  changed_by      uuid references user_profiles(id) on delete set null,
  changed_at      timestamptz not null default now()
);

create index dtr_hour_overrides_org_id_idx on dtr_hour_overrides(org_id);
create index dtr_hour_overrides_entry_id_idx on dtr_hour_overrides(dtr_entry_id);
create index dtr_hour_overrides_employee_idx on dtr_hour_overrides(employee_id, work_date);

-- RLS
alter table dtr_hour_overrides enable row level security;

create policy "members can read their org's dtr hour overrides"
  on dtr_hour_overrides for select
  using (org_id = get_my_org_id());

create policy "owner/assistant/ops_officer/ceo can log dtr hour overrides"
  on dtr_hour_overrides for insert
  with check (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant', 'ops_officer', 'ceo'));
