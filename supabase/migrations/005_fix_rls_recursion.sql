-- Make helper functions SECURITY DEFINER so they bypass RLS when reading
-- user_profiles. Without this, an RLS policy on user_profiles that calls
-- these functions recurses infinitely (stack depth exceeded -> 500 error).

create or replace function get_my_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from user_profiles where id = auth.uid()
$$;

create or replace function get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from user_profiles where id = auth.uid()
$$;

create or replace function get_my_station_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select station_id from user_profiles where id = auth.uid()
$$;
