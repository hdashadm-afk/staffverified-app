-- ============================================================
-- StaffVerified — Migration 011
-- Leave / PTO — request, approve, and track balances
-- No employee self-service login exists yet, so requests are filed by
-- office staff on the employee's behalf (same pattern as DTR/NTE).
-- ============================================================

create table leave_requests (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  employee_id     uuid not null references employees(id) on delete cascade,
  leave_type      text not null default 'vacation', -- 'sil' | 'vacation' | 'sick' | 'special' | 'other'
  start_date      date not null,
  end_date        date not null,
  days_requested  numeric(4,1) not null,
  is_paid         boolean not null default true,
  reason          text,
  status          text not null default 'pending', -- 'pending' | 'approved' | 'rejected' | 'cancelled'
  requested_by    uuid references user_profiles(id) on delete set null,
  approved_by     uuid references user_profiles(id) on delete set null,
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  check (end_date >= start_date)
);

create index leave_requests_org_id_idx      on leave_requests(org_id);
create index leave_requests_employee_id_idx on leave_requests(employee_id);
create index leave_requests_status_idx      on leave_requests(status);
create index leave_requests_dates_idx       on leave_requests(start_date, end_date);

alter table leave_requests enable row level security;

create policy "privileged roles can insert leave requests"
  on leave_requests for insert
  with check (org_id = get_my_org_id() and get_my_role() in ('owner', 'ceo', 'ops_officer', 'assistant'));

create policy "privileged roles can read leave requests"
  on leave_requests for select
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'ceo', 'ops_officer', 'assistant'));

create policy "privileged roles can update leave requests"
  on leave_requests for update
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'ceo', 'ops_officer', 'assistant'));
