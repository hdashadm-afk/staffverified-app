-- ============================================================
-- StaffVerified — Migration 008
-- Feedback attachments — let reporters attach files/screenshots
-- ============================================================

-- Storage bucket for feedback attachments (images, PDFs, etc.)
insert into storage.buckets (id, name, public)
values ('feedback-attachments', 'feedback-attachments', false)
on conflict (id) do nothing;

-- Allow authenticated users to upload feedback attachments
create policy "authenticated users can upload feedback attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'feedback-attachments');

-- Allow authenticated users to read feedback attachments
create policy "authenticated users can read feedback attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'feedback-attachments');

alter table feedback_reports
  add column attachment_paths text[] not null default '{}';
