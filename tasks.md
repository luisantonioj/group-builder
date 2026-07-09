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
