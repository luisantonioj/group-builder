# Shepherd's Grouping System — Setup Guide

## Overview

This is a Next.js 14 application (App Router + TypeScript) for the BLD Youth Ministry's Youth Encounter group formation. The app runs **fully with mock data out of the box** — no database needed to start developing. Connect Neon + Vercel when you're ready to go live.

---

## Quick Start (Local Development — No DB Needed)

```bash
cd group-builder-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with:
- **Email:** `admin@bld.ph`
- **Password:** `shepherd123`

All 6 pages (Dashboard, Masterlist, Visualizer, Groups, Rooms, Reports) work immediately with realistic mock data.

---

## Full Stack Setup (Production)

### Step 1 — Neon PostgreSQL (Free Database)

1. Go to [neon.tech](https://neon.tech) and create a free account.
2. Click **New Project** → give it a name (e.g. `bld-ye-grouper`).
3. Select the region closest to the Philippines: `AWS Singapore (ap-southeast-1)`.
4. On the project dashboard, click **Connection Details** → **Connection string**.
5. Copy the full string — it looks like:
   ```
   postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
   ```
6. Neon's free tier: **0.5 GB storage**, auto-suspends after inactivity (resumes in ~500ms — not days). Perfect for a yearly YE prep tool.

### Step 2 — Set Up Environment Variables (Local)

```bash
# Inside group-builder-app/
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
NEXTAUTH_SECRET="<run: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="<run: openssl rand -hex 32>"
HMAC_SECRET="<run: openssl rand -hex 32>"
```

**Generating secrets on Windows (PowerShell):**
```powershell
# NEXTAUTH_SECRET
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# ENCRYPTION_KEY and HMAC_SECRET
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
```

Or use Git Bash / WSL:
```bash
openssl rand -base64 32   # for NEXTAUTH_SECRET
openssl rand -hex 32      # for ENCRYPTION_KEY and HMAC_SECRET
```

### Step 3 — Run Database Migrations

```bash
npm run prisma:generate    # generates Prisma client
npm run prisma:migrate     # applies schema to Neon
npm run prisma:seed        # creates admin user + default batch/groups/rooms
```

After seeding, your DB login credentials are:
- **Email:** `admin@bld.ph`
- **Password:** `shepherd123` (change this immediately in production!)

To change the admin password, run Prisma Studio:
```bash
npm run prisma:studio
```

### Step 4 — Test Locally With Real DB

```bash
npm run dev
```

Everything should work the same as the mock mode, but data now persists to Neon.

---

## Deployment to Vercel

### Step 1 — Install Vercel CLI (optional)
```bash
npm install -g vercel
```

### Step 2 — Create a Vercel Project

Option A — Via CLI:
```bash
vercel --cwd group-builder-app
```

Option B — Via Dashboard:
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set **Root Directory** to `group-builder-app`
4. Framework preset: **Next.js** (auto-detected)

### Step 3 — Set Environment Variables on Vercel

In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `NEXTAUTH_SECRET` | Your generated secret |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `ENCRYPTION_KEY` | Your 64-char hex key |
| `HMAC_SECRET` | Your 64-char hex secret |
| `NODE_ENV` | `production` |

**Important:** `NEXTAUTH_URL` must match your exact Vercel deployment URL. Update it if you add a custom domain.

### Step 4 — Deploy

```bash
vercel --prod --cwd group-builder-app
```

Or just push to your `main` branch — Vercel auto-deploys.

---

## Adding App Icons (PWA)

The PWA requires icon files at:
- `public/icons/icon-192.png` — 192×192px
- `public/icons/icon-512.png` — 512×512px

Create simple icons with the BLD cross or shepherd icon. You can use:
- [Favicon.io](https://favicon.io) to generate from text/image
- Or export from Canva/Figma

Without icons, the app still works — it just won't have a custom icon when installed as a PWA.

---

## Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Frontend + backend in one project; Vercel-native |
| Language | TypeScript | Type safety across the full stack |
| Styling | Tailwind CSS + CSS custom properties | Utility-first; single `theme.css` drives all colors |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Modern, accessible; works on touch screens |
| Visualizer | Custom SVG graph | Lightweight; no external graph library needed for simple layouts |
| Charts | Custom SVG + CSS | Donut chart and bar chart, zero dependencies |
| File Parsing | `xlsx` (SheetJS) | Parses `.xlsx`/`.csv` client-side |
| ORM | Prisma | Type-safe DB access; easy migrations |
| Database | PostgreSQL on Neon | Serverless, free tier, sslmode=require built-in |
| Auth | NextAuth.js v4 | Credentials login with JWT; role-based |
| Encryption | Node.js `crypto` (AES-256-GCM) | PII fields encrypted at app layer via Prisma middleware |
| Offline | Dexie.js (IndexedDB) | Full offline support for YE prep venues |

---

## Project Structure

```
group-builder-app/
├── app/
│   ├── (app)/            # Protected pages (auth-gated)
│   │   ├── dashboard/    # Landing — stats, conflicts, activity
│   │   ├── masterlist/   # Candidate CRUD + import
│   │   ├── visualizer/   # Connection graph
│   │   ├── groups/       # Drag-drop group formation
│   │   ├── rooms/        # Drag-drop room assignment
│   │   └── reports/      # Print/export reports
│   ├── (auth)/login/     # Login page
│   └── api/              # API routes (REST)
├── components/
│   ├── layout/           # Sidebar, Topbar, SyncBar
│   └── ui/               # Chip, Modal, Initials, etc.
├── lib/
│   ├── store.tsx          # Client-side state (mock data + mutations)
│   ├── prisma.ts          # Prisma singleton + encryption middleware
│   ├── auth.ts            # NextAuth config
│   ├── crypto.ts          # AES-256-GCM encrypt/decrypt + HMAC
│   ├── conflict-detection.ts  # Graph algorithms
│   ├── fuzzy-match.ts     # Fuse.js inviter matching
│   ├── dexie.ts           # IndexedDB offline store
│   └── mock-data.ts       # Sample candidates, groups, rooms
├── prisma/
│   ├── schema.prisma      # Full DB schema
│   └── seed.ts            # Initial data seed
├── styles/
│   └── theme.css          # All CSS custom properties (light + dark)
└── types/
    └── index.ts           # Shared TypeScript types
