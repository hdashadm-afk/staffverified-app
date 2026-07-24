-- DTR: allow station_ops (Cashier/GA) the same station-scoped access as TL (2026-07-24)
-- ------------------------------------------------------------
-- Founder: the Cashier/GA should land on their dashboard with
-- attendance too, not just Shift Log. The app-side page already
-- treats station_ops like tl for the station-scoped "mark who worked"
-- view — these RLS policies were still 'tl'-only, so a GA's insert/
-- update/select would have been silently rejected by the database
-- even though the UI let them try.

alter policy "tl insert own station dtr" on dtr_entries
  with check ((org_id = get_my_org_id()) and (get_my_role() = any (array['tl', 'station_ops'])) and (station_id = get_my_station_id()));

alter policy "tl read own station dtr" on dtr_entries
  using ((org_id = get_my_org_id()) and (get_my_role() = any (array['tl', 'station_ops'])) and (station_id = get_my_station_id()));

alter policy "tl update own station dtr" on dtr_entries
  using ((org_id = get_my_org_id()) and (get_my_role() = any (array['tl', 'station_ops'])) and (station_id = get_my_station_id()))
  with check ((org_id = get_my_org_id()) and (get_my_role() = any (array['tl', 'station_ops'])) and (station_id = get_my_station_id()));
