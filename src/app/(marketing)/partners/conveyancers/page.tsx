import type { Metadata } from "next";

import { MarketingPageShell } from "@/components/landing/page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { partnerCollectionGraph } from "@/lib/seo";

import { PARTNERS } from "../partners-data";
import { PartnersRegister } from "../partner-roster";

const DESCRIPTION =
  "The conveyancers in the BuilderHQ Preferred Partner network. Licensed conveyancers who review the contract, the Section 32 and the title before a client commits to a site.";

export const metadata: Metadata = {
  title: "Conveyancing partners",
  description: DESCRIPTION,
  alternates: { canonical: "/partners/conveyancers" },
};

export default function ConveyancingPartnersPage() {
  const partners = PARTNERS.filter((p) => !p.draft && p.kind === "conveyancer");
  return (
    <MarketingPageShell
      kicker="Our Partners · Conveyancers"
      title="Read the land before you buy it."
      sub="A covenant or an overlay can decide whether the home you are planning is legally possible on a block. These are the conveyancers we introduce to owners and developers before an offer goes in, not after. No fees, no exclusivity."
    >
      <JsonLd
        data={partnerCollectionGraph({
          path: "/partners/conveyancers",
          name: "BuilderHQ Conveyancing partners",
          description: DESCRIPTION,
          partners,
        })}
      />
      <PartnersRegister active="conveyancer" />
    </MarketingPageShell>
  );
}
