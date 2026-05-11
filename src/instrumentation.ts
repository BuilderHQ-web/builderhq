/**
 * Next.js instrumentation hook.
 *
 * Called once per runtime boot. We use it to wire Sentry's
 * runtime-specific init — Node SDK on the server, Edge SDK on edge
 * middleware. Without this, Sentry only captures client errors and
 * misses anything thrown in a server action or route handler.
 *
 * The dynamic imports gate which SDK loads — bundlers strip the
 * branch you don't take, keeping bundle sizes small.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Server-action / route-handler error capture — re-export Sentry's
// hook so framework-caught errors still reach the dashboard.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
