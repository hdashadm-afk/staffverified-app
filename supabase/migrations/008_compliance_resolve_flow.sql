-- ============================================================
-- StaffVerified — Migration 008
-- Compliance Tracker: real resolve flow + history log + penalty
-- estimates for remittance-type permits (SSS, PhilHealth, etc.)
-- ============================================================

-- Amount tracking + resolve metadata on permits
alter table permits add column amount_due    numeric;
alter table permits add column amount_paid   numeric;
alter table permits add column resolved_at   timestamptz;
alter table permits add column resolved_by   uuid references user_profiles(id) on delete set null;

-- Storage bucket for payment receipts (SSS/PhilHealth confirmation, etc.)
insert into storage.buckets (id, name, public)
values ('compliance-receipts', 'compliance-receipts', false)
on conflict (id) do nothing;

create policy "authenticated users can upload compliance receipts"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'compliance-receipts');

create policy "authenticated users can read compliance receipts"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'compliance-receipts');

-- ============================================================
-- PENALTY RATES (reference data, not org-scoped)
-- Rates below are seeded from public statutory/circular sources as
-- of 2026-07 and are estimates only — verify against the current
-- SSS/PhilHealth circular before relying on the computed penalty.
-- ============================================================
create table compliance_penalty_rates (
  id           uuid primary key default uuid_generate_v4(),
  agency       text not null unique,
  rate_percent numeric not null,
  rate_period  text not null default 'month',
  source_note  text,
  updated_at   timestamptz not null default now()
);

alter table compliance_penalty_rates enable row level security;

create policy "authenticated users can read penalty rates"
  on compliance_penalty_rates for select
  to authenticated
  using (true);

insert into compliance_penalty_rates (agency, rate_percent, rate_period, source_note) values
  ('SSS', 3, 'month', 'RA 11199 Sec 22(a): 3%/month on unpaid contributions — verify current rate before relying on this estimate.'),
  ('PhilHealth', 3, 'month', 'PhilHealth circular: 3%/month compounded on unpaid contributions — a 2026 general amnesty may waive interest on some periods, confirm current status before relying on this estimate.')
on conflict (agency) do nothing;

-- ============================================================
-- PERMIT HISTORY (audit trail of status transitions)
-- ============================================================
create table permit_history (
  id           uuid primary key default uuid_generate_v4(),
  permit_id    uuid not null references permits(id) on delete cascade,
  org_id       uuid not null references organizations(id) on delete cascade,
  from_status  text,
  to_status    text not null,
  amount_paid  numeric,
  notes        text,
  changed_by   uuid references user_profiles(id) on delete set null,
  changed_at   timestamptz not null default now()
);

create index permit_history_permit_id_idx on permit_history(permit_id);
create index permit_history_org_id_idx    on permit_history(org_id);

alter table permit_history enable row level security;

create policy "members can read permit history"
  on permit_history for select
  using (org_id = get_my_org_id());

create policy "owner or assistant can log permit history"
  on permit_history for insert
  with check (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant', 'ops_officer', 'ceo'));
