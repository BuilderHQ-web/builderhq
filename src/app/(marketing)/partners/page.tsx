import type { Metadata } from "next";
import { resolveNavAuthedHref } from "@/components/landing/cta-links";

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

export default async function PartnersPage() {
  const navAuthedHref = await resolveNavAuthedHref();
  const partners = PARTNERS.filter((p) => !p.draft);
  return (
    <MarketingPageShell
      authedHref={navAuthedHref}
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
      {/* Where the register sits relative to the platform. Being a
          Preferred Partner is an introduction, not an entry ticket. */}
      <p className="mb-8 max-w-[62ch] text-[16px] leading-[1.65] text-text-muted">
        Preferred Partners are separate from tendering. Practices on this
        register are people we would happily use ourselves; any practice can
        run tender rounds on BuilderHQ, on the register or not.
      </p>
      <PartnersRegister active="all" />
    </MarketingPageShell>
  );
}
