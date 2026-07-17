-- ============================================================
-- StaffVerified — Migration 015
-- Position master list (replaces free-text Position field) + per-employee
-- Regular Working Hours per Day (drives hourly-rate/OT/undertime math —
-- not every station runs an 8-hour shift).
-- ============================================================

create table if not exists positions (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (org_id, name)
);

create index positions_org_id_idx on positions(org_id);

alter table positions enable row level security;

create policy "members can read positions"
  on positions for select
  using (org_id = get_my_org_id());

create policy "owner or assistant can manage positions"
  on positions for all
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'assistant'));

-- Seed the standard position list for every existing org.
insert into positions (org_id, name, sort_order)
select o.id, p.name, p.sort_order
from organizations o
cross join (values
  ('Admin', 1),
  ('Gas Attendant', 2),
  ('Team Leader', 3),
  ('Supervisor', 4),
  ('OJT', 5)
) as p(name, sort_order)
on conflict (org_id, name) do nothing;

alter table employees
  add column if not exists regular_hours_per_day int not null default 8
    check (regular_hours_per_day in (8, 10, 12));
