import type { Metadata } from "next";

import { MarketingPageShell } from "@/components/landing/page-shell";

import { PartnersRegister } from "./partner-roster";

export const metadata: Metadata = {
  title: "Preferred Partners",
  description:
    "The building designers and finance brokers BuilderHQ knows well enough to introduce. Personally invited, work we know, and no paid placements.",
  alternates: { canonical: "/partners" },
};

export default function PartnersPage() {
  return (
    <MarketingPageShell
      kicker="Our Partners"
      title="The people we put our name behind."
      sub="Building designers and finance brokers we know well enough to introduce. We reach out to each one personally, we understand their work, and no one pays to be here. When we point you to someone, it is because we would happily use them ourselves."
    >
      <PartnersRegister active="all" />
    </MarketingPageShell>
  );
}
