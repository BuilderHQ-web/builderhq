import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Landing } from "@/components/landing/v2/landing";
import { resolveCtaLinks } from "@/components/landing/cta-links";
import type { Role } from "@/components/landing/v2/content";

/**
 * /for/builders · /for/architects — the landing page with the lens
 * pre-selected and the role label already docked. Campaign traffic
 * (builder ads, the architect outreach email) lands directly on its
 * own story, and each page is independently indexable.
 */

const AUDIENCES: Record<string, { role: Role; title: string; description: string }> = {
  builders: {
    role: "builder",
    title: "BuilderHQ for builders: price real work, not cold leads",
    description:
      "Full plans up front, owners ready to build, and never more than three builders per project. Browse free, pay only to tender. No commission, no lead packs.",
  },
  architects: {
    role: "architect",
    title: "BuilderHQ for architects: the Preferred Architect Network",
    description:
      "A hand picked network of practices we feature, promote and refer to homeowners and builders. No fees, no contracts, no catch.",
  },
  "finance-brokers": {
    role: "finance",
    title: "BuilderHQ for finance brokers: the Preferred Finance Partner Program",
    description:
      "Warm introductions to homeowners planning a build, the moment they ask us for finance. No fees, no exclusivity, no lead charges.",
  },
};

export function generateStaticParams() {
  return Object.keys(AUDIENCES).map((audience) => ({ audience }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ audience: string }>;
}): Promise<Metadata> {
  const { audience } = await params;
  const entry = AUDIENCES[audience];
  if (!entry) return {};
  return {
    title: entry.title,
    description: entry.description,
    alternates: { canonical: `/for/${audience}` },
  };
}

export default async function ForAudiencePage({
  params,
}: {
  params: Promise<{ audience: string }>;
}) {
  const { audience } = await params;
  const entry = AUDIENCES[audience];
  if (!entry) notFound();

  const cta = await resolveCtaLinks();
  const authedHref = /^\/(owner|builder|admin)/.test(cta.primary.href)
    ? cta.primary.href
    : null;

  return (
    <Landing initialRole={entry.role} initialDocked authedHref={authedHref} />
  );
}
