-- ============================================================
-- StaffVerified — Migration 003
-- Weekly hours budget per station
-- ============================================================

-- Add weekly hours budget to stations
alter table stations
  add column if not exists weekly_hours_budget numeric(6,1) not null default 0,
  add column if not exists budget_warning_pct  integer not null default 80; -- warn at 80% used

-- Seed Helium Fuels stations (8 locations: 7 stations + admin office)
-- Run after migration 001 has created the org.
-- Replace budget values with actual targets before go-live.
insert into stations (org_id, name, weekly_hours_budget, budget_warning_pct) values
  ('00000000-0000-0000-0000-000000000001', 'Station 1', 200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Station 2', 200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Station 3', 200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Station 4', 200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Station 5', 200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Station 6', 200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Station 7', 200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Admin Office', 80, 80)
on conflict do nothing;
