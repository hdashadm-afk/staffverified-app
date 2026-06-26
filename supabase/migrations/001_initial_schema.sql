-- ============================================================
-- StaffVerified — Initial Schema
-- Migration 001
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
create table organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  -- optional integrations (e.g. ["SSP"])
  connected_systems text[] not null default '{}',
  -- org-level payroll config
  ot_multiplier       numeric(4,2) not null default 1.0,
  nsd_rate            numeric(4,2) not null default 0.10,
  holiday_regular_multiplier  numeric(4,2) not null default 2.0,
  holiday_special_multiplier  numeric(4,2) not null default 1.3,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- STATIONS (per org)
-- ============================================================
create table stations (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  address     text,
  created_at  timestamptz not null default now()
);

create index stations_org_id_idx on stations(org_id);

-- ============================================================
-- USER PROFILES (extends Supabase auth.users)
-- ============================================================
create table user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid not null references organizations(id) on delete cascade,
  -- platform role: 'owner' | 'assistant' | 'ops_officer' | 'ceo' | 'cfo'
  role        text not null default 'assistant',
  full_name   text not null,
  email       text not null,
  created_at  timestamptz not null default now()
);

create index user_profiles_org_id_idx on user_profiles(org_id);

-- ============================================================
-- EMPLOYEES (staff at stations — separate from platform users)
-- ============================================================
create table employees (
  id                  uuid primary key default uuid_generate_v4(),
  org_id              uuid not null references organizations(id) on delete cascade,
  station_id          uuid references stations(id) on delete set null,
  full_name           text not null,
  position            text,
  daily_rate          numeric(12,2) not null default 0,
  has_sil             boolean not null default false,
  coop_saving_amount  numeric(12,2) not null default 0,
  is_active           boolean not null default true,
  date_hired          date,
  created_at          timestamptz not null default now()
);

create index employees_org_id_idx on employees(org_id);
create index employees_station_id_idx on employees(station_id);

-- ============================================================
-- SCHEDULES
-- ============================================================
create table schedules (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  station_id  uuid references stations(id) on delete set null,
  work_date   date not null,
  shift_start time,
  shift_end   time,
  created_at  timestamptz not null default now(),
  unique(employee_id, work_date)
);

create index schedules_org_id_idx on schedules(org_id);
create index schedules_employee_id_idx on schedules(employee_id);

-- ============================================================
-- DTR ENTRIES
-- ============================================================
create table dtr_entries (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references organizations(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,
  station_id    uuid references stations(id) on delete set null,
  work_date     date not null,
  time_in       time,
  time_out      time,
  -- computed and stored for auditability
  regular_hours     numeric(5,2) not null default 0,
  overtime_hours    numeric(5,2) not null default 0,
  night_shift_hours numeric(5,2) not null default 0,
  late_minutes      integer not null default 0,
  undertime_minutes integer not null default 0,
  is_holiday_regular  boolean not null default false,
  is_holiday_special  boolean not null default false,
  notes         text,
  entered_by    uuid references user_profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique(employee_id, work_date)
);

create index dtr_entries_org_id_idx on dtr_entries(org_id);
create index dtr_entries_employee_id_idx on dtr_entries(employee_id);
create index dtr_entries_work_date_idx on dtr_entries(work_date);

-- ============================================================
-- PAYROLL RUNS
-- ============================================================
create table payroll_runs (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  station_id  uuid references stations(id) on delete set null,
  cutoff_start  date not null,
  cutoff_end    date not null,
  -- status: 'draft' | 'review' | 'completed'
  status      text not null default 'draft',
  notes       text,
  prepared_by uuid references user_profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  completed_at timestamptz
);

create index payroll_runs_org_id_idx on payroll_runs(org_id);

-- ============================================================
-- PAYSLIPS (one per employee per payroll run)
-- ============================================================
create table payslips (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  payroll_run_id  uuid not null references payroll_runs(id) on delete cascade,
  employee_id     uuid not null references employees(id) on delete cascade,

  -- Earnings
  basic_pay           numeric(12,2) not null default 0,
  holiday_pay         numeric(12,2) not null default 0,
  sil_pay             numeric(12,2) not null default 0,
  overtime_pay        numeric(12,2) not null default 0,
  late_undertime_deduction numeric(12,2) not null default 0,
  night_shift_diff    numeric(12,2) not null default 0,
  allowances          numeric(12,2) not null default 0,
  add_back            numeric(12,2) not null default 0,
  add_back_reason     text,
  total_earnings      numeric(12,2) not null default 0,

  -- Deductions
  sss_contribution    numeric(12,2) not null default 0,
  philhealth_contribution numeric(12,2) not null default 0,
  hdmf_contribution   numeric(12,2) not null default 0,
  uniform_deduction   numeric(12,2) not null default 0,
  coop_saving         numeric(12,2) not null default 0,
  gas_shortage        numeric(12,2) not null default 0,
  gas_shortage_note   text,
  sss_loan            numeric(12,2) not null default 0,
  pagibig_loan        numeric(12,2) not null default 0,
  total_deductions    numeric(12,2) not null default 0,

  net_pay             numeric(12,2) not null default 0,

  -- Reconciliation
  variance_amount     numeric(12,2) not null default 0,
  variance_reason     text,

  created_at          timestamptz not null default now(),
  unique(payroll_run_id, employee_id)
);

create index payslips_org_id_idx on payslips(org_id);
create index payslips_payroll_run_id_idx on payslips(payroll_run_id);
create index payslips_employee_id_idx on payslips(employee_id);

-- ============================================================
-- GOVERNMENT CONTRIBUTION RECONCILIATION
-- ============================================================
create table contribution_reconciliations (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  payroll_run_id  uuid not null references payroll_runs(id) on delete cascade,
  employee_id     uuid not null references employees(id) on delete cascade,
  agency          text not null, -- 'SSS' | 'PhilHealth' | 'HDMF'
  actual_deduction   numeric(12,2) not null default 0,
  remittance_amount  numeric(12,2) not null default 0,
  variance           numeric(12,2) generated always as (remittance_amount - actual_deduction) stored,
  variance_reason    text,
  created_at      timestamptz not null default now()
);

create index contrib_recon_org_id_idx on contribution_reconciliations(org_id);
create index contrib_recon_payroll_run_id_idx on contribution_reconciliations(payroll_run_id);

-- ============================================================
-- PERMITS / COMPLIANCE (Module 3)
-- ============================================================
create table permits (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  station_id      uuid references stations(id) on delete set null,
  -- e.g. 'SSS Remittance', 'PhilHealth Remittance', 'DOE Pump Price Report', 'NTE'
  permit_type     text not null,
  agency          text not null,
  description     text,
  -- status: 'pending' | 'submitted' | 'overdue' | 'acknowledged'
  status          text not null default 'pending',
  due_date        date not null,
  submitted_at    timestamptz,
  submitted_by    uuid references user_profiles(id) on delete set null,
  -- storage path for proof of submission
  proof_file_path text,
  notes           text,
  -- for recurring submissions: link to parent permit template
  parent_permit_id uuid references permits(id) on delete set null,
  is_recurring    boolean not null default false,
  recurrence_rule text, -- e.g. 'monthly', 'weekly'
  created_at      timestamptz not null default now()
);

create index permits_org_id_idx on permits(org_id);
create index permits_station_id_idx on permits(station_id);
create index permits_due_date_idx on permits(due_date);
create index permits_status_idx on permits(status);

-- ============================================================
-- REMINDER RULES
-- ============================================================
create table reminder_rules (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  permit_id   uuid references permits(id) on delete cascade,
  -- days before due date to trigger reminder
  days_before integer not null default 3,
  notify_role text not null default 'assistant', -- who gets the reminder
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table organizations enable row level security;
alter table stations enable row level security;
alter table user_profiles enable row level security;
alter table employees enable row level security;
alter table schedules enable row level security;
alter table dtr_entries enable row level security;
alter table payroll_runs enable row level security;
alter table payslips enable row level security;
alter table contribution_reconciliations enable row level security;
alter table permits enable row level security;
alter table reminder_rules enable row level security;

-- Helper: get org_id for the current authenticated user
create or replace function get_my_org_id()
returns uuid
language sql
stable
as $$
  select org_id from user_profiles where id = auth.uid()
$$;

-- Helper: get role for the current authenticated user
create or replace function get_my_role()
returns text
language sql
stable
as $$
  select role from user_profiles where id = auth.uid()
$$;

-- Organizations: members can read their own org
create policy "org members can read own org"
  on organizations for select
  using (id = get_my_org_id());

-- Stations: scoped to org
create policy "members can read own org stations"
  on stations for select
  using (org_id = get_my_org_id());

create policy "owner can manage stations"
  on stations for all
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'ops_officer', 'ceo'));

