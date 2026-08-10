import type { Metadata } from "next";
import { resolveNavAuthedHref } from "@/components/landing/cta-links";

import { MarketingPageShell } from "@/components/landing/page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { partnerCollectionGraph } from "@/lib/seo";

import { PARTNERS } from "../partners-data";
import { PartnersRegister } from "../partner-roster";

const DESCRIPTION =
  "The finance brokers in the BuilderHQ Preferred Partner network. Construction finance specialists we know and introduce to homeowners planning a build.";

export const metadata: Metadata = {
  title: "Finance partners",
  description: DESCRIPTION,
  alternates: { canonical: "/partners/finance-brokers" },
};

export default async function FinancePartnersPage() {
  const navAuthedHref = await resolveNavAuthedHref();
  const partners = PARTNERS.filter((p) => !p.draft && p.kind === "finance");
  return (
    <MarketingPageShell
      authedHref={navAuthedHref}
      kicker="Our Partners · Finance brokers"
      title="Brokers who know construction."
      sub="Finance partners with real experience in construction lending, and clients who speak well of them. We introduce them to homeowners the moment finance comes up. No fees, no exclusivity."
    >
      <JsonLd
        data={partnerCollectionGraph({
          path: "/partners/finance-brokers",
          name: "BuilderHQ Finance partners",
          description: DESCRIPTION,
          partners,
        })}
      />
      <PartnersRegister active="finance" />
    </MarketingPageShell>
  );
}
