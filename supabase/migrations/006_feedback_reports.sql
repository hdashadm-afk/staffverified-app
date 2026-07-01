-- ============================================================
-- StaffVerified — Migration 006
-- Feedback / Bug Reports
-- Allows any org member to submit a report; owners/ceo can read + resolve.
-- ============================================================

create table feedback_reports (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references organizations(id) on delete cascade,
  user_id       uuid references user_profiles(id) on delete set null,
  user_name     text not null,
  user_email    text not null,
  page_url      text not null,
  message       text not null,
  severity      text not null default 'bug',  -- 'bug' | 'suggestion' | 'question'
  is_resolved   boolean not null default false,
  resolved_by   uuid references user_profiles(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index feedback_reports_org_id_idx on feedback_reports(org_id);
create index feedback_reports_created_at_idx on feedback_reports(created_at desc);

alter table feedback_reports enable row level security;

-- Any org member can file a report (must own the row)
create policy "org members can insert feedback"
  on feedback_reports for insert
  with check (org_id = get_my_org_id() and user_id = auth.uid());

-- Owner / CEO can read all reports in their org
create policy "owner can read feedback"
  on feedback_reports for select
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'ceo'));

-- Owner / CEO can mark resolved
create policy "owner can update feedback"
  on feedback_reports for update
  using (org_id = get_my_org_id() and get_my_role() in ('owner', 'ceo'));
