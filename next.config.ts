import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    /**
     * Next 16 changed `images.qualities` to default to [75] ONLY, and
     * any other value on an <Image quality> prop is silently ignored
     * rather than erroring. A dark photograph re-encoded at 75 on top
     * of its own compression bands badly, which is what pixelated the
     * Build Brief podcast frame. 92 is the photographic step; 75 stays
     * for everything that does not need more.
     */
    qualities: [75, 90, 92],
  },
  // The Tender Document route renders PDFs with react-pdf, which reads
  // the brand TTFs and the logo off disk at runtime — trace them into
  // the serverless bundle or the route works locally and breaks deployed.
  outputFileTracingIncludes: {
    "/builder/projects/[slug]/tender/document": ["./src/assets/**"],
  },
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
