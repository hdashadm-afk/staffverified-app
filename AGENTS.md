<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Branding & design system

All UI, branding, and product design work in this repo follows the Dipstify
design system. `docs/design-system.md` in this repo is the up-to-date,
rewritten reference (PR #28, 2026-07-21) — use it directly as the source of
truth; it mirrors `katiwala-owner-os-`'s `docs/DIPSTIFY_BRAND_GUIDE.md`.

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

**Rebrand note (2026-07-21, superseded same day — see the "2026-07-21
rebrand" note above):** originally flagged the palette/logo as not yet
updated for Dipstify. That's now done (see above) — this note is kept
only so the "umbrella brand is Dipstify, confirmed in
`katiwala-owner-os-`'s `docs/DIPSTIFY_BRAND_GUIDE.md`/
`docs/KATIWALA_PRODUCT_FAMILY.md`" context isn't lost. `docs/design-
system.md` itself was rewritten the same day (PR #28) — no longer a gap.

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

# Instruction-delivery preference — Standard Instruction Form

Confirmed by the founder 2026-07-23, superseding the 2026-07-21 attempt
(a published HTML artifact with checkboxes/tap-to-copy) — same rule now
in `katiwala-owner-os-`'s `docs/MASTER_DIRECTION.md` §11 and mirrored in
`fuel-ops`/`pnlverified`'s own `AGENTS.md`. The artifact version turned
out to add more friction than it removed — a link/page to open instead
of reacting immediately. **Do not build an HTML artifact or file for
multi-step instructions.**

Multi-step instructions go in a **plain markdown table, posted directly
in the chat reply** — a one-line Objective, then three columns, Step /
Where / How:

**Objective:** *one line — what this accomplishes and why it matters*

| Step | Where | How |
|---|---|---|
| 1 | *the site/dashboard* | *what to do, exact literal values inline as `code`* |

Rules:
- Always lead with the one-line Objective before the table.
- No link, no file, no artifact — the objective + table is the entire
  reply.
- Number rows sequentially across the whole instruction set, even across
  different topics/sites — don't restart numbering per topic.
- Exact literal values (env var names, secrets, URLs, webhook event
  names) go inline as `` `code` `` — never prose the founder has to
  retype.
- Where is the complete, exact address whenever known, not a vague
  breadcrumb — use the real URL verbatim if a screenshot or prior
  navigation already revealed it. Fall back to a breadcrumb only when no
  exact URL is known yet.
- Chat text outside the table stays to one or two sentences.
- No persisted checkbox state (accepted tradeoff) — for a task spanning
  multiple sessions, re-confirm progress rather than relying on memory.
- Apply whenever a task has 3+ sequential steps, even within a single
  site (not just across multiple sites).

# Session-end preference — Closing brief

When a piece of work finishes (a task, a PR, an investigation), close
with a short brief — what was actually found/done, and what's next —
rather than stopping silently or jumping straight to the next thing
unprompted. Pairs with Founder's Lens (session-start): together they
mean the founder never has to ask "so where are we" himself.

**Table, not prose** — same family as Founder's Lens. Columns Item /
Status / Note, one row per thing that happened or is still open:

| Item | Status | Note |
|---|---|---|
| *what was worked on* | ✅ Done, merged / ✅ Fixed / ❌ Not done | *one short clause, not a paragraph* |

No prose paragraph before or after — the table is the entire closing
brief.


# Branch Triage Standard

Confirmed by the founder, from a 24-branch pileup audit in `fuel-ops`:
whenever a session audits a batch of unmerged branches/PRs (not a
single-item review — this is for pileups), sort every item into exactly
three buckets, then act only on the third:

1. **Don't need — flag for a deeper check, don't delete yet.** Covers
   anything superseded, already achieved elsewhere, or actively harmful
   if merged (would regress a later fix). Deletion is irreversible for
   real work, so this bucket is a hold state, not an action — a deeper
   look comes before anything is actually deleted.
2. **Need later — keep, no action.** Real, valid, not superseded, but
   not needed for the current push (e.g. explicitly post-launch scope
   per standing docs). Leave the branch alone.
3. **Need now and safe — merge immediately.** Only items that are both
   actually needed right now and low-risk get merged same-session. If
   only part of a branch is safe (e.g. one real fix buried in an
   otherwise-stale branch), extract and apply that part directly rather
   than merging the whole thing.

Report the triage as a table (Item / Decision / Action), one row per
branch — the same Standard Instruction Form shape, applied to a decision
list instead of a step list. Don't skip straight to merging or deleting
a pileup without producing this table first.
