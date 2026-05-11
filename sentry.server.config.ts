/**
 * Sentry — Node-runtime server init.
 *
 * Loaded once per server boot (route handlers, server components,
 * server actions). Captures uncaught exceptions that bubble past
 * Next.js's error boundaries — and any manual Sentry.captureException
 * calls in service code.
 *
 * Reads SENTRY_DSN (not NEXT_PUBLIC_) so the DSN isn't shipped to the
 * client bundle. Server and client can use different DSNs if you want
 * — typically the same one works.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

Sentry.init({
  dsn,
  enabled: dsn.length > 0,
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: 0.1,
  ignoreErrors: [
    // Auth.js + Next.js routing internals — not user-facing errors.
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],
});
