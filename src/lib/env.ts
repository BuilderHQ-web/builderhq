/**
 * Runtime environment validation — single point of truth.
 *
 * Every value the app reads from process.env passes through this file. We
 * validate at boot (parse() throws if anything is missing/wrong-shaped),
 * so a misconfigured deploy fails immediately instead of producing a
 * mysterious 500 the first time the variable is touched.
 *
 * NEVER read process.env directly elsewhere — import { env } from here.
 *
 * Phase note: vars used in later phases (Stripe, R2, Inngest, Sentry,
 * OneSignal) are listed as `optional` for now so dev/local doesn't fail
 * before those modules ship. Each will become required as its module
 * lands.
 */

import { z } from "zod";

/**
 * Server-only schema. NEVER expose anything from here to the browser.
 * Things prefixed `NEXT_PUBLIC_` go in the client schema below — Next.js
 * inlines those at build time.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Auth.js v5
  AUTH_SECRET: z.string().min(32, "Generate with: openssl rand -base64 32"),
  AUTH_URL: z.url(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // Database (Neon Postgres + Drizzle)
  DATABASE_URL: z.string().min(1, "Set the pooled Neon connection string"),
  DATABASE_URL_UNPOOLED: z.string().min(1, "Set the direct Neon connection string (used by drizzle-kit migrations)"),

  // Email (Resend) — required from Phase 1 (verification emails)
  RESEND_API_KEY: z.string().min(1).startsWith("re_"),
  EMAIL_FROM: z.string().min(1),

  // ── Phase 2+ — optional until each module ships ───────────────────────
  // R2 is now required from Phase 2 step 2 (document uploads).
  R2_ACCOUNT_ID: z.string().min(1, "Cloudflare account ID"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2 API token Access Key ID"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2 API token Secret Access Key"),
  R2_BUCKET: z.string().min(1).default("builderhq-documents"),
  R2_ENDPOINT: z.url("Set the R2 S3 API endpoint, e.g. https://<account>.r2.cloudflarestorage.com"),
  R2_PUBLIC_URL: z.url().optional().or(z.literal("")),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  SENTRY_DSN: z.url().optional().or(z.literal("")),

  ONESIGNAL_APP_ID: z.string().optional(),
  ONESIGNAL_REST_API_KEY: z.string().optional(),

  ABR_GUID: z.string().optional(),

  // Verification proxy — Cloudflare Worker fronting ABR + state licence
  // registries. One base URL with two paths: `/?abn=...` for ABR,
  // `/vic/bpc?...` for VBA. As more states come online, add more paths
  // under the same worker rather than adding more env entries.
  VERIFICATION_PROXY_URL: z
    .url("Set the Cloudflare Worker URL fronting ABR + state registries")
    .default("https://builderhq-abn-check.flat-unit-d769.workers.dev"),
});

/**
 * Client-safe schema. These get inlined into the JS bundle at build time —
 * never put a secret here.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional().or(z.literal("")),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.url().optional(),
});

/**
 * Combined env. Values are read once at module load. Anywhere else in the
 * codebase, do `import { env } from "@/lib/env"` — never `process.env.X`.
 */
function loadEnv() {
  // Skip parsing during `next build`'s static-analysis pass — Next runs the
  // bundle without real env vars. Real validation happens at runtime.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  if (isBuildPhase) {
    return new Proxy({} as z.infer<typeof serverSchema> & z.infer<typeof clientSchema>, {
      get: (_t, key) => process.env[key as string],
    });
  }

  const isServer = typeof window === "undefined";
  const merged = isServer
    ? { ...serverSchema.parse(process.env), ...clientSchema.parse(process.env) }
    : (clientSchema.parse({
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
        NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
        NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      }) as z.infer<typeof serverSchema> & z.infer<typeof clientSchema>);

  return merged;
}

export const env = loadEnv();

export type Env = typeof env;
