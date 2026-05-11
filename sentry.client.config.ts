/**
 * Sentry — client-side init.
 *
 * Runs in the browser. Captures unhandled rejections, render-phase
 * errors, and anything explicitly Sentry.captureException()'d.
 *
 * Env-driven so the same code runs in dev/preview/prod without
 * conditional imports — when SENTRY_DSN is empty the SDK no-ops
 * cleanly without throwing.
 *
 * Sample rates are conservative for launch:
 *   - 100% of errors (we want every one of them)
 *   - 10% of performance traces (sampling) — adjust upward if traffic
 *     is small enough that we want everything.
 *   - 0% session replays for now — turn this on later if we want to
 *     pay the Sentry replay quota for production debugging.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

Sentry.init({
  dsn,
  enabled: dsn.length > 0,
  environment: process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")
    ? "development"
    : "production",
  tracesSampleRate: 0.1,
  // Don't capture noisy bot user-agents or known-flaky browser
  // extensions. The denylist trims volume on the Sentry side.
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
    // Auth.js redirect signal — not a real error.
    "NEXT_REDIRECT",
  ],
});
