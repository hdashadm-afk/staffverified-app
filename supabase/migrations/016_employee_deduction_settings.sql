-- ============================================================
-- StaffVerified — Migration 016
-- Weekly Payroll Deductions & Adjustments (Employee Profile)
--
-- Employee-level defaults for the 11 recurring weekly payroll line items
-- (statutory contributions, loans, savings, other adjustments, additional
-- earnings). Each item has a can_deduct toggle (default OFF) and a default
-- weekly amount. Payroll generation reads these as defaults; the actual
-- amount applied for a specific cutoff is stored on the payslip row itself,
-- so an admin can override a single payroll period without touching these
-- employee-level defaults.
-- ============================================================

create table employee_deduction_settings (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references organizations(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete cascade,
  deduction_type text not null check (deduction_type in (
    'sss', 'philhealth', 'pagibig',
    'sss_loan', 'pagibig_loan', 'coop_loan',
    'coop_savings',
    'short', 'salary_adjustment',
    'bonus', 'thirteenth_month_pay'
  )),
  can_deduct    boolean not null default false,
  weekly_amount numeric(12,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(employee_id, deduction_type)
);

create index employee_deduction_settings_org_id_idx on employee_deduction_settings(org_id);
create index employee_deduction_settings_employee_id_idx on employee_deduction_settings(employee_id);

alter table employee_deduction_settings enable row level security;

create policy "members can read employee deduction settings"
  on employee_deduction_settings for select
  using (org_id = get_my_org_id());

create policy "owner or assistant can manage employee deduction settings"
  on employee_deduction_settings for all
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant', 'ops_officer', 'ceo'));

-- Preserve current behavior for the one item that already existed
-- (coop savings): employees with a nonzero coop_saving_amount were always
-- deducted every cutoff, so seed can_deduct = true for those.
insert into employee_deduction_settings (org_id, employee_id, deduction_type, can_deduct, weekly_amount)
select org_id, id, 'coop_savings', coop_saving_amount > 0, coop_saving_amount
from employees
on conflict (employee_id, deduction_type) do nothing;
