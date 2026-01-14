# Club Connect Hub 🚀

**Club Connect Hub** is a lightweight, TypeScript + React + Vite web app for managing student clubs and their leadership. It includes an admin dashboard, club president management UI, and Supabase integration for auth and data storage.

---

## Table of Contents 📚

- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Supabase / Database](#supabase--database)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Development notes](#development-notes)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License & Contact](#license--contact)

---

## Features ✅

- Admin Dashboard with club and user management
- President Club Management views and related components
- Authentication and session handling using Supabase
- Reusable UI components based on Radix UI and Tailwind
- TypeScript types for the Supabase schema

---

## Tech stack 🔧

- Vite + React (TypeScript)
- Tailwind CSS + shadcn-style components
- Supabase (Auth + Postgres)
- @tanstack/react-query for data fetching
- ESLint and TypeScript for dev-quality tooling

---

## Prerequisites ⚠️

- Node.js (>= 18)
- A Supabase project (for auth and DB)

---

## Local setup — Quick Start ⚡

1. Clone the repo

```bash
git clone <your-repo-url>
cd club-connect-hub-v2
```

2. Install dependencies (choose one):

```bash
# with npm
npm install
```

3. Create a `.env` file in the project root (see below for env names)

4. Start the dev server

```bash
npm run dev
```

Open http://localhost:5173 (Vite default) and you should see the app.

---

## Environment variables 🔑

Create a `.env` file at project root and set these vars (Vite expects them with the `VITE_` prefix):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-anon-key
```

> Note: The app uses `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` in `src/integrations/supabase/client.ts`.

---

## Supabase / Database ⚙️

- Migration files are stored in the `supabase/migrations/` folder.
- `supabase/config.toml` is present for local supabase tooling.

> Tip: If you're syncing local DB from Supabase, use the official Supabase CLI to run migrations and seed data.

---

## Scripts 📜

| Script | Command | Purpose |
|---|---:|---|
| dev | `npm run dev` | Start dev server (Vite) |
| build | `npm run build` | Build production assets |
| preview | `npm run preview` | Preview production build |
| lint | `npm run lint` | Run ESLint over the project |

---

## Project structure 🗂️

A quick overview of the most important files and folders:

- `src/` — application source
  - `components/` — UI components & pages (e.g., `PresidentClubManagement.tsx`)
  - `integrations/supabase/` — Supabase client and types
  - `pages/` — route pages (Dashboard, Login, AdminDashboard, etc.)
  - `contexts/` — React contexts (AuthContext)
  - `lib/` — assorted utilities
- `supabase/` — config and DB migrations

---
