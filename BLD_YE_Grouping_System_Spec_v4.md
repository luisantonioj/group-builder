# BUKAS LOOB SA DIYOS
**Youth Ministry — Youth Encounter**

## Shepherd's Grouping System
### System Design & Feature Specification

*Version 1.0 · May 14, 2026*

---

## 1. Overview

The Shepherd's Grouping System is an internal web tool built for the Youth Ministry shepherds of Bukas Loob sa Diyos (BLD). It digitizes the candidate management and group formation process for the annual Youth Encounter (YE), replacing manual spreadsheet coordination with a smart, visual, and conflict-aware system.

The core problem it solves: candidates must be grouped such that people who already know each other are intentionally separated — or at minimum, flagged — to maximize the openness and impact of the encounter. The tool makes this process faster, smarter, and more transparent.

---

## 2. Users & Roles

| **Role** | **Access & Responsibilities** |
| --- | --- |
| **Admin / Head Shepherd** | Full access — manages all data, finalizes groups and room assignments, exports output |
| **Shepherd** | Can upload candidates, do CRUD, drag-drop grouping, and room assignment |
| **Viewer (optional)** | Read-only access to finalized groupings — useful for event day reference |

---

## 3. Data Model

### 3.1 Candidate (Lamb)

- `id` — auto-generated UUID
- `timestamp` — auto-captured from form submission
- `full_name` — stored as surname + first name; parsed into separate fields on import
- `age` — integer; derived from birthday if not provided
- `birthday` — date; used for age calculation and birthday acknowledgment
- `address` — free text; used for general reference
- `facebook_account` — string; useful for identity verification and spotting duplicate registrations
- `personal_contact` — used as primary unique identifier for duplicate detection on import
- `father_name`, `father_contact` — emergency contact; displayed in reports
- `mother_name`, `mother_contact` — emergency contact; displayed in reports
- `food_allergies` — nullable text; flagged visually on candidate cards and in room/group reports
- `how_they_heard` — free text; useful for outreach analytics in the Dashboard
- `inviter_name` — free text from form; system attempts fuzzy-match to an existing candidate or BLD member; "N/A" is stored but treated as no connection
- `ye_batch` — e.g., "YE #18"; allows multi-batch support in the future
- `group_id`, `room_id` — nullable foreign keys; set during grouping and room assignment
- `shepherd_notes` — internal field; not from the form; editable only by shepherds

### 3.2 Relationship Graph

Connections are stored as edges in a separate connections table (not embedded on the candidate record) so the graph can grow independently. Two sources feed this graph:

- **Inviter field (auto)** — on import, the system fuzzy-matches `inviter_name` against existing candidates and BLD members, creating an edge when a match is found. Unresolved names are stored as unlinked and flagged for shepherd review. "N/A" entries are ignored.
- **Manual connections (shepherd-added)** — shepherds can add a connection between any two parties from the candidate profile or the Connection Visualizer. Each edge stores: `from_id`, `to_id`, `relationship_type` (classmate, sibling, barkada, churchmate, family, other), `source` ("auto" or "manual"), and an optional note. The target can be another candidate, a BLD member in a separate members table, or a free-text external name.

Conflict detection uses direct connections by default. Second-degree connections are surfaced in the Visualizer but do not trigger hard warnings unless toggled on by an admin.

### 3.3 Group

- `id`, `name` / label (e.g., Group A, Kordero 1)
- Assigned candidates (list of IDs)
- Max capacity (configurable)
- Conflict flag — auto-raised if two connected candidates are in the same group

### 3.4 Room

- `id`, `name`, `floor`/`building` (optional)
- Capacity, bed count
- Gender restriction (Male / Female / Mixed)
- Assigned candidates
- Conflict flag — raised if two connected candidates share a room

---

## 4. Pages & Features

### 4.1 Dashboard

Landing page after login. Shows a quick summary of the current YE batch.

- Total candidates, gender breakdown (donut chart)
- Groups formed vs. pending
- Conflict summary — number of active grouping and room conflicts
- Recent activity log — who edited what and when
- Quick links to all major pages

### 4.2 Masterlist (Candidate Management)

The main CRUD interface for all candidate records.

**Upload Section**
- Drag-and-drop or browse for `.xlsx` or `.csv` file
- Column mapping UI — shepherd maps uploaded columns to system fields
- Preview before import — shows first 10 rows with matched fields
- Duplicate detection — warns if a name or contact already exists
- Partial import support — skip or override existing records

**Table View**
- Sortable and filterable by any field (name, gender, age, group status)
- Search bar with instant results
- Inline edit or modal edit per candidate
- Bulk actions — delete, reassign group, export selection

