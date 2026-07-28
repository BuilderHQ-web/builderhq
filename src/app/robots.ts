import type { MetadataRoute } from "next";

/**
 * Crawl policy. Marketing surfaces are open (including to AI crawlers —
 * see public/llms.txt); the session-gated app, auth flows and private
 * partner previews are excluded.
 */

const SITE = "https://builderhq.com.au";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/owner/",
          "/builder/",
          "/admin/",
          "/auth/",
          "/login",
          "/onboarding",
          "/unsubscribe",
          "/partners/preview/",
          // The partner welcome film and its assets. Sent by email, not
          // found: no trailing slash so this covers the page itself as
          // well as the mp4 and poster beneath it. Safe as a prefix —
          // no partner slug begins with "welcome", so /partners and the
          // individual profiles under it stay fully crawlable.
          "/partners/welcome",
          "/dev/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
