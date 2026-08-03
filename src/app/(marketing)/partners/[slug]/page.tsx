import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketingPageShell } from "@/components/landing/page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { partnerGraph } from "@/lib/seo";

import { PARTNERS, getPartner } from "../partners-data";
import { PartnerProfileSections, partnerHeaderProps } from "../partner-profile";

/**
 * /partners/[slug] — a Preferred Partner's public page.
 *
 * Draft partners (people we are still onboarding) are not reachable here;
 * they are reviewed via the private /partners/preview/[slug] route until
 * they go live.
 */

export function generateStaticParams() {
  return PARTNERS.filter((p) => !p.draft).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const partner = getPartner(slug);
  if (!partner || partner.draft) return {};

  const title = `${partner.name} · Preferred Partner`;
  const url = `/partners/${slug}`;

  // Note: the share image comes from the sibling opengraph-image.tsx
  // (a branded card with name, role, location and rating). We do not
  // set openGraph.images here, because an explicit value would override
  // that generated card.
  return {
    title,
    description: partner.tagline,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      title,
      description: partner.tagline,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: partner.tagline,
    },
  };
}

export default async function PartnerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const partner = getPartner(slug);
  if (!partner || partner.draft) notFound();

  return (
    <MarketingPageShell {...partnerHeaderProps(partner)}>
      <JsonLd data={partnerGraph(partner)} />
      <PartnerProfileSections partner={partner} />
    </MarketingPageShell>
  );
}