**Add / Edit Modal**
- Full form for all candidate fields
- Inviter field — searchable dropdown linked to existing candidates or free-text for external names
- Validation — required fields, age range, gender options

**Export**
- Export full list or filtered view as `.xlsx` or `.pdf`

### 4.3 Connection Visualizer

Visual representation of the social graph to help shepherds understand candidate relationships before grouping.

- Network graph (node = candidate, edge = inviter relationship)
- Node color by gender, node size by connection count
- Click a node to highlight all first-degree connections
- Zoom, pan, and filter by cluster size
- Cluster list — groups of connected candidates shown as expandable cards
- Relationship table — flat list of all known connections with names and relationship type
- Filter toggles — show only unassigned candidates, show only conflicting connections

### 4.4 Group Formation (Drag & Drop)

The primary grouping workspace. Shepherds manually build groups here with real-time conflict detection.

**Setup Modal (shown before workspace)**
- Input: number of groups to create
- Optional: group names, max capacity per group
- Generates blank group cards on the right canvas

**Left Panel — Candidate Pool**
- Full list of unassigned candidates
- Toggle info chips per card: age, gender, school, inviter, connection count
- Filter by gender, age range, connection count
- Candidates already in a group are visually dimmed

**Right Canvas — Group Cards**
- Each group card shows name, assigned candidates, and current count vs. capacity
- Candidates can be dragged into groups or returned to the pool
- Candidates can be moved directly between groups

**Conflict System**
- Warning banner appears if two connected candidates are placed in the same group
- Conflicting candidates are highlighted in red within the group card
- Conflict does not block placement — shepherds can override with a note

**Auto-Suggest (optional enhancement)**
- One-click "Distribute Evenly" — assigns candidates to groups balancing gender and minimizing conflicts
- Shepherd can accept, reject, or tweak suggestions
- Save & Lock — finalize grouping; locks editing unless unlocked by admin

### 4.5 Room Assignment

Same drag-and-drop concept as Group Formation, but focused on sleeping arrangements.

- Room cards show capacity, bed count, and gender restriction
- Only candidates of matching gender can be placed in gendered rooms (hard constraint)
- Conflict warning if two connected candidates are assigned to the same room
- Visual indicators for: over capacity, gender mismatch, relationship conflict
- Separate views for Male Rooms and Female Rooms
- Room details editable by admin — add room, set capacity, set gender tag

### 4.6 Reports & Export

Finalized output for printing or sharing.

- Group list — per group, list of candidates with basic info
- Room list — per room, list of assigned candidates
- Conflict report — all flagged groupings and room assignments with shepherd notes
- Batch summary — totals, gender split, average group size
- Export formats: PDF (print-ready), Excel

---

## 5. Technical Specification

### 5.1 Recommended Stack

| **Layer** | **Technology** |
| --- | --- |
| **Frontend** | React (Vite) + TypeScript — fast, component-based UI |
| **Drag & Drop** | dnd-kit — modern, accessible drag-and-drop library |
| **Graph Visualization** | React Flow or Cytoscape.js — for the connection network |
| **Charts** | Recharts — lightweight, composable chart components |
| **File Parsing** | SheetJS (xlsx) — parses `.xlsx` and `.csv` on the client |
| **Styling** | Tailwind CSS — utility-first, fast to build |
| **Backend** | Node.js + Express (or Next.js API routes for simplicity) |
| **Database** | PostgreSQL — relational, good for graph-adjacent queries |
| **ORM** | Prisma — type-safe DB access, easy migrations |
| **Auth** | NextAuth.js or Clerk — shepherd login with role management |
| **Hosting** | Vercel (frontend) + Neon (DB) — Neon is serverless PostgreSQL that does NOT archive inactive projects; free tier includes 0.5 GB storage and auto-suspend (resumes in ~500ms, not days). Pairs perfectly with Prisma and Next.js. |

### 5.2 Backend API — Key Endpoints

- `POST /api/candidates/import` — bulk import from parsed file
- `GET/POST/PUT/DELETE /api/candidates/:id` — full CRUD
- `GET /api/candidates/:id/connections` — fetch first/second-degree connections
- `GET /api/groups` — list all groups with members
- `POST /api/groups/:id/assign` — assign candidate to group
- `GET /api/groups/:id/conflicts` — list conflict pairs in a group
- `GET/POST/PUT /api/rooms` — room management
- `POST /api/rooms/:id/assign` — assign candidate to room
- `GET /api/reports/export` — generate and return report file

