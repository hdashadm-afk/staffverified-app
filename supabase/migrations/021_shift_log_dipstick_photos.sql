-- Shift Log + Dipstick Reading photos (2026-07-24)
-- ------------------------------------------------------------
-- shift_logs and dipstick_readings already existed (scaffolded, 0 rows,
-- no app code touching them) with RLS already written for a 'station_ops'
-- role that never made it into the app's Role type. Founder: the GA
-- (Gas Attendant, a different person from the TL) takes a photo of the
-- pump/tank reading each morning from their own account — that's the
-- "digital entry of the log." The TL then adds other info and closes
-- the shift; either the TL or the assigned GA can close it.
--
-- This adds the two missing pieces on dipstick_readings: a link back to
-- the shift it was taken during, and a photo. Both nullable — readings
-- taken outside an open shift, or without a photo, still save.

alter table dipstick_readings add column if not exists shift_log_id uuid references shift_logs(id);
alter table dipstick_readings add column if not exists photo_url text;

-- Storage bucket for the GA's reading photos. Private (matches this
-- repo's existing convention: compliance-receipts, nte-documents,
-- feedback-attachments are all private too), accessed via signed URLs.
insert into storage.buckets (id, name, public)
values ('dipstick-photos', 'dipstick-photos', false)
on conflict (id) do nothing;

-- Org-scoped storage access, same shape as the table-level RLS above:
-- path convention is `${org_id}/${station_id}/...`, so splitting the
-- object path's first segment against get_my_org_id() scopes access
-- the same way org_id columns do everywhere else in this schema.
create policy "org members can read dipstick photos"
on storage.objects for select
using (
  bucket_id = 'dipstick-photos'
  and (storage.foldername(name))[1] = (get_my_org_id())::text
);

create policy "authorized roles can upload dipstick photos"
on storage.objects for insert
with check (
  bucket_id = 'dipstick-photos'
  and (storage.foldername(name))[1] = (get_my_org_id())::text
  and get_my_role() = any (array['owner', 'station_ops', 'tl', 'ceo'])
);
