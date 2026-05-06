# BuilderHQ — Architecture

Single source of truth for **how this codebase is shaped** and the rules
that keep it that way. If a change conflicts with anything here, update
this file in the same commit.

The full product / phase plan lives in `MEMORY.md` of the agent session;
this doc only covers code-level architecture.

## Top-level shape

```
builderhq/
├── src/
│   ├── app/                      Next.js routes (App Router)
│   │   ├── (marketing)/          public marketing site
│   │   ├── (auth)/               signup · login · verify · reset
│   │   ├── (app)/                authenticated dashboards
│   │   │   ├── owner/
│   │   │   ├── builder/
│   │   │   └── admin/
│   │   ├── api/                  webhooks, file-download gate, og, inngest
│   │   ├── dev/                  internal-only (design system)
│   │   ├── globals.css           Tailwind v4 @theme + base
│   │   └── layout.tsx            root layout (fonts, metadata, viewport)
│   ├── modules/                  one folder per domain module
│   │   └── <name>/
│   │       ├── index.ts          public API — outsiders import from here
│   │       ├── service.ts        business logic (transactional)
│   │       ├── policies.ts       per-action authorization
│   │       ├── schema.ts         drizzle tables (when the module owns DB rows)
│   │       └── types.ts          domain types
│   ├── lib/                      shared infrastructure
│   │   ├── tokens.ts             design tokens (TS, RN-reusable)
│   │   ├── utils.ts              cn() + tiny pure helpers
│   │   ├── result.ts             Result<T, AppError> type
│   │   ├── logger.ts             structured logger
│   │   └── …                     db, auth, stripe, r2, resend, inngest (Phase 1+)
│   ├── components/
│   │   ├── ui/                   shadcn-style primitives (Button, Card, …)
│   │   └── brand/                BuilderHQ-specific (Logo, GlowButton, …)
│   ├── jobs/                     Inngest functions (Phase 2+)
│   ├── emails/                   React Email templates (Phase 1+)
│   └── middleware.ts             edge auth gating
├── drizzle/                      migrations (Phase 1+)
├── docs/                         architecture, decisions, phase notes
├── reference/landing/            Aryan's hand-coded landing — visual contract
├── public/brand/                 logo assets (PNG, SVG)
└── …                             config, package.json, etc.
```

## Architecture: modular monolith

One Next.js app, one deploy, one DB connection pool, one type system end-to-end.
Modules are conceptually separate (boundary enforced via folder + ESLint), but
they all run in the same process so cross-module calls are plain TypeScript
function calls, not network hops.

### Module rules (mechanical, enforced)

1. **Public API is `index.ts`.** Anything outside `src/modules/<m>` MUST
   import via `@/modules/<m>`. Never reach into `./schema`, `./service`,
   `./policies`, or `./events`. ESLint blocks this.
2. **Inside a module**, use relative imports (`./schema`, `./service`).
   The ESLint patterns only target the deep `@/modules/...` form.
3. **No cross-module DB queries.** If module A needs data from B, call
   `B.someService()`. Never write a Drizzle query that touches B's tables
   from inside A.
4. **Side effects emit events, don't call modules directly.** When
   something happens (project published, payment succeeded, tender
   submitted), the originating service emits an Inngest event. Email,
   notifications, audit logging are subscribers — they don't need to
   know who triggered them.

### Module list (Phase 0)