### 5.3 Conflict Detection Logic

A conflict is defined as: two candidates sharing a group or room where a direct or second-degree relationship exists (via the inviter chain or manually added edges).

- On every group/room assignment, the backend runs a conflict check against the relationship graph
- Results are stored as a conflict flag on the group/room assignment record
- The frontend polls or receives real-time updates (via WebSocket or SSE) on conflict changes
- Shepherds can annotate and dismiss a conflict with a reason (audit trail kept)

### 5.4 PWA & Offline-First Architecture

The app is deployed to Vercel as a Progressive Web App (PWA). Shepherds can install it on their device and use it fully offline during YE prep venues where internet is unreliable. Changes made offline are queued and synced automatically when connectivity is restored.

- **PWA setup** — use `vite-plugin-pwa` (Workbox under the hood) to generate the service worker and manifest. Set `display: standalone`, add app icons, and configure a theme color. Vercel serves the app over HTTPS natively, satisfying the PWA requirement.
- **Offline storage** — use Dexie.js (IndexedDB wrapper) to persist the full candidate list, groups, rooms, and connections locally. On app load, data is hydrated from the local DB first (instant render), then a background sync fetches any server-side updates.
- **Sync queue** — every write (CRUD, group assignment, room assignment) is written to IndexedDB immediately and added to an outbox queue. When online, the queue flushes to the API in order. Each operation stores: action (create/update/delete), entity, payload, and timestamp.
- **Conflict resolution** — last-write-wins with a per-record `updated_at` timestamp. Since only shepherds edit (no candidate self-service), true simultaneous conflicts are rare. If a sync conflict is detected, a toast notification prompts the shepherd to review the two versions.
- **Connectivity indicator** — persistent status bar shows Online / Offline / Syncing. When offline, a count of pending operations is shown (e.g., "3 changes pending sync"). Syncing animates while the queue is flushing.
- **Service worker caching strategy** — app shell + static assets use Cache First; API calls use Network First with IndexedDB fallback. File uploads (`.xlsx`/`.csv`) are blocked offline with a clear message to reconnect first.

---

## 6. File Import Specification

Expected columns in uploaded `.xlsx` or `.csv` (flexible — shepherds map columns at upload time):

| **Column** | **Type** | **Notes** |
| --- | --- | --- |
| Full Name | String | Required |
| Age / Date of Birth | Number / Date | Either accepted |
| Gender | String | M/F or Male/Female |
| Contact Number | String | For duplicate detection |
| Inviter Name | String | Key field for conflict graph |
| School / Company | String | Used for implicit connections |

> **Note:** Same school / company is treated as a soft conflict (warning only, not a hard block).

---

## 7. UX Principles

- Mobile-aware but desktop-first — shepherds will mostly use laptops during prep
- Conflict warnings must be visible but non-blocking — shepherds know the context best
- Undo/redo support in the drag-and-drop workspace — mistakes happen
- Auto-save every assignment — no data loss on accidental close
- Color system: use gender color coding consistently across all pages (e.g., blue = male, pink = female)
- Dark mode is a first-class feature, not an afterthought — see Section 8 (Theming System) for full spec

---

## 8. Theming System (Light / Dark Mode)

All colors, spacing, and typography are driven by a single global CSS file of custom properties. Changing the theme or adjusting the design only requires editing this one file — no hunting through component styles. Light and dark mode are two sets of values for the same variable names.

### 8.1 Structure

One file: `src/styles/theme.css`. Everything else imports from it. No hardcoded color hex codes anywhere in components.

- `:root { }` — light mode defaults (background, text, surfaces, borders, accents)
- `[data-theme="dark"] { }` — overrides the same variable names for dark mode
- `@media (prefers-color-scheme: dark) { }` — auto-applies dark if no user preference saved yet

### 8.2 Variable Groups

Variables are organized into named groups so any shepherd-developer can find and change what they need quickly:

- **Brand colors** — `--color-primary`, `--color-primary-hover`, `--color-accent`, `--color-danger`, `--color-warning`, `--color-success`
- **Surfaces** — `--bg-page`, `--bg-card`, `--bg-sidebar`, `--bg-modal`, `--border-color`
- **Text** — `--text-primary`, `--text-secondary`, `--text-muted`, `--text-on-primary`
- **Gender indicators** — `--color-male`, `--color-female` — used consistently on all candidate chips, room cards, and graph nodes across both themes
- **Conflict / allergy flags** — `--color-conflict-bg`, `--color-conflict-border`, `--color-allergy-badge` — centralized so severity colors stay consistent
- **Typography** — `--font-sans`, `--font-size-sm/md/lg/xl`, `--font-weight-normal/bold`
- **Spacing & radius** — `--space-xs/sm/md/lg`, `--radius-sm/md/lg` — consistent padding and rounded corners app-wide

