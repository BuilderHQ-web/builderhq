import type { Metadata } from "next";
import { resolveNavAuthedHref } from "@/components/landing/cta-links";

import { MarketingPageShell } from "@/components/landing/page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { partnerCollectionGraph } from "@/lib/seo";

import { PARTNERS } from "../partners-data";
import { PartnersRegister } from "../partner-roster";

const DESCRIPTION =
  "The building designers and architects in the BuilderHQ Preferred Partner network. Personally invited, work we know, and free for homeowners to be introduced to.";

export const metadata: Metadata = {
  title: "Design partners",
  description: DESCRIPTION,
  alternates: { canonical: "/partners/architects" },
};

export default async function ArchitectPartnersPage() {
  const navAuthedHref = await resolveNavAuthedHref();
  const partners = PARTNERS.filter((p) => !p.draft && p.kind === "architect");
  return (
    <MarketingPageShell
      authedHref={navAuthedHref}
      kicker="Our Partners · Design partners"
      title="Design partners worth an introduction."
      sub="Building designers and architects doing considered residential work across Melbourne. We feature them, we refer them, and we introduce them to homeowners planning a build. No fees, either side."
    >
      <JsonLd
        data={partnerCollectionGraph({
          path: "/partners/architects",
          name: "BuilderHQ Design partners",
          description: DESCRIPTION,
          partners,
        })}
      />
      <PartnersRegister active="architect" />
    </MarketingPageShell>
  );
}