```

---

## Development Tips

### Working Without a Database

The app defaults to mock data from `lib/mock-data.ts`. All pages are fully interactive. No `.env.local` needed.

When the DB is configured and `npm run prisma:migrate` has been run, pages will switch to real API calls automatically.

### Adding New Candidates (Dev)

Edit `lib/mock-data.ts` → `MOCK_CANDIDATES` array. Use the same shape as `Candidate` in `types/index.ts`.

### Changing the Theme

Edit `styles/theme.css` only — all colors in `:root {}` (light) and `[data-theme="dark"] {}`. No component edits needed.

### Security Notes

- **Never commit `.env.local`** — it's in `.gitignore`
- **Rotate `ENCRYPTION_KEY`** with care: existing encrypted rows must be re-encrypted via a migration script before the old key is retired
- **Change the default password** (`shepherd123`) after seeding production
- **PDF exports** will include raw PII — treat exported files with the same care as the database

---

## Useful Commands

```bash
npm run dev              # Start local dev server
npm run build            # Production build
npm run prisma:studio    # Visual DB browser (amazing for debugging)
npm run prisma:migrate   # Apply schema changes
npm run prisma:seed      # Re-seed default data
```

---

## Future Enhancements (Spec Section 10)

These are not yet implemented but are designed for in the data model:

- **Shepherd assignment** — link shepherds to groups pre-YE
- **Attendance tracking** — mark present/absent during YE
- **QR code check-in** — per-candidate QR on the report printout
- **Year-over-year history** — track across batches
- **Email/SMS notifications** — via Resend or Twilio

---

*Ad Majorem Dei Gloriam*
