# ASCEND

**Build. Prove. Rise.**

ASCEND is a performance network for ambitious entrepreneurs. Founders create a
public profile, connect a revenue source (Stripe, in test mode for the beta),
get their monthly revenue verified server-side, and climb global, country and
category leaderboards. Achievements, trophies and seasonal challenges give
people a reason to come back every month.

This repository is the first operational BETA — a real, working product, not
a mockup. Features explicitly out of scope for V1 (Shopify/PayPal/Paddle,
founder matching, messaging, a marketplace, paid billing, etc.) are marked
**Coming Soon** in the UI rather than faked.

The entire user-facing product is in **French** (this README and code
comments stay in English for the dev team). Brand terms — ASCEND,
"Build. Prove. Rise." — are the only exceptions.

### V2 additions

- **Motion**: Framer Motion throughout (`src/components/motion/`) — scroll
  reveals, staggered hero text, count-up numbers, a rank-transition counter,
  and a premium gold-glow achievement-unlock modal. Everything respects
  `prefers-reduced-motion`.
- **Notifications**: a `notifications` table (migration `...000006`) records
  real events server-side (achievement unlocked, rank improved, challenge
  completed, verification completed) and feeds a bell dropdown in the navbar.
  Nothing is ever fabricated client-side.
- **Verification "wow" moment**: after a first-time Stripe connection,
  `/verification` plays a short animated reveal (rank, next milestone) before
  landing on the dashboard — it re-fetches the data server-side rather than
  trusting anything passed through the redirect URL.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), TypeScript, React 19 |
| Motion | Framer Motion |
| Styling | Tailwind CSS v4 (CSS-based theme in `src/app/globals.css`) |
| Database | Supabase Postgres, with Row Level Security on every table |
| Auth | Supabase Auth (email/password) |
| Payments/data | Stripe Connect (Standard), **test mode only** |
| Charts | Recharts |
| Deployment | Vercel |

## Architecture

```
src/
  app/            Routes (App Router). Route groups: (auth), (app)
  components/     Reusable UI (ui/), and per-domain components
  services/       Business logic — the only code that talks to Supabase/Stripe
                  for anything beyond simple CRUD. UI never computes revenue,
                  growth or rank itself.
  lib/            Supabase clients, Stripe client, constants, validation, utils
  types/          Hand-authored Database types + domain types
supabase/
  migrations/     Schema, RLS policies, security-definer RPCs, catalog seed
scripts/
  seed.ts         Demo/test data for local development
```

**Why security-definer SQL functions?** Leaderboard ranking and public
profiles need to read *other users'* revenue to compute a rank, but a user's
raw revenue is protected by Row Level Security so only they can `select` it
directly. `get_leaderboard`, `get_user_rank` and `get_public_profile` (see
`supabase/migrations/20260101000003_functions.sql`) are `security definer`
Postgres functions: they can see everyone's revenue internally, but only ever
return a dollar figure when that user's `privacy_settings.revenue_visibility`
allows it. This means privacy is enforced by the database itself, not by the
frontend hiding a field it already received.

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the four files in `supabase/migrations/` **in
   order** (or link the project with the Supabase CLI and run
   `supabase db push`).
3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project
     Settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY` — same page. **Server-only, never expose
     this to the client.**

### 3. Set up Stripe (test mode)

1. Use a Stripe account in **test mode** (toggle in the Stripe dashboard).
2. Copy your test secret key (`sk_test_...`) into `STRIPE_SECRET_KEY`.
3. To let users connect their own Stripe account (Connect OAuth), register a
   **Standard** Connect platform in test mode under
   `Settings → Connect → OAuth settings`, add
   `http://localhost:3000/api/stripe/callback` as a redirect URI, and put the
   test client id (`ca_...`) in `STRIPE_CLIENT_ID`.
   - Without this, the "Connect Stripe" button will show a friendly error
     instead of crashing — everything else in the app still works.

### 4. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`.

### 5. Seed demo data (optional but recommended)

```bash
npm run seed
```

Creates ~9 fictional founders (flagged `is_demo = true` in the database) with
verified revenue history across the last 6 months, plus a few `test.*`
accounts for QA (verified/growing, verified/declining, unverified). All demo
accounts share the password printed at the end of the script. This populates
the leaderboard so the app isn't empty on first run — demo rows are visually
tagged "Demo" wherever they appear.

## Development commands

```bash
npm run dev      # start the dev server (Turbopack)
npm run build    # production build + typecheck
npm run start    # run a production build locally
npm run lint     # eslint
npm run seed     # seed demo/test data (see above)
```

## Testing checklist

There is no automated test suite yet. Before considering a change complete,
manually verify:

- Signup (all 4 steps, including skip), login, logout, password reset
- Username uniqueness + reserved-word rejection
- Onboarding resumes correctly if abandoned mid-way
- Stripe connect → callback → revenue sync → `/verification` reveal →
  verification badge flips to "Vérifié" → achievements/challenges update →
  achievement-unlock modal appears once on next dashboard visit, then not
  again
- Notification bell shows new events and clears the unread badge on open
- Privacy setting changes (exact/range/private) reflect immediately on the
  public profile and leaderboard
- Leaderboard scopes (global/country/category), current-user highlighting
- Public profile for a user that doesn't exist → 404, not a crash
- Mobile layout at 390/430px, desktop at 1440px — no horizontal scroll
  outside of the leaderboard table itself
- RLS: a logged-in user cannot read/write another user's `revenue_sources`,
  `verifications`, `revenue_snapshots`, `privacy_settings`, or
  `user_challenges` rows (test via the Supabase SQL editor with `set role`)

## Deployment (Vercel)

1. Import the repo into Vercel.
2. Add all variables from `.env.example` in Project Settings → Environment
   Variables (use your **production** Supabase project and, when ready,
   production Stripe keys — the beta ships with Stripe in test mode only).
3. Set `NEXT_PUBLIC_APP_URL` to the deployed URL (needed for OAuth redirects
   and email links).
4. Deploy. `npm run build` is Vercel's default build command and requires no
   changes.

## Security notes

- Every table has Row Level Security enabled; policies are in
  `supabase/migrations/20260101000002_rls.sql`.
- `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are read only in
  server-only modules (guarded with the `server-only` package) and are never
  sent to the client.
- Revenue, verification status and rank are always computed server-side from
  the database — no client request can set them directly.