| Module | Owns |
|---|---|
| `auth` | sessions, account/credential storage |
| `users` | core user row + status + role |
| `profiles` | project_owner_profile + builder_profile |
| `projects` | projects + project_status_history |
| `documents` | project_documents + project_images (R2-backed) |
| `unlocks` | project_unlocks (the access-control source of truth) |
| `payments` | payments table (Stripe-driven) |
| `credits` | credit_ledger (append-only, double-entry style) |
| `fba` | founding_builder_access policy + monthly refresh cron |
| `tenders` | tenders + tender_versions (immutable history) |
| `messaging` | conversations + messages |
| `notifications` | in-app notifications + dispatch |
| `email` | Resend wrapper + email_logs |
| `verification` | builder_verifications + builder_licences |
| `admin` | (no DB tables; operates over others' services) |
| `audit` | audit_logs |

Each is a stub today; tables and services land phase by phase.

## Three discipline rules

These are the rules that keep the codebase from rotting. They are
inviolate. If you find yourself wanting to break one, write it up in
`docs/decisions/` first.

### 1. Policies are the security boundary

Every server action follows the same shape:

```ts
"use server";
export async function doThing(rawInput: unknown) {
  const input = inputSchema.parse(rawInput);            // Zod
  const user = await requireSession();                   // auth module
  if (!policies.canDoThing(user, input)) return forbidden();
  return service.doThing(user, input);                   // module service
}
```

Never enforce access in the UI alone. Hidden buttons are not security.

### 2. Side effects go through events, not inline awaits

Webhooks return 200 fast. Page loads don't block on email delivery. The
pattern:

```ts
// inside service.publishProject(...)
await db.transaction(...)                                // commit first
await inngest.send({ name: "project.published", data })  // then signal
```

Subscribers (email, notifications, audit, search-index update) live in
`src/jobs/` and are retryable.

### 3. Append-only ledgers + immutable versions

For anything financial or contractual, never `UPDATE` what you can `INSERT`:

- `credit_ledger` — every grant / spend / expiry is a row
- `tender_versions` — every edit is a new version row, `tenders.current_version_id` re-points
- `payments` — never mutate amount or status post-success; refunds are new rows
- `audit_logs` — append-only by construction
- `project_status_history` — every status change is a row

This gives us audit trails and dispute resolution for free.

## Routes & layouts

- **`(marketing)`** — public, SEO-indexed, ISR-friendly. Phase 5 builds the
  full marketing site from `reference/landing/`.
- **`(auth)`** — minimal centered card layout. Phase 1 adds Auth.js v5
  (DB sessions, email + Google + magic link, argon2id passwords).
- **`(app)`** — authenticated dashboard shell. Middleware enforces
  session + role before this layout runs. Phase 1 wires the gating.
- **`api/`** — minimal: webhooks (Stripe, Resend), Inngest entrypoint,
  signed-URL file-download gate, OG image generator. Everything else is
  Server Actions.
- **`dev/`** — internal-only routes (design system). `robots: noindex`.

## Naming & convention

- TS: **strict**, `noUncheckedIndexedAccess` on. No implicit `any` ever.
- Server Actions for mutations; RSC for reads. No client `fetch` to API
  routes except for streaming/uploads/webhooks.
- Components: `PascalCase`. Files: `kebab-case`. Modules: `lower-case`.
- Drizzle tables: `snake_case`, plural (`project_unlocks`).
- Enum values: `snake_case` strings (`paid`, `founding`, `admin_grant`).
- Never use `index.ts` as a barrel inside a module's internals — only
  the module's *public* `index.ts`.

## Where to put new code

| What | Goes in |
|---|---|
| New Drizzle table | `src/modules/<owning-module>/schema.ts` |
| New service function | `src/modules/<m>/service.ts`, exported via `index.ts` |
| New permission check | `src/modules/<m>/policies.ts` |
| New server action | route handler in `src/app/.../actions.ts` (thin wrapper around service) |
| New email template | `src/emails/<TemplateName>.tsx` |
| Background job | `src/jobs/<job-name>.ts` (Inngest function) |
| New UI primitive | `src/components/ui/<name>.tsx` (then add to `/dev/design-system`) |
| Brand-specific component | `src/components/brand/<name>.tsx` |
| Cross-cutting helper | `src/lib/<name>.ts` (only if truly cross-cutting) |

## Phase status

We're in **Phase 0** — foundations only. See the master plan for the
full Phase 0–6 roadmap. The current branch sets up:

- Next.js 16 + Tailwind v4 + design system locked to brand
- Modular monolith folder skeleton (this commit)
- ESLint enforcement of module boundaries
- Edge middleware placeholder for Phase 1 auth

Next is **Phase 1: identity** — Neon + Drizzle + Auth.js + signup/login/email-verify.
