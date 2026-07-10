import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketingPageShell } from "@/components/landing/page-shell";

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
  return {
    title: `${partner.name} · Preferred Partner`,
    description: partner.tagline,
    alternates: { canonical: `/partners/${slug}` },
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
      <PartnerProfileSections partner={partner} />
    </MarketingPageShell>
  );
}
