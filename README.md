# Travel Planner

A three-column trip planner — trips on the left, a month calendar in the
middle, tasks on the right — with per-trip Stay / Transport / Activities
booking details. Multiple people can plan the same trip together: sign up,
invite teammates by link, and everyone sees the same trips, tasks and
bookings.

Implemented from a [Claude Design](https://claude.ai/design) HTML/CSS/JS
prototype; this is the real, database-backed version of that design.

## Stack

- **Next.js 15** (App Router, TypeScript, Server Actions)
- **PostgreSQL** via **Prisma**
- **Auth.js (NextAuth v5)** — email/password accounts, JWT sessions
- **Tailwind CSS**

## Features

- Month calendar with multi-day trip bars (lane-packed so overlapping trips
  never collide), holiday/note markers, and a responsive layout that
  collapses the side panels into icon rails at medium widths and a
  Trips/Calendar/Tasks tab bar on mobile.
- Click a trip (from the list, the calendar, or a rail icon) to open a
  detail drawer with **Stay**, **Transport**, and **Activities** sections.
  Each entry is a name + booking link + cost; once all three are filled in,
  the item is automatically marked **Scheduled**.
- A simple task list with inline add and toggle-to-complete.
- **Teams**: every account gets its own trip workspace. Click **+ Invite
  teammate** to generate a shareable join link — anyone who opens it (after
  signing in or creating an account) joins that workspace and sees the same
  trips and tasks. Switch between workspaces from the dropdown above the
  trip list if you belong to more than one.
- New accounts start with a demo itinerary (Barcelona → Copenhagen) seeded
  in, so the planner isn't empty on first login.

## Local development

Requirements: Node 20+, a PostgreSQL database.

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and NEXTAUTH_SECRET
npx prisma migrate dev
npm run dev
```

Generate a secret for `NEXTAUTH_SECRET` with `openssl rand -base64 32`.

Open [http://localhost:3000](http://localhost:3000), create an account, and
you'll land on the planner with the demo trip already loaded.

## Deploying (e.g. to Vercel)

1. Provision a Postgres database (Vercel Postgres, Neon, and Supabase all
   work) and set `DATABASE_URL` in your deployment's environment variables.
2. Set `NEXTAUTH_SECRET` (a random 32+ byte string) and `NEXTAUTH_URL` (your
   deployed URL, e.g. `https://your-app.vercel.app`).
3. Run `npx prisma migrate deploy` against the production database once
   (either locally with `DATABASE_URL` pointed at prod, or as a build/release
   step) to create the schema.
4. Deploy — `npm run build` runs `prisma generate` automatically via the
   `postinstall` script.

## Project structure

```
prisma/schema.prisma       Data model: User, Team, Membership, Invite, Trip, TripItem, Task
src/lib/                   Auth config, Prisma client, calendar/date logic, team helpers
src/actions/                Server Actions (mutations): auth, team, trips, tasks
src/components/Planner.tsx  Client-side app shell: layout mode, calendar state, drawer state
src/components/planner/     Left/right panels & rails, calendar grid, trip drawer, mobile tabs
src/app/                    Routes: /, /login, /signup, /invite/[token]
```

## Known limitations

- Invites don't send email — copy the generated link and share it yourself.
- No real-time sync between teammates; the UI refreshes after each of your
  own actions, but you won't see someone else's edit until you reload.
- `npm audit` currently reports a handful of advisories in transitive
  dependencies (mainly inside `next`'s own optional image-optimization and
  build tooling, and the legacy ESLint 8 toolchain). None are exploitable
  through this app's own code paths, but review them before using this in
  production and upgrade when fixes land.