### 8.3 Toggle Behavior

- A sun/moon icon toggle in the top navigation bar switches between light and dark mode
- Preference is saved to `localStorage` and persists across sessions; also stored in IndexedDB so it survives offline
- Theme is applied by setting `data-theme="dark"` on the `<html>` element — no JS-in-CSS, no runtime style injection; just a class swap
- No flicker on load — a small inline script in `<head>` reads the saved preference and applies the theme before the first paint

---

## 9. Security & Encryption

The Shepherd's Grouping System handles personally identifiable information (PII) for minors and young adults — including names, contacts, birthdays, home addresses, emergency contacts, and food allergy data. Although this is an internal ministry tool, protecting this data is both a pastoral responsibility and a practical necessity. This section defines the encryption strategy layered across all tiers of the stack, chosen to be feasible for a solo developer within the project's free-tier cost constraints.

### 9.1 Transport Security (In-Transit)

All data in transit is protected by TLS 1.2+ enforced automatically by Vercel (HTTPS is required for PWA and is the default for all Vercel deployments). No additional configuration is needed.

- **HTTPS enforced by Vercel** — all pages, API calls, WebSocket/SSE connections, and file uploads travel over TLS automatically. HTTP requests are redirected to HTTPS.
- **Neon database connection** — Prisma connects to Neon via a TLS-encrypted connection string (`sslmode=require` is the Neon default). The `DATABASE_URL` must never be committed to source control; store it in Vercel environment variables only.
- **Strict-Transport-Security header** — add HSTS to the Next.js/Express response headers (`max-age=31536000; includeSubDomains`) to prevent protocol downgrade attacks.

### 9.2 Database Encryption (At-Rest)

Neon PostgreSQL encrypts the full disk volume at rest by default using AES-256 — no configuration required. Beyond full-disk encryption, sensitive PII columns receive an additional layer of application-level encryption before they are written to the database.

**Encrypted columns** — the following Candidate fields are encrypted at the application layer before storage: `personal_contact`, `birthday`, `address`, `facebook_account`, `father_contact`, `mother_contact`, `father_name`, `mother_name`, `food_allergies`, and `shepherd_notes`. Fields used for search or sorting (`full_name`, `gender`, `age`, `ye_batch`, `group_id`, `room_id`) remain plaintext to keep queries performant.

**Implementation** — use Node.js built-in `crypto` module (AES-256-GCM) with a 256-bit secret key stored in a Vercel environment variable (`ENCRYPTION_KEY`). A Prisma middleware intercepts all read/write operations on the sensitive fields: encrypt on write, decrypt on read. This keeps encryption logic in one place and invisible to the rest of the app.

- **Algorithm:** AES-256-GCM — provides both confidentiality and integrity (authenticated encryption). Each value is encrypted with a unique random IV (96-bit); the IV and auth tag are stored alongside the ciphertext as a single base64 string.
- **Key management:** the `ENCRYPTION_KEY` is a 32-byte random hex string generated once (`openssl rand -hex 32`) and stored only in Vercel environment variables. It is never logged, committed to git, or exposed to the client bundle.
- **Duplicate detection for `personal_contact`:** store a separate HMAC-SHA256 hash of the plaintext contact number (using a dedicated `HMAC_SECRET` env var) alongside the encrypted value. Duplicate checks compare hashes — no decryption needed.

### 9.3 Offline Storage Encryption (IndexedDB / Dexie.js)

The PWA stores the full candidate list, groups, rooms, and connection graph in IndexedDB via Dexie.js for offline use. IndexedDB is not encrypted by the browser by default — a determined local attacker on the same device can read it with DevTools. Encrypting this store protects candidate data on shared or borrowed devices used during YE prep.

