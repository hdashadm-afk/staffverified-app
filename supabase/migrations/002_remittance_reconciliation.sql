-- ============================================================
-- StaffVerified — Migration 002
-- Government Remittance Reconciliation
-- Tracks actual deduction vs. amount remitted to each agency.
-- Variance = zero is the goal. Non-zero variance surfaces a warning.
-- ============================================================

create table if not exists remittance_reconciliations (
  id                uuid primary key default uuid_generate_v4(),
  org_id            uuid not null references organizations(id) on delete cascade,
  payroll_run_id    uuid references payroll_runs(id) on delete set null,
  agency            text not null,       -- 'SSS' | 'PhilHealth' | 'HDMF'
  period_start      date not null,
  period_end        date not null,
  -- Total deducted from employees for this period
  total_deducted    numeric(12,2) not null default 0,
  -- Total actually remitted to the agency
  total_remitted    numeric(12,2) not null default 0,
  -- Computed variance (positive = over-remitted, negative = short)
  variance          numeric(12,2) generated always as (total_remitted - total_deducted) stored,
  -- Explanation required when variance != 0
  variance_reason   text,
  -- Submission tracking
  submitted_at      timestamptz,
  reference_number  text,               -- agency confirmation / SBR number
  submitted_by      uuid references user_profiles(id) on delete set null,
  notes             text,
  created_at        timestamptz not null default now()
);

create index remit_recon_org_id_idx on remittance_reconciliations(org_id);
create index remit_recon_period_idx on remittance_reconciliations(period_start, period_end);
create index remit_recon_agency_idx on remittance_reconciliations(agency);

-- RLS
alter table remittance_reconciliations enable row level security;

create policy "members can read remittance reconciliations"
  on remittance_reconciliations for select
  using (org_id = get_my_org_id());

create policy "owner or assistant can manage remittance reconciliations"
  on remittance_reconciliations for all
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant', 'ops_officer', 'ceo'));