-- User profiles: can read own profile and same-org profiles
create policy "user can read own profile"
  on user_profiles for select
  using (id = auth.uid() or org_id = get_my_org_id());

create policy "user can update own profile"
  on user_profiles for update
  using (id = auth.uid());

-- Employees: all org members can read; owner/assistant can write
create policy "members can read employees"
  on employees for select
  using (org_id = get_my_org_id());

create policy "owner or assistant can manage employees"
  on employees for all
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant', 'ops_officer', 'ceo'));

-- Schedules
create policy "members can read schedules"
  on schedules for select
  using (org_id = get_my_org_id());

create policy "owner or assistant can manage schedules"
  on schedules for all
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant', 'ops_officer', 'ceo'));

-- DTR entries
create policy "members can read dtr"
  on dtr_entries for select
  using (org_id = get_my_org_id());

create policy "owner or assistant can manage dtr"
  on dtr_entries for all
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant', 'ops_officer', 'ceo'));

-- Payroll runs
create policy "members can read payroll runs"
  on payroll_runs for select
  using (org_id = get_my_org_id());

create policy "owner or assistant can manage payroll runs"
  on payroll_runs for all
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant', 'ops_officer', 'ceo'));

-- Payslips
create policy "members can read payslips"
  on payslips for select
  using (org_id = get_my_org_id());

create policy "owner or assistant can manage payslips"
  on payslips for all
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant', 'ops_officer', 'ceo'));

-- Contribution reconciliations
create policy "members can read reconciliations"
  on contribution_reconciliations for select
  using (org_id = get_my_org_id());

create policy "owner or assistant can manage reconciliations"
  on contribution_reconciliations for all
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant', 'ops_officer', 'ceo'));

-- Permits
create policy "members can read permits"
  on permits for select
  using (org_id = get_my_org_id());

create policy "owner or assistant can manage permits"
  on permits for all
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant', 'ops_officer', 'ceo'));

-- Reminder rules
create policy "members can read reminder rules"
  on reminder_rules for select
  using (org_id = get_my_org_id());

create policy "owner can manage reminder rules"
  on reminder_rules for all
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'ops_officer', 'ceo'));

-- ============================================================
-- SEED: Helium Fuels org (pilot)
-- ============================================================
insert into organizations (id, name, slug) values
  ('00000000-0000-0000-0000-000000000001', 'Helium Fuels', 'helium-fuels');
