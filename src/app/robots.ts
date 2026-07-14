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
          "/dev/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
