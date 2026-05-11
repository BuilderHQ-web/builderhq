import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

/**
 * Sentry config wrap.
 *
 *   - `silent`: don't spam the build log unless an upload genuinely
 *     fails.
 *   - `org` / `project`: read at build time from env. When unset the
 *     wrap no-ops cleanly and the SDK still works in runtime-only mode
 *     (errors land in Sentry from `Sentry.init`, just without source-
 *     map upload).
 *   - `tunnelRoute`: lets us route Sentry traffic through `/monitoring`
 *     to bypass adblockers that block sentry.io directly. Helpful for
 *     client-side error capture from users on aggressive blocklists.
 *   - `authToken`: only set in CI / Vercel deploys. Local builds skip
 *     source-map uploads cleanly.
 *
 * Source-map handling: the SDK defaults are sensible (`sourcemaps`
 * are uploaded to Sentry but not shipped to the public client bundle).
 * No need to explicitly configure unless we want a different policy.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "",
  project: process.env.SENTRY_PROJECT ?? "",
  silent: !process.env.CI,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
