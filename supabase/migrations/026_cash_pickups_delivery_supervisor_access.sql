-- Cash Pickups: widen to the same Delivery Supervisor role (2026-07-24)
-- ------------------------------------------------------------
-- Founder: Jeff and Arnold are both Supervisors doing deliveries,
-- transfers, and cash pickups alternately — same two people, same
-- role, not three separate specialists. cash_pickups' RLS only had a
-- narrower 'ops_officer_cash' role (scoped to one station); widening
-- "authorized roles manage cash_pickups" to also cover
-- 'ops_officer_delivery' (already assigned for deliveries) so the same
-- account covers all three duties without needing a second role.

alter policy "authorized roles manage cash_pickups" on cash_pickups
  using ((org_id = get_my_org_id()) and (get_my_role() = any (array['owner', 'station_ops', 'ceo', 'ops_officer_delivery'])));

insert into storage.buckets (id, name, public)
values ('cash-pickup-evidence', 'cash-pickup-evidence', false)
on conflict (id) do nothing;

create policy "org members can read cash pickup evidence"
on storage.objects for select
using (
  bucket_id = 'cash-pickup-evidence'
  and (storage.foldername(name))[1] = (get_my_org_id())::text
);

create policy "authorized roles can upload cash pickup evidence"
on storage.objects for insert
with check (
  bucket_id = 'cash-pickup-evidence'
  and (storage.foldername(name))[1] = (get_my_org_id())::text
  and get_my_role() = any (array['owner', 'station_ops', 'ceo', 'ops_officer_delivery', 'ops_officer_cash'])
);
