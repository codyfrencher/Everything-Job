# Fieldwork

A Housecall-Pro-inspired scheduling, dispatch, and job/customer management app, built for a small home-service team.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) — Server Components for reads, Server Actions for writes
- [Prisma](https://www.prisma.io) + PostgreSQL
- [Auth.js (NextAuth v5)](https://authjs.dev) — email/password login with role-based access (Admin, Dispatcher, Tech)
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com)
- [Zod](https://zod.dev) for validation

## Features

- **Scheduling & dispatch** — a day-view board with a column per tech, reassign and change job status inline
- **Job & customer management** — customer records with address/notes, job history, job creation/editing with status tracking
- **Photo attachments** — attach photos to a job from any device, including straight from a phone camera
- **Push notifications** — a tech gets notified when a job is assigned to them (requires granting notification permission; on iPhone, the site must be added to the Home Screen first — see "Push notifications" below)
- An interactive dashboard — clickable status counts, inline status updates
- Role-based access: Admins and Dispatchers manage customers/jobs/team; Techs see and update only jobs assigned to them
- Mobile-friendly — nav and list views adapt to phone screens

Not yet built (see "Follow-ups" below): estimates/invoicing, online payments, drag-and-drop scheduling.

## Getting started

### 1. Start a local Postgres database

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with the credentials already wired up in `.env.example`.

### 2. Install dependencies and configure environment

```bash
npm install
cp .env.example .env
```

Generate a real `AUTH_SECRET` for anything beyond local dev:

```bash
npx auth secret
```

### 3. Set up the database

```bash
npm run db:migrate   # applies the Prisma schema
npm run db:seed      # creates demo users, customers, and jobs
```

Seeded logins (password for all: `password123`):

| Email | Role |
|---|---|
| admin@example.com | Admin |
| dispatch@example.com | Dispatcher |
| tech1@example.com | Tech |
| tech2@example.com | Tech |

### 4. Run the app

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and sign in with one of the seeded accounts.

## Push notifications

Push requires two environment variables — generate them once with:

```bash
npx web-push generate-vapid-keys
```

Then set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (locally in `.env`, and in your host's environment variables for production). Without these set, the "Enable notifications" button in the nav won't appear.

A tech taps "Enable notifications" once per device to opt in. On iPhone, Apple only allows push notifications from an installed web app, not a regular Safari tab — the tech needs to add the site to their Home Screen first (Share → Add to Home Screen), then open it from there before enabling notifications.

## Photo attachments

Job photos are stored in [Vercel Blob](https://vercel.com/docs/storage/vercel-blob). Create a **Public** access Blob store (Vercel dashboard → Storage → Create Database → Blob), connect it to the project, and make sure `BLOB_READ_WRITE_TOKEN` ends up in your environment variables — see the store's "Manage Blobs" → `.env.local` tab if you need to copy it manually.

## Project structure

```
prisma/
  schema.prisma       # User, Customer, Job models
  seed.ts             # demo data
src/
  app/
    login/             # sign-in page
    (dashboard)/        # authenticated app shell (nav + pages)
      customers/
      jobs/
      schedule/         # dispatch board
      team/             # admin-only team management
    api/auth/           # NextAuth route handler
  components/           # UI components, including shadcn primitives in ui/
  lib/
    actions/            # Server Actions (customers, jobs, users, auth)
    auth.ts             # NextAuth configuration
    db.ts               # Prisma client
    validators.ts       # Zod schemas
  proxy.ts              # auth-gating middleware (Next.js 16 "proxy" convention)
```

## Deploying

Point `DATABASE_URL` at a real Postgres instance (e.g. a managed Postgres provider), set a strong `AUTH_SECRET`, run `npx prisma migrate deploy`, then build and start the app (`npm run build && npm run start`) on your host of choice.

## Follow-ups (not yet built)

- Estimates and invoicing, online payments
- Drag-and-drop on the dispatch board
- Native mobile app
