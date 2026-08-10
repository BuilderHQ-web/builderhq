import type { Metadata } from "next";

import { MarketingPageShell } from "@/components/landing/page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { partnerCollectionGraph } from "@/lib/seo";

import { PARTNERS } from "./partners-data";
import { PartnersRegister } from "./partner-roster";

const DESCRIPTION =
  "The building designers, builders and finance brokers BuilderHQ knows well enough to introduce. Personally invited, work we know, and no paid placements.";

export const metadata: Metadata = {
  title: "Preferred Partners",
  description: DESCRIPTION,
  alternates: { canonical: "/partners" },
};

export default function PartnersPage() {
  const partners = PARTNERS.filter((p) => !p.draft);
  return (
    <MarketingPageShell
      kicker="Our Partners"
      title="The people we put our name behind."
      sub="Building designers, builders and finance brokers we know well enough to introduce. We reach out to each one personally, we understand their work, and no one pays to be here. When we point you to someone, it is because we would happily use them ourselves."
    >
      <JsonLd
        data={partnerCollectionGraph({
          path: "/partners",
          name: "BuilderHQ Preferred Partners",
          description: DESCRIPTION,
          partners,
        })}
      />
      <PartnersRegister active="all" />
    </MarketingPageShell>
  );
}
