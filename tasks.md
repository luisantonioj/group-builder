# Auth UI/UX Refresh Tasks

- [x] Locate the Login, Register Organization, and Join Organization pages.
- [x] Create shared auth layout/components for the approved split dark navy/blue direction.
- [x] Update Login page visuals only while preserving functionality.
- [x] Update Register Organization page visuals only while preserving functionality.
- [x] Update Join Organization page visuals only while preserving functionality.
- [x] Add scoped styling for auth pages without affecting app/dashboard pages.
- [x] Run verification checks.

Notes:
- `git diff --check` passed.
- `npx.cmd tsc --noEmit` is blocked by an existing `lib/crypto.test.ts` assignment to read-only `NODE_ENV`.
- `npm.cmd run lint` opened Next.js initial ESLint configuration prompt, so no non-interactive lint result is available yet.

## Responsive Auth Follow-up

- [x] Replace rigid auth page overflow behavior with viewport-friendly `100dvh` sizing and natural vertical scrolling only when needed.
- [x] Tighten desktop spacing, card padding, form gaps, input heights, and illustration sizing.
- [x] Add medium-height and short-height desktop compact rules for 1440x900 and 1366x768 style screens.
- [x] Preserve stacked behavior for tablet/mobile widths without horizontal overflow.
- [x] Force the auth form card to remain a clean white surface even when global auto dark mode is active.
- [x] Browser-check Login, Register Organization, and Join Organization at desktop and compact desktop sizes.

## 60/40 Auth Split Refinement

- [x] Convert auth pages to a true 60% dark branded panel and 40% full-height white form panel.
- [x] Remove the outer framed-container and floating-card visual treatment.
- [x] Restore visible branded logo content on the left panel and remove commented-out badge UI.
- [x] Keep all existing fields, links, buttons, routes, validation, API calls, and auth logic unchanged.
- [x] Verify desktop 60/40 ratio, full-height panels, no horizontal overflow, and responsive stacking.

## Auth Logo Asset Update

- [x] Replace the generated auth logo icon with `public/Group Builder Logo.png`.
- [x] Apply the public logo to the left brand panel and form header on Login, Register Organization, and Join Organization.
- [x] Remove old blue-square auth logo styling and stale lockup text CSS.
- [x] Browser-check that the public logo loads on all auth pages and no old auth logo SVG remains.

## Auth Left Panel Logo Removal

- [x] Remove the upper-left logo from the dark brand panel on all auth pages.
- [x] Keep the form header logo intact.
- [x] Remove stale `.auth-brand-lockup` styling.
