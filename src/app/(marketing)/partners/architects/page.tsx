import type { Metadata } from "next";

import { MarketingPageShell } from "@/components/landing/page-shell";

import { PartnersRegister } from "../partner-roster";

export const metadata: Metadata = {
  title: "Architecture partners",
  description:
    "The architecture practices in the BuilderHQ Preferred Partner network. Personally invited, work we know, and free for homeowners to be introduced to.",
  alternates: { canonical: "/partners/architects" },
};

export default function ArchitectPartnersPage() {
  return (
    <MarketingPageShell
      kicker="Our Partners · Architects"
      title="Architects worth an introduction."
      sub="Practices doing considered residential work across Melbourne and Canberra. We feature them, we refer them, and we introduce them to homeowners planning a build. No fees, either side."
    >
      <PartnersRegister active="architect" />
    </MarketingPageShell>
  );
}
