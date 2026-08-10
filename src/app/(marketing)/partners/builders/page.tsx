import type { Metadata } from "next";
import { resolveNavAuthedHref } from "@/components/landing/cta-links";

import { MarketingPageShell } from "@/components/landing/page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { partnerCollectionGraph } from "@/lib/seo";

import { PARTNERS } from "../partners-data";
import { PartnersRegister } from "../partner-roster";

const DESCRIPTION =
  "The builders in the BuilderHQ Preferred Partner network. Personally invited, recent work we have looked at, and free for homeowners to be introduced to.";

export const metadata: Metadata = {
  title: "Builder partners",
  description: DESCRIPTION,
  alternates: { canonical: "/partners/builders" },
};

export default async function BuilderPartnersPage() {
  const navAuthedHref = await resolveNavAuthedHref();
  const partners = PARTNERS.filter((p) => !p.draft && p.kind === "builder");
  return (
    <MarketingPageShell
      authedHref={navAuthedHref}
      kicker="Our Partners · Builder partners"
      title="Builders worth an introduction."
      sub="Builders we have met, whose recent work we have looked at, and who we are glad to put in front of an owner planning a build. No fees, either side."
    >
      <JsonLd
        data={partnerCollectionGraph({
          path: "/partners/builders",
          name: "BuilderHQ Builder partners",
          description: DESCRIPTION,
          partners,
        })}
      />
      <PartnersRegister active="builder" />
    </MarketingPageShell>
  );
}
