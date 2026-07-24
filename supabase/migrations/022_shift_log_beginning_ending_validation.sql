-- Shift Log: Beginning/Ending readings + TL validation (2026-07-24)
-- ------------------------------------------------------------
-- Founder refinement: each shift gets two GA photos, not one — a
-- "Beginning" reading at shift start and an "Ending" reading at close,
-- both showing the digital display with price. At a handoff, the
-- outgoing GA's Ending and the incoming GA's Beginning are an
-- independent pair (cross-check); the last shift of the day just
-- closes with an Ending.
--
-- TL reviews the shift's readings and validates the whole shift (not
-- each reading individually) — that validation is what "submits with
-- his other reports" maps to structurally. Must stay flexible: if
-- there's no TL, the GA (station_ops) can validate too, so the day's
-- report isn't blocked on TL availability.

alter table dipstick_readings add column if not exists reading_type text check (reading_type in ('beginning', 'ending'));

alter table shift_logs add column if not exists validated_by uuid references user_profiles(id) on delete set null;
alter table shift_logs add column if not exists validated_at timestamp with time zone;
