# Fieldwork

A Housecall-Pro-inspired scheduling, dispatch, and job/customer management app, built for a small home-service team.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) — Server Components for reads, Server Actions for writes
- [Prisma](https://www.prisma.io) + PostgreSQL
- [Auth.js (NextAuth v5)](https://authjs.dev) — email/password login with role-based access (Admin, Dispatcher, Tech)
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com)
- [Zod](https://zod.dev) for validation

## v1 features

- **Scheduling & dispatch** — a day-view board with a column per tech, reassign and change job status inline
- **Job & customer management** — customer records with address/notes, job history, job creation/editing with status tracking
- Role-based access: Admins and Dispatchers manage customers/jobs/team; Techs see and update only jobs assigned to them

Not in v1 (see "Follow-ups" below): estimates/invoicing, online payments, drag-and-drop scheduling, photo attachments.

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

## Follow-ups (out of scope for v1)

- Estimates and invoicing, online payments
- Drag-and-drop on the dispatch board
- Photo attachments on jobs
- Native mobile app / push notifications for techs
