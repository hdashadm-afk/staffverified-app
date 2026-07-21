<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Branding & design system

All UI, branding, and product design work in this repo follows the Dipstify
design system (see `katiwala-owner-os-`'s `docs/DIPSTIFY_BRAND_GUIDE.md`).
`docs/design-system.md` in this repo is stale (still says "Katiwala
ecosystem design system," not yet rewritten) — don't use it as the source
of truth until it's updated.

**2026-07-21 rebrand:** the app's actual live palette was blue (`--color-
brand-blue-*` in `src/app/globals.css`), not red as an earlier note here
claimed — that was inaccurate. Repointed the same CSS variables to
Dipstify's near-black/steel-gray ink scale (`#141414` family) and added
`--color-brand-yellow` (`#F5C400`) as the accent, so every component using
`bg-brand-blue-600` etc. re-skinned without touching 24 files individually.
Also swapped the logo (`Logo.tsx` now points at `/brand/dipstify-app-icon.
png`) and the "Katiwala AI App" text label on the login page and sidebar to
"Dipstify". Verified via Playwright screenshot of `/login` — clean,
readable, good contrast. Not touched: `docs/design-system.md` itself
(still says Katiwala, needs a full rewrite, not just a note) and any
authenticated screens (dashboard, payroll, etc.) — no test credentials
available this session to screenshot those; spot-check them once real
Dipstify styling is in front of you.

# Master direction

This repo is **Phase 2 (HR & Payroll)** of the Katiwala AI / KOS product,
per the locked master direction (Notion: "🧭 Master Direction — Target
Industry & Positioning", locked 2026-07-15; canonical doc now lives in the
`hdashadm-afk/Fuel-ops` repo, not here). Gas stations are the target
industry — StaffVerified is being built for a gas station's HR/payroll/
compliance needs first, connected into CEO's Space (Phase 1) as the
daily-decision layer above it. Phase 2 has no build dependency on Phase 3
(StationVerified/Ops) — don't block work here on that phase.

**Rebrand note (2026-07-21):** the umbrella brand across the whole product
family — this repo included — is now **Dipstify**, not Katiwala. Confirmed
in `katiwala-owner-os-`'s `docs/DIPSTIFY_BRAND_GUIDE.md` and
`docs/KATIWALA_PRODUCT_FAMILY.md`. `docs/design-system.md` here still says
"Katiwala ecosystem design system" and this repo's screens are still on the
pre-existing red theme — neither has been updated for Dipstify yet. Not
done as part of this note, just flagged so the next session doesn't assume
it's already handled.

# Session-start operating preference — "Founder's Lens"

Confirmed by the founder 2026-07-21 (same rule now in `katiwala-owner-os-`'s
`docs/MASTER_DIRECTION.md` §11 — applies across the whole product family,
not just that repo): deliver a baseline-grounded status automatically at
the start of a session — don't wait to be asked "what's on my plate."
Named **Founder's Lens** by the founder — same naming family as Lens (the
KOS assistant) and Owner's Lens (the product's top-level dashboard): "get
to see everything before deciding to start the day," applied to how
Claude opens a session. Check current repo state, don't assume from
memory. Format is always a table: item / priority / effort / purpose (why
it matters), with 🔴/🟡/🟢 for urgency, since plain chat text can't render
literal color. **Effort column (added 2026-07-21):** Low / Medium / High —
the founder's rough read on how much work the item is, to help him triage
what to greenlight now vs. schedule for later. Coverage must be
exhaustive, not curated — every open PR, every unmerged/unactioned item,
every decision still waiting on the founder, across every repo the
session has touched, not a top-3. Opening line: **"Boss, here's your Lens
today"** (or equivalent), then straight into the full table — not a
re-explanation of what Founder's Lens is each time.
