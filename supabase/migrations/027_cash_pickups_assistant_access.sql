-- Cash Pickups: allow accounting/assistant role too (2026-07-24)
-- ------------------------------------------------------------
-- Founder: owners or Casey (accounting officer) can also do a cash
-- pickup when needed, not just station_ops/ops_officer_delivery.
-- 'assistant' is the closest existing role match for an accounting
-- officer (already has payroll/remittance-adjacent HQ access) — Casey
-- has no staffverified-app account yet, but this widens the policy so
-- whichever role her account gets can cover pickups if it's assistant.

alter policy "authorized roles manage cash_pickups" on cash_pickups
  using ((org_id = get_my_org_id()) and (get_my_role() = any (array['owner', 'station_ops', 'ceo', 'ops_officer_delivery', 'assistant'])));
