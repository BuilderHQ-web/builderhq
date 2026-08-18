import type { MetadataRoute } from "next";

import {
  briefIssues,
  briefPerspectives,
} from "@/app/(marketing)/build-brief/brief-data";
import { PARTNERS } from "@/app/(marketing)/partners/partners-data";

/**
 * Site-wide sitemap. Marketing surfaces only — the app (owner/builder/
 * admin) is session-gated and excluded by robots. Live partners and
 * Build Brief issues are generated from their data modules, so new
 * entries index automatically.
 */

const SITE = "https://builderhq.com.au";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, priority: 1, changeFrequency: "weekly" },
    { url: `${SITE}/for/builders`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${SITE}/for/architects`, priority: 0.9, changeFrequency: "monthly" },
    // /for/finance-brokers now 308s to /partners/finance-brokers, which is
    // listed below. A sitemap should carry the destination, not the redirect.
    { url: `${SITE}/partners`, priority: 0.9, changeFrequency: "weekly" },
    {
      url: `${SITE}/partners/architects`,
      priority: 0.8,
      changeFrequency: "weekly",
    },
    {
      url: `${SITE}/partners/builders`,
      priority: 0.8,
      changeFrequency: "weekly" as const,
    },
    {
      url: `${SITE}/partners/finance-brokers`,
      priority: 0.8,
      changeFrequency: "weekly",
    },
    { url: `${SITE}/demo`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${SITE}/demo/architect`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${SITE}/build-brief`, priority: 0.9, changeFrequency: "weekly" },
    { url: `${SITE}/about`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${SITE}/faq`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${SITE}/book-a-call`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${SITE}/privacy`, priority: 0.3, changeFrequency: "yearly" },
    { url: `${SITE}/terms`, priority: 0.3, changeFrequency: "yearly" },
  ];

  const partnerPages: MetadataRoute.Sitemap = PARTNERS.filter(
    (p) => !p.draft,
  ).map((p) => ({
    url: `${SITE}/partners/${p.slug}`,
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  const briefPages: MetadataRoute.Sitemap = briefIssues().map((i) => ({
    url: `${SITE}/build-brief/${i.slug}`,
    lastModified: new Date(`${i.date}T07:00:00+10:00`),
    priority: 0.7,
    changeFrequency: "yearly",
  }));

  const perspectivePages: MetadataRoute.Sitemap = briefPerspectives().map(
    (p) => ({
      url: `${SITE}/build-brief/perspectives/${p.slug}`,
      lastModified: new Date(`${p.dateISO}T07:00:00+10:00`),
      priority: 0.8,
      changeFrequency: "yearly",
    }),
  );

  return [...staticPages, ...partnerPages, ...briefPages, ...perspectivePages];
}
