# Katiwala Ecosystem Design System

Standing reference for all branding, UI, and product design across the ecosystem.
Applies by default to every future screen, module, or mockup in this repo unless
explicitly overridden. Source: owner master instruction, 2026-07-13.

## Ecosystem products (standardized names — never abbreviate)

- Katiwala AI App — master trust/verification brand
- OWDO — official name; **never** "ODO"
- RideVerified
- TitleVerified
- CEOs Space
- StaffVerified — this repo
- StationVerified
- CafeVerified
- HotelVerified

## Brand architecture

- One shared ecosystem — all products should feel like the same company.
- Katiwala AI App is the master trust-oriented brand; the Verified products
  (RideVerified, TitleVerified, StaffVerified, StationVerified, CafeVerified,
  HotelVerified) inherit its trust/verification positioning.
- OWDO keeps its own name/logo but shares the same design language.
- Parent branding, where shown: "by Katiwala" or "A Katiwala Product".
- Visual system stays consistent even when parent branding isn't shown.

## Katiwala logo

Asset sheet saved at `docs/brand/katiwala-logo-asset-sheet.png` (primary,
reversed, app icon, favicon/icon-only variants).

- Do not redesign, distort, rotate, stretch, recolor, or decorate (no
  gradients/shadows/bevels/glows/outlines) the logo.
- Icon-only version for app icons, favicon, compact nav, profile icons, badges.
- Blue logo on white/light backgrounds; white logo on blue/dark backgrounds.
- Preserve clear space; never place on busy or low-contrast backgrounds.
- **Note:** the asset sheet's swatch reads `#0A1D4D`, which differs from the
  `Brand Blue #1E3A5F` specified in the written palette below. Flagging this —
  not resolved automatically. Confirm which is the source of truth before it's
  used pixel-for-pixel anywhere (favicon, splash, print).

## OWDO logo

Use OWDO's own approved logo as-is (no redesign/distortion/over-styling).
Align to the ecosystem only via color, typography, spacing, and component
behavior — not by forcing Katiwala branding onto it.

## Color palette

Primary:
- Brand Blue `#1E3A5F`
- White `#FFFFFF`

Neutrals (support only, when needed for readability/structure):
- Ink `#0F172A`
- Slate `#475569`
- Border `#CBD5E1`
- Surface Light `#F8FAFC`

Rules:
- Blue and white stay dominant everywhere.
- No extra accent colors without explicit approval.
- Clean contrast, light surfaces, minimal visual noise.

**Status in this repo:** StaffVerified currently uses a red primary
(`red-600`/`red-700`/`red-50`, ~23 files) as its accent color, not the blue
above. This doc records the target system; no rebrand has been applied yet —
that's a separate, explicit task (see bottom of this file).

## Typography

Apple-like discipline: clean, calm, precise, legible, minimal, modern.

- SF Pro / San Francisco where available; otherwise closest clean system
  sans-serif.
- Consistent semantic hierarchy across all products:
  Display/Hero, H1, H2, H3, Body, Body Small, Label, Caption, Button Text.
- Regular/medium/semibold/bold only when needed; consistent line-height and
  vertical rhythm; no ad hoc type styles; no playful/ornamental/condensed/
  flashy fonts; no random sizes or weights.

## Visual style

Feel: minimal, modern, trustworthy, verified, operational, premium-but-simple,
B2B SaaS.

Prefer: flat design, strong spacing, rounded modern UI, clean line icons,
light borders, uncluttered layouts, structured hierarchy, fast scanning.

Avoid: gradients, glossy effects, bevels, heavy shadows, clutter, over-designed
graphics, too many colors, inconsistent modules, unnecessary decoration.

## Shared app shell

One shell across all products/modules: top header, left sidebar, page title,
one primary CTA, KPI/summary card strip, filters/search row when relevant,
main work area, detail pages with tabs, activity/notes/alerts/tasks area
where relevant. Don't redesign the shell per product — only content, records,
workflows, labels, metrics, actions change.

## Components

- **Buttons** — Primary: blue bg, white text. Secondary: white bg, blue
  border, blue text. Ghost: transparent bg, blue text.
- **Cards** — white bg, clean border, minimal/no shadow, spacious.
- **Forms** — clear labels, strong readability, blue focus state, minimal
  noise.
- **Tables** — easy to scan, light dividers, good spacing, operational
  clarity first.
- **Badges** — minimal, clear status meaning, blue/neutral logic first.
- **Icons** — simple line icons only, consistent stroke weight.

## Module presentation structure

1. Top header — page title + one main CTA
2. KPI cards / summary strip — 3–5 relevant metrics
3. Search/filters row when needed
4. Main work area — table, cards, board, or queue per workflow
5. Secondary area — recent activity, alerts, notes, or tasks
6. Detail pages — tabs (overview, records, timeline, notes, files, settings)

## StaffVerified positioning

Verification operations workspace for staff records and approvals — part of
the trust/verification family, should visually align with the Katiwala
ecosystem once rebranded.

## Open item

This doc captures the target design system. It does **not** itself change
any UI — StaffVerified's actual screens still use the pre-existing red theme.
Applying this (swapping red → Brand Blue, adjusting typography/components/
shell to match) across ~23 files is a distinct, visible rebrand of a live
product and should be scoped and confirmed explicitly before starting.