- **Library: dexie-encrypted** — a drop-in Dexie middleware (`npm: dexie-encrypted`) that encrypts table rows using AES-GCM via the Web Crypto API before they are written to IndexedDB. No changes to the Dexie query API are required.
- **Encryption key derivation** — on login, the server returns a short-lived, per-session symmetric key (derived server-side from the user's session token using HKDF-SHA256). This key is held only in memory (never persisted to `localStorage` or IndexedDB itself) and is used to initialize `dexie-encrypted`. The local store becomes unreadable once the tab is closed and the key is gone.
- **Selective encryption** — `dexie-encrypted` supports per-table column whitelists. Encrypt only the sensitive fields (contacts, birthday, address, emergency contacts, `food_allergies`, `shepherd_notes`) while leaving IDs, names, and group assignments unencrypted so that offline queries and conflict detection remain fast.

### 9.4 Authentication & Session Security

- **Session tokens** — NextAuth.js issues JWTs signed with RS256 (asymmetric) or HS256 with a strong `NEXTAUTH_SECRET`. Tokens are stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies — not `localStorage` — to prevent JavaScript access. Set an appropriate expiry (e.g., 8 hours for active prep sessions).
- **Role enforcement** — role (admin / shepherd / viewer) is embedded in the JWT payload and verified server-side on every API call via middleware. Never trust role data sent from the client body.
- **Password hashing** — if credentials-based auth is used (as opposed to OAuth/Clerk), shepherd passwords are hashed with bcrypt (cost factor 12) before storage. Plain-text passwords are never stored or logged.
- **CSRF protection** — NextAuth.js includes built-in CSRF token handling. For custom Express routes, add the `csurf` middleware or use the double-submit cookie pattern.

### 9.5 Export File Security

Exported files (PDF and Excel) contain raw PII and must be treated with care. The system applies the following controls.

- **Server-side generation only** — export files are generated on the backend (not client-side) so raw decrypted data does not flow into the browser bundle. The server streams the file directly to the authenticated response.
- **Role-gated exports** — only Admin and Shepherd roles can trigger exports. Viewer accounts receive a permission-denied response on all export endpoints.
- **PDF password protection (recommended)** — for exports that include emergency contacts or medical data, optionally apply a PDF user password using `pdf-lib` or `pdfkit` with a password known only to admin shepherds. This is a UX trade-off (recipients must know the password) and can be opt-in per export.
- **No caching of export URLs** — set `Cache-Control: no-store` on all export responses so that proxies and browser caches do not retain a copy of the file.

### 9.6 Secrets & Environment Management

- All secrets (`DATABASE_URL`, `ENCRYPTION_KEY`, `HMAC_SECRET`, `NEXTAUTH_SECRET`) are stored exclusively in Vercel environment variables. They are never placed in `.env` files committed to the repository.
- A `.env.example` file in the repository documents the required variable names with placeholder values so any future collaborator knows what to configure — without any real secrets being exposed.
- The repository's `.gitignore` must include `.env`, `.env.local`, and `.env.*.local`. A pre-commit hook (e.g., `git-secrets` or `trufflehog`) can scan for accidentally committed secrets.
- **ENCRYPTION_KEY rotation:** if a key needs to be rotated (e.g., a leak is suspected), a one-time migration script must re-encrypt all affected rows with the new key before the old key is retired. Document this process before going live.

### 9.7 Security Summary Table

| **Layer** | **Mechanism** | **Details** |
| --- | --- | --- |
| Transport | TLS 1.2+ (HTTPS) | Enforced by Vercel; HSTS header added |
| Database (disk) | AES-256 (Neon) | Full-volume encryption by default; no config needed |
| PII columns | AES-256-GCM (app layer) | Prisma middleware; unique IV per value; key in env var |
| Offline store (IndexedDB) | AES-GCM (Web Crypto) | dexie-encrypted; session key derived server-side, held in memory only |
| Auth tokens | JWT (HS256 / RS256) | HttpOnly + Secure cookie; 8 hr expiry; CSRF protection |
| Passwords | bcrypt (cost 12) | If credentials auth is used; no plain-text passwords stored |
| Exports | Server-side; role-gated | Optional PDF password; Cache-Control: no-store |

---

## 10. Future Enhancements

- Shepherd assignment page — assign shepherds to groups so they know their lambs before YE
- Attendance tracking during the YE itself
- Year-over-year history — track who attended in past batches
- QR code per candidate for check-in on event day
- Notification system — email or SMS reminders to candidates via Twilio or Resend
- Alumni tagging — mark candidates who returned as volunteers in future YE batches

---

## 11. Project Notes

This is a personal side project intended to serve the BLD Youth Ministry community. The stack choices prioritize free or low-cost hosting, ease of development solo, and enough scalability to handle a yearly batch of 50–200+ candidates.

The project is a good portfolio piece demonstrating: relational data modeling, graph-based conflict logic, drag-and-drop UI, file parsing, role-based access, and export tooling — all in a real-world, mission-driven context.

**Start small.** Ship the Masterlist + Group Formation first. Visualizer and Room Assignment can follow. The community will already benefit enormously from just having a digital, conflict-aware grouping tool.

---

*Ad Majorem Dei Gloriam*
