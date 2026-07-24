-- Storage bucket for delivery/drop photos (2026-07-24)
-- ------------------------------------------------------------
-- Private, same convention as dipstick-photos/compliance-receipts/etc
-- — served via signed URLs. Access matches the deliveries/delivery_drops
-- table RLS: owner, station_ops, tl, ceo org-wide; ops_officer_delivery
-- scoped by the org_id path segment (station scoping for that role is
-- enforced at the table level already, not worth duplicating in storage
-- path parsing here).

insert into storage.buckets (id, name, public)
values ('delivery-photos', 'delivery-photos', false)
on conflict (id) do nothing;

create policy "org members can read delivery photos"
on storage.objects for select
using (
  bucket_id = 'delivery-photos'
  and (storage.foldername(name))[1] = (get_my_org_id())::text
);

create policy "authorized roles can upload delivery photos"
on storage.objects for insert
with check (
  bucket_id = 'delivery-photos'
  and (storage.foldername(name))[1] = (get_my_org_id())::text
  and get_my_role() = any (array['owner', 'station_ops', 'tl', 'ceo', 'ops_officer_delivery'])
);
