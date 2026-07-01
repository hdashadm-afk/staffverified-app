-- ============================================================
-- StaffVerified — Migration 007
-- NTE Records — disciplinary history per employee
-- ============================================================

-- Storage bucket for NTE PDFs
insert into storage.buckets (id, name, public)
values ('nte-documents', 'nte-documents', false)
on conflict (id) do nothing;

-- Allow authenticated users in any org to upload NTE PDFs
create policy "authenticated users can upload nte docs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'nte-documents');

-- Allow authenticated users to read NTE PDFs
create policy "authenticated users can read nte docs"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'nte-documents');

-- NTE records table
create table nte_records (
  id             uuid primary key default uuid_generate_v4(),
  org_id         uuid not null references organizations(id) on delete cascade,
  employee_id    uuid not null references employees(id) on delete cascade,
  date_issued    date not null,
  incident_date  date not null,
  violation      text not null,
  offense_number text not null,
  description    text not null,
  issued_by      text not null,
  pdf_url        text,          -- Supabase Storage path (not public URL)
  acknowledged   boolean not null default false,
  created_at     timestamptz not null default now()
);

create index nte_records_org_id_idx      on nte_records(org_id);
create index nte_records_employee_id_idx on nte_records(employee_id);
create index nte_records_created_at_idx  on nte_records(created_at desc);

alter table nte_records enable row level security;

-- Privileged roles can insert
create policy "privileged roles can insert nte records"
  on nte_records for insert
  with check (org_id = get_my_org_id() and get_my_role() in ('owner', 'ceo', 'ops_officer', 'assistant'));

-- Privileged roles can read all records in their org
create policy "privileged roles can read nte records"
  on nte_records for select
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'ceo', 'ops_officer', 'assistant'));

-- Privileged roles can update (mark acknowledged, etc.)
create policy "privileged roles can update nte records"
  on nte_records for update
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'ceo', 'ops_officer', 'assistant'));
