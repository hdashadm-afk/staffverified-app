-- Deliveries: TL access + transfer support (2026-07-24)
-- ------------------------------------------------------------
-- Founder: delivery/transfer reports are covered by TL and the
-- Delivery Supervisor (ops_officer_delivery, already in the RLS but
-- unbuilt) — but the existing "authorized roles manage deliveries"
-- policy never included 'tl' at all. Widening it so TL can log/confirm
-- deliveries and drops at their own station, same as station_ops.
--
-- Also adds transfer support: a transfer is a delivery whose source is
-- another of the org's own stations rather than an external supplier
-- (add at destination, per founder "add or deduct back at the scene").
-- Nullable/optional — regular external deliveries are unaffected.

alter policy "authorized roles manage deliveries" on deliveries
  using ((org_id = get_my_org_id()) and (get_my_role() = any (array['owner', 'station_ops', 'ceo', 'tl'])));

alter policy "authorized roles manage delivery_drops" on delivery_drops
  using (exists (
    select 1 from deliveries d
    where d.id = delivery_drops.delivery_id
      and d.org_id = get_my_org_id()
      and (
        get_my_role() = any (array['owner', 'station_ops', 'ceo', 'tl'])
        or (get_my_role() = 'ops_officer_delivery' and d.station_id = get_my_station_id())
      )
  ));

alter table deliveries add column if not exists is_transfer boolean not null default false;
alter table deliveries add column if not exists source_station_id uuid references stations(id) on delete set null;
