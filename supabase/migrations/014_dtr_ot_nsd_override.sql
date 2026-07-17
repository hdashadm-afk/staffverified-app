-- ============================================================
-- StaffVerified — Migration 014
-- Admin/HR manual override of computed OT and NSD hours on a DTR entry,
-- with an audit trail of who changed what and why.
-- ============================================================

alter table dtr_entries
  add column if not exists overtime_hours_overridden    boolean not null default false,
  add column if not exists night_shift_hours_overridden boolean not null default false;

create table if not exists dtr_override_log (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references organizations(id) on delete cascade,
  employee_id  uuid not null references employees(id) on delete cascade,
  work_date    date not null,
  field        text not null check (field in ('overtime_hours', 'night_shift_hours')),
  old_value    numeric(6,2),
  new_value    numeric(6,2) not null,
  reason       text,
  changed_by   uuid references user_profiles(id) on delete set null,
  changed_at   timestamptz not null default now()
);

create index dtr_override_log_org_id_idx on dtr_override_log(org_id);
create index dtr_override_log_employee_date_idx on dtr_override_log(employee_id, work_date);

alter table dtr_override_log enable row level security;

create policy "members can read dtr override log"
  on dtr_override_log for select
  using (org_id = get_my_org_id());

-- Same role set as "who can manage employees/DTR" elsewhere in this schema —
-- owner = Admin, assistant = HR, per this codebase's existing naming convention.
create policy "owner or assistant can write dtr override log"
  on dtr_override_log for insert
  with check (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant'));
