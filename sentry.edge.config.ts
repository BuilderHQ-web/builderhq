/**
 * Sentry — Edge-runtime init.
 *
 * Loaded for middleware (proxy.ts) and any route handler with
 * `export const runtime = "edge"`. Same DSN, lighter SDK (no Node
 * APIs available on Edge).
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

Sentry.init({
  dsn,
  enabled: dsn.length > 0,
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: 0.1,
});
