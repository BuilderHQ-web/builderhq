/**
 * Structured-data builders for BuilderHQ (schema.org / JSON-LD).
 *
 * These pure functions turn our own data into the machine-readable
 * graph that powers three things at once:
 *   - SEO: rich results in Google (breadcrumbs, entity panels).
 *   - AEO: the facts answer engines lift into snippets and voice.
 *   - GEO: the clean entity descriptions generative engines (ChatGPT,
 *     Perplexity, Gemini, Claude) cite when they answer about us or
 *     our partners.
 *
 * Emit the returned object through <JsonLd> (components/seo/json-ld).
 * Everything here is first-party data, presented honestly: ratings
 * are attributed to their source, and we never assert a credential we
 * do not hold.
 */

import type { Partner, PartnerKind } from "@/app/(marketing)/partners/partners-data";

export const SITE = "https://builderhq.com.au";

export const SITE_NAME = "BuilderHQ";

export const SITE_DESCRIPTION =
  "BuilderHQ is Australia's residential construction tendering platform. Homeowners and developers list their project once, with full architectural plans, and up to three verified builders price it on the same scope, so quotes are comparable like for like.";

/** Absolute URL for a site-relative path or asset. */
export function abs(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE}${path.startsWith("/") ? "" : "/"}${path}`;
}

/* ── the site entity: Organization + WebSite ────────────────────────── */

/**
 * The whole-site graph, emitted on every marketing page. Two nodes:
 * the Organization (the entity a Knowledge Panel and a generative
 * engine anchor to) and the WebSite it publishes. `@id`s let other
 * pages reference these without repeating them.
 */
export function siteGraph(): Record<string, unknown> {
  const organization = {
    "@type": "Organization",
    "@id": `${SITE}/#organization`,
    name: SITE_NAME,
    legalName: SITE_NAME,
    url: SITE,
    logo: {
      "@type": "ImageObject",
      url: abs("/icon.png"),
      width: 512,
      height: 512,
    },
    image: abs("/icon.png"),
    description: SITE_DESCRIPTION,
    email: "info@builderhq.com.au",
    slogan: "Upload once. Compare like for like. Build.",
    areaServed: { "@type": "Country", name: "Australia" },
    foundingLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Melbourne",
        addressRegion: "VIC",
        addressCountry: "AU",
      },
    },
    knowsAbout: [
      "Residential construction tendering",
      "Comparing builder quotes",
      "Home building in Australia",
      "Renovations and extensions",
      "Verified residential builders",
      "Construction finance",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "info@builderhq.com.au",
      telephone: "+61416926380",
      areaServed: "AU",
      availableLanguage: ["English"],
    },
  };

  const website = {
    "@type": "WebSite",
    "@id": `${SITE}/#website`,
    url: SITE,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "en-AU",
    publisher: { "@id": `${SITE}/#organization` },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [organization, website],
  };
}

/* ── partners ───────────────────────────────────────────────────────── */

/** schema.org type per partner kind. Building designers and architects
 *  map to ProfessionalService (accurate whether or not they are a
 *  registered architect); finance brokers to FinancialService;
 *  builders to GeneralContractor. */
const KIND_TYPE: Record<PartnerKind, string> = {
  architect: "ProfessionalService",
  builder: "GeneralContractor",
  finance: "FinancialService",
};

const KIND_REGISTER: Record<
  PartnerKind,
  { path: string; label: string }
> = {
  architect: { path: "/partners/architects", label: "Design partners" },
  builder: { path: "/partners/builders", label: "Build partners" },
  finance: { path: "/partners/finance-brokers", label: "Finance partners" },
};

function partnerImage(partner: Partner): string | undefined {
  const src = partner.portrait ?? partner.logo ?? partner.institution?.logo;
  return src ? abs(src) : undefined;
}

/**
 * A single partner as a local-business entity, with everything an
 * engine needs to place and cite them: where they are, what they do,
 * who they are elsewhere on the web (sameAs), and the Google rating,
 * attributed to Google rather than claimed as our own.
 *
 * Note on ratings: Google generally suppresses star rich-snippets for
 * a rating on a page about the business itself ("self-serving"), so we
 * do not expect SERP stars from this. The markup still feeds answer
 * and generative engines, which do read and repeat it.
 */
function partnerEntity(partner: Partner): Record<string, unknown> {
  const url = `${SITE}/partners/${partner.slug}`;
  const sameAs = [
    partner.website,
    partner.instagram,
    partner.facebook,
    partner.linkedin,
  ].filter((x): x is string => Boolean(x));

  const states =
    partner.states && partner.states.length > 0
      ? partner.states
      : [partner.state];

  const entity: Record<string, unknown> = {
    "@type": KIND_TYPE[partner.kind],
    "@id": `${url}#business`,
    name: partner.name,
    description: partner.tagline,
    url,
    address: {
      "@type": "PostalAddress",
      addressLocality: partner.suburb,
      addressRegion: partner.state,
      addressCountry: "AU",
    },
    areaServed: states.map((s) => ({
      "@type": "AdministrativeArea",
      name: s,
    })),
    knowsAbout: partner.disciplines,
    memberOf: {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: SITE_NAME,
    },
    isPartOf: { "@id": `${SITE}/partners#collection` },
  };

  const image = partnerImage(partner);
  if (image) entity.image = image;
  if (sameAs.length > 0) entity.sameAs = sameAs;
  if (partner.institution?.name) {
    entity.parentOrganization = {
      "@type": "Organization",
      name: partner.institution.name,
    };
  }
  if (partner.services && partner.services.length > 0) {
    entity.makesOffer = partner.services.map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s },
    }));
  }
  if (partner.google) {
    entity.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: partner.google.rating,
      reviewCount: partner.google.reviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return entity;
}

/** Breadcrumb for a partner profile: Home › Preferred Partners ›
 *  {Design|Finance} partners › {Name}. */
function partnerBreadcrumb(partner: Partner): Record<string, unknown> {
  const reg = KIND_REGISTER[partner.kind];
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      {
        "@type": "ListItem",
        position: 2,
        name: "Preferred Partners",
        item: `${SITE}/partners`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: reg.label,
        item: `${SITE}${reg.path}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: partner.name,
        item: `${SITE}/partners/${partner.slug}`,
      },
    ],
  };
}

/** Full graph for a partner profile page: the business entity plus its
 *  breadcrumb, in one block. */
export function partnerGraph(partner: Partner): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [partnerEntity(partner), partnerBreadcrumb(partner)],
  };
}

/**
 * The register (or a filtered register) as a CollectionPage listing
 * its partners, so an engine can enumerate "who is in the network".
 */
export function partnerCollectionGraph(opts: {
  path: string;
  name: string;
  description: string;
  partners: Partner[];
}): Record<string, unknown> {
  const url = `${SITE}${opts.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name: opts.name,
    description: opts.description,
    isPartOf: { "@id": `${SITE}/#website` },
    about: { "@id": `${SITE}/#organization` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: opts.partners.length,
      itemListElement: opts.partners.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE}/partners/${p.slug}`,
        name: p.name,
      })),
    },
  };
}

/* ── FAQ ────────────────────────────────────────────────────────────── */

export type FaqItem = { q: string; a: string };

/** FAQPage from a set of question/answer pairs. The answer strings are
 *  the plain-text mirror of what the page shows, which is what answer
 *  engines quote. */
export function faqPageGraph(items: FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}
