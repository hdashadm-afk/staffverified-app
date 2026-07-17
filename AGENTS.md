<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Branding & design system

All UI, branding, and product design work in this repo follows the Katiwala
ecosystem design system: see `docs/design-system.md`. That doc is a standing
reference, not yet applied — StaffVerified's current screens still use the
pre-existing red theme; check that doc before styling anything new.

# Master direction

This repo is **Phase 2 (HR & Payroll)** of the Katiwala AI / KOS product,
per the locked master direction (Notion: "🧭 Master Direction — Target
Industry & Positioning", locked 2026-07-15; canonical doc now lives in the
`hdashadm-afk/Fuel-ops` repo, not here). Gas stations are the target
industry — StaffVerified is being built for a gas station's HR/payroll/
compliance needs first, connected into CEO's Space (Phase 1) as the
daily-decision layer above it. Phase 2 has no build dependency on Phase 3
(StationVerified/Ops) — don't block work here on that phase.
