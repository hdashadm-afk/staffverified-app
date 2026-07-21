# Dipstify Design System

Standing reference for all branding, UI, and product design across the
Dipstify product family. Applies by default to every future screen, module,
or mockup in this repo unless explicitly overridden. Source: `katiwala-
owner-os-`'s `docs/DIPSTIFY_BRAND_GUIDE.md` (2026-07-20), the standing
master brand instruction — supersedes the earlier "Katiwala Ecosystem
Design System" version of this doc.

## Ecosystem products (standardized names — never abbreviate)

- **Dipstify** — public-facing master brand (`dipstify.com`); replaces
  "Katiwala AI App" everywhere
- **Owner's Lens** — top-level owner dashboard (`katiwala-owner-os-` repo)
- **StaffVerified** — this repo, HR & Payroll
- **PNLVerified** — P&L module (`pnlverified` repo)
- **OpsVerified / StationVerified** — Ops module (`fuel-ops` repo)
- OWDO — separate business, own name/logo, not part of the Dipstify family

## Brand architecture

- One shared product family — every module should feel like the same
  company, connected through Owner's Lens as the single front door.
- Dipstify is the master brand; the Verified modules (StaffVerified,
  PNLVerified, OpsVerified) inherit its identity but each keeps its own
  repo, deployment, and database — see `katiwala-owner-os-`'s
  `docs/OWNERS_LENS_MODULE_INTEGRATION.md` for why that's the intended
  architecture, not a stopgap.
- Visual system stays consistent even where a module's own name is shown
  more prominently than "Dipstify."

## Dipstify logo

Asset sheet lives in `katiwala-owner-os-`'s `assets/brand/` (icon-only,
app-icon, wordmark variants) — copied into this repo at
`public/brand/dipstify-app-icon.png` / `dipstify-icon-only.png`.

- Do not redesign, distort, rotate, stretch, recolor, or decorate (no
  gradients/shadows/bevels/glows/outlines) the logo.
- Primary wordmark: bold, industrial sans-serif, custom "I" shaped like a
  dipstick — for YC deck, landing page, dashboard header, sales material.
- Secondary icon: yellow-and-black dipstick-based mark — favicon, app
  icon, compact avatar, small placements. This is what's used in this repo.
- Industrial, precise, memorable, serious — not playful, not decorative,
  no fuel-drop/flame/gas-pump clichés.

## Color palette

Applied in this repo as of 2026-07-21 (`src/app/globals.css`,
`--color-brand-blue-*` variable names kept for backward compatibility with
existing Tailwind classes — values repointed to the scale below):

Primary:
- Near-black / ink `#141414` (was `brand-blue-600`, the primary
  interactive color — buttons, active nav, focus states)
- White `#FFFFFF`
- Safety yellow `#F5C400` (`--color-brand-yellow`) — accent only, used as
  a signal (highlights, emphasis), not as a dominant fill

Neutrals (support only, when needed for readability/structure):
- Ink `#0F172A` (`--color-brand-ink`, unchanged)
- Slate `#475569` (`--color-brand-slate`, unchanged)
- Border `#CBD5E1` (`--color-brand-border`, unchanged)
- Surface Light `#F8FAFC` (`--color-brand-surface`, unchanged)

Rules:
- Black/white/steel-gray stay dominant everywhere; yellow is a signal, not
  decoration — avoid using it as a large background fill.
- No extra accent colors without explicit approval.
- Clean contrast, light surfaces, minimal visual noise — should feel like
  operational infrastructure software, not startup art. Avoid rainbow
  palettes, gradients, neon, glow, or glassmorphism.

## Typography

- **Inter Tight** — logo, headlines, and important brand moments
- **Inter** — UI, body copy, buttons, labels, dashboard text (this repo's
  `globals.css` body font-family, added 2026-07-21)
- **JetBrains Mono** — IDs, logs, technical values, operational data only

Apple-like discipline still applies: clean, calm, precise, legible,
minimal, modern. Consistent semantic hierarchy (Display/Hero, H1, H2, H3,
Body, Body Small, Label, Caption, Button Text); regular/medium/semibold/
bold only when needed; no ad hoc type styles, no playful/ornamental/
condensed/flashy fonts, no random sizes or weights.

## Visual style

Feel: minimal, modern, trustworthy, verified, operational,
premium-but-simple, B2B SaaS — industrial rather than consumer-style.

Prefer: flat design, strong spacing, rounded modern UI, clean line icons,
light borders, uncluttered layouts, structured hierarchy, fast scanning.

Avoid: gradients, glossy effects, bevels, heavy shadows, clutter,
over-designed graphics, too many colors, inconsistent modules, unnecessary
decoration.

## Shared app shell

One shell across all products/modules: top header, left sidebar, page
title, one primary CTA, KPI/summary card strip, filters/search row when
relevant, main work area, detail pages with tabs, activity/notes/alerts/
tasks area where relevant. Don't redesign the shell per product — only
content, records, workflows, labels, metrics, actions change. Per the
brand guide's UI/UX rule: this is a rebrand, not a rebuild — same
information architecture, same page flow, same interaction patterns, same
component logic.

## Components

- **Buttons** — Primary: near-black bg, white text. Secondary: white bg,
  ink border, ink text. Ghost: transparent bg, ink text. Yellow reserved
  for signal moments (badges, highlights), not primary button fills.
- **Cards** — white bg, clean border, minimal/no shadow, spacious.
- **Forms** — clear labels, strong readability, ink focus state, minimal
  noise.
- **Tables** — easy to scan, light dividers, good spacing, operational
  clarity first.
- **Badges** — minimal, clear status meaning; semantic color (good/warn/
  danger) stays separate from the yellow brand accent.
- **Icons** — simple line icons only, consistent stroke weight.

## Module presentation structure

1. Top header — page title + one main CTA
2. KPI cards / summary strip — 3–5 relevant metrics
3. Search/filters row when needed
4. Main work area — table, cards, board, or queue per workflow
5. Secondary area — recent activity, alerts, notes, or tasks
6. Detail pages — tabs (overview, records, timeline, notes, files, settings)

## StaffVerified positioning

HR & Payroll operations workspace — Phase 2 of the Dipstify product
family, connected into Owner's Lens as the daily-decision layer above it.

## Status in this repo

**2026-07-21 — applied.** The palette above and the Dipstify logo are live
(`src/app/globals.css`, `Logo.tsx`, login page, sidebar — see PR #25).
Earlier versions of this doc claimed StaffVerified was "still on a
pre-existing red theme" — that was inaccurate; the actual prior palette
was blue (`#1E3A5F` family), not red (the red-* Tailwind classes found in
~24 files are semantic error/danger-state colors, a normal UI pattern, not
the brand accent).

**Not yet done:** authenticated screens (dashboard, payroll, employees,
etc.) haven't been individually verified against this palette — the
CSS-variable-based rebrand should have applied everywhere `bg-brand-blue-*`
etc. classes are used, but no test credentials were available to
screenshot those screens directly. Spot-check them against this doc next
time you're logged in.
