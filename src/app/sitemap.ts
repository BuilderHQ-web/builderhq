import type { MetadataRoute } from "next";

import {
  briefIssues,
  briefPerspectives,
} from "@/app/(marketing)/build-brief/brief-data";
import { PARTNERS } from "@/app/(marketing)/partners/partners-data";

/**
 * Site-wide sitemap. Marketing surfaces only: the app (owner, builder,
 * admin) is session-gated and excluded by robots, as are the auth flow,
 * the private partner previews and the /start question steps.
 *
 * Live partners and Build Brief issues are generated from their data
 * modules, so new entries index automatically. Everything else is
 * listed by hand, and every URL here must resolve.
 */

const SITE = "https://builderhq.com.au";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, priority: 1, changeFrequency: "weekly" },

    // The story, one page per audience, plus the price list.
    {
      url: `${SITE}/for/homeowners`,
      priority: 0.9,
      changeFrequency: "monthly",
    },
    { url: `${SITE}/for/architects`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${SITE}/for/builders`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${SITE}/pricing`, priority: 0.9, changeFrequency: "monthly" },

    { url: `${SITE}/partners`, priority: 0.9, changeFrequency: "weekly" },
    {
      url: `${SITE}/partners/architects`,
      priority: 0.8,
      changeFrequency: "weekly",
    },
    {
      url: `${SITE}/partners/builders`,
      priority: 0.8,
      changeFrequency: "weekly",
    },
    {
      url: `${SITE}/partners/finance-brokers`,
      priority: 0.8,
      changeFrequency: "weekly",
    },
    { url: `${SITE}/build-brief`, priority: 0.9, changeFrequency: "weekly" },
    {
      url: `${SITE}/build-brief/feed.xml`,
      priority: 0.4,
      changeFrequency: "weekly",
    },
    { url: `${SITE}/about`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${SITE}/faq`, priority: 0.6, changeFrequency: "monthly" },

    // Campaign landings. Reached from ads rather than from the nav, so
    // the sitemap is the only way a crawler finds them.
    { url: `${SITE}/start`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${SITE}/guide`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${SITE}/owneradvisory`, priority: 0.5, changeFrequency: "monthly" },
    {
      url: `${SITE}/estimate_request_landing_page`,
      priority: 0.5,
      changeFrequency: "monthly",
    },

    { url: `${SITE}/book-a-call`, priority: 0.5, changeFrequency: "monthly" },
    // /book-a-call/confirmed is deliberately absent: the page declares
    // robots noindex, as every confirmation page does, and submitting a
    // noindex URL here would only earn a Search Console warning.
    {
      url: `${SITE}/delete_account`,
      priority: 0.3,
      changeFrequency: "yearly",
    },
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
