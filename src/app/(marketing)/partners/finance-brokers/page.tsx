import type { Metadata } from "next";

import { MarketingPageShell } from "@/components/landing/page-shell";

import { PartnersRegister } from "../partner-roster";

export const metadata: Metadata = {
  title: "Finance partners",
  description:
    "The finance brokers in the BuilderHQ Preferred Partner network. Construction finance specialists we know and introduce to homeowners planning a build.",
  alternates: { canonical: "/partners/finance-brokers" },
};

export default function FinancePartnersPage() {
  return (
    <MarketingPageShell
      kicker="Our Partners · Finance brokers"
      title="Brokers who know construction."
      sub="Finance partners with real experience in construction lending, and clients who speak well of them. We introduce them to homeowners the moment finance comes up. No fees, no exclusivity."
    >
      <PartnersRegister active="finance" />
    </MarketingPageShell>
  );
}
