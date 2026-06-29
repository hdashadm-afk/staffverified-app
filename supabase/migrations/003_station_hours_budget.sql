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
-- Weekly hour budgets: set to 200 per station by default — Best to update actual targets in-app.
insert into stations (org_id, name, weekly_hours_budget, budget_warning_pct) values
  ('00000000-0000-0000-0000-000000000001', 'Helium San Juan (HSJ)',      200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Helium Bolingit (HB)',       200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Helium Tandoc (HT)',         200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Helium Camaley (HC)',        200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Helium Quibaol (HQ)',        200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Helium Domalandan (HD)',     200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Helium Bani (HBani)',        200, 80),
  ('00000000-0000-0000-0000-000000000001', 'Admin Office',                80, 80)
on conflict do nothing;
