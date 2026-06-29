-- ============================================================
-- StaffVerified — Migration 004
-- TL role + station scoping
-- Team Leaders are scoped to a single station.
-- ============================================================

-- Add station_id to user_profiles for TL scoping
alter table user_profiles
  add column if not exists station_id uuid references stations(id) on delete set null;

create index if not exists user_profiles_station_id_idx on user_profiles(station_id);

-- Helper: get station_id for current user (null for non-TL roles)
create or replace function get_my_station_id()
returns uuid language sql stable as $$
  select station_id from user_profiles where id = auth.uid()
$$;

-- DTR: TLs can read their own station's entries only
create policy "tl can read own station dtr"
  on dtr_entries for select
  using (
    org_id = get_my_org_id()
    and get_my_role() = 'tl'
    and station_id = get_my_station_id()
  );

-- Employees: TLs can read their own station's employees
create policy "tl can read own station employees"
  on employees for select
  using (
    org_id = get_my_org_id()
    and get_my_role() = 'tl'
    and station_id = get_my_station_id()
  );

-- Stations: TLs can read their own station only
create policy "tl can read own station"
  on stations for select
  using (
    org_id = get_my_org_id()
    and get_my_role() = 'tl'
    and id = get_my_station_id()
  );

-- Permits: TLs can read their station's compliance items
create policy "tl can read own station permits"
  on permits for select
  using (
    org_id = get_my_org_id()
    and get_my_role() = 'tl'
    and station_id = get_my_station_id()
  );
