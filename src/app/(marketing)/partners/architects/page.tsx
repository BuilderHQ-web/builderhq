import type { Metadata } from "next";

import { MarketingPageShell } from "@/components/landing/page-shell";

import { PartnersRegister } from "../partner-roster";

export const metadata: Metadata = {
  title: "Design partners",
  description:
    "The building designers and architects in the BuilderHQ Preferred Partner network. Personally invited, work we know, and free for homeowners to be introduced to.",
  alternates: { canonical: "/partners/architects" },
};

export default function ArchitectPartnersPage() {
  return (
    <MarketingPageShell
      kicker="Our Partners · Design partners"
      title="Design partners worth an introduction."
      sub="Building designers and architects doing considered residential work across Melbourne. We feature them, we refer them, and we introduce them to homeowners planning a build. No fees, either side."
    >
      <PartnersRegister active="architect" />
    </MarketingPageShell>
  );
}
