# BuilderHQ

Australian residential construction tendering & procurement marketplace.
Project owners upload once. Suitable builders unlock projects, message owners, and submit tenders.

> Upload once. Tender smarter. Build better.

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript strict
- **Tailwind CSS v4** + shadcn/ui (added in Phase 0 step 2)
- **PostgreSQL** on Neon · **Drizzle** ORM
- **Auth.js v5** with DB sessions
- **Cloudflare R2** for documents (signed URLs only)
- **Stripe Checkout** + webhooks
- **Resend** + React Email
- **Inngest** for background jobs / cron / event fan-out
- **Sentry** + **PostHog** for monitoring & analytics
- Hosting: **Vercel** + **Cloudflare** (DNS/WAF), domain: `builderhq.com.au`

Architecture: modular monolith. See `docs/architecture.md` (added in Phase 0).

## Getting started

```bash
# requires Node 22+ and pnpm 10+
nvm use            # reads .nvmrc
pnpm install
cp .env.example .env.local   # fill in values
pnpm dev
```

App runs at http://localhost:3000.

## Scripts

| script | purpose |
|---|---|
| `pnpm dev` | start dev server |
| `pnpm build` | production build |
| `pnpm start` | run production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |

## Folder layout (target — built up over Phase 0–1)

```
app/                Next.js routes (marketing | auth | app | api)
src/
  modules/          one folder per domain module (auth, projects, ...)
  lib/              shared infra (db, auth, stripe, r2, ...)
  jobs/             Inngest functions
  emails/           React Email templates
components/         ui/ (shadcn) + app/ + marketing/
drizzle/            migrations
```

Module boundaries are enforced via ESLint `no-restricted-imports`.

## Deployment

- Production: push `main` → Vercel.
- DB: Neon (production branch).
- Storage: R2 production bucket.
- DNS / WAF: Cloudflare in front of Vercel.

## Status

Phase 0 — foundation scaffold. See `docs/roadmap.md`.
