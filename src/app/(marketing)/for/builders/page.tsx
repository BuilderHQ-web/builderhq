import type { Metadata } from "next";
import { resolveNavAuthedHref } from "@/components/landing/cta-links";
import Link from "next/link";

import { MarketingPageShell } from "@/components/landing/page-shell";

import { resolvePrimaryCta } from "../_components/cta";
import {
  FaqList,
  HeroActions,
  PageClose,
  ProseBlock,
  SceneFigure,
  Section,
} from "../_components/sections";

/**
 * /for/builders, the builder's argument in full.
 *
 * Copy is final per 85a-docs/repositioning-plan.md Part 5C. The
 * levelling benefit is expressed only through the disclosure
 * principle: an honest excluded is never read worse than a vague
 * inclusion. Nothing on this page disparages another builder, and
 * nothing on it implies anyone is undercutting anyone.
 */

export const metadata: Metadata = {
  title: "BuilderHQ for builders: price real work on a real scope",
  description:
    "Tender on residential projects with a line by line scope of works already prepared. Priced like for like, read on more than the bottom line, from $49 per project.",
  alternates: { canonical: "/for/builders" },
};

const FAQS = [
  {
    q: "What does it cost?",
    a: (
      <>
        Browsing is free. Taking a spot on a round is a one off fee from $49 to $199 by
        project type, and invited rounds are free. The full table is on the{" "}
        <Link
          href="/pricing"
          className="text-accent-light underline underline-offset-2 transition-colors hover:text-text"
        >
          pricing page
        </Link>
        .
      </>
    ),
  },
  {
    q: "How many builders per round?",
    a: "Rounds are capped. You are never pricing against a crowd, and the cap is shown before you take a spot.",
  },
  {
    q: "What if the scope changes mid round?",
    a: "A numbered addendum is issued to every builder on the round, and every price answers to the same change. Nothing moves quietly.",
  },
  {
    q: "Do I have to use the platform’s scope?",
    a: "Yes, and that is the point. Every builder prices the same list, so your price is compared with like for like. Anything you would price differently has a place to say so, on the record.",
  },
];

export default async function BuildersPage() {
  const navAuthedHref = await resolveNavAuthedHref();
  const primary = await resolvePrimaryCta({
    label: "Browse open rounds",
    href: "/signup?role=builder",
  });

  return (
    <MarketingPageShell
      authedHref={navAuthedHref}
      kicker="For builders"
      title="Price real work, on a real scope."
      sub="Every project on BuilderHQ arrives with a scope of works already prepared from the documents, line by line. You price the same list as everyone else on the round, and your tender is read on more than the bottom line."
    >
      <HeroActions
        primary={primary}
        facts={["Free to browse", "From $49 to tender", "Never a commission"]}
      />

      <SceneFigure
        scene="marking"
        caption="Marking the scope: the same list, line by line, for every builder on the round."
      />

      <Section title="No leads. Rounds.">
        <ProseBlock
          paragraphs={[
            "A project here is not a phone number sold six times. It is documents, a prepared scope, a capped round, and an owner who has already approved what you are pricing. You see the suburb, the scope and the documents before you commit a dollar.",
          ]}
        />
      </Section>

      <Section title="Like for like works both ways.">
        <ProseBlock
          paragraphs={[
            "Every builder on the round prices the same scope and answers the same questions. An honest excluded is never read worse than a vague inclusion, and disclosure improves your tender’s read, because the platform’s job is to show what stands behind each price. Careful pricing finally shows up as what it is.",
          ]}
        />
      </Section>

      <Section title="Your tender shows your work.">
        <ProseBlock
          paragraphs={[
            "Ninety three structured questions cover what the price includes, how firm it is, your programme, your people and your record. Owners see capability, not just totals. Your tender carries a reference and a public verification page, and the exact document set you priced stays on the record, revision by revision.",
          ]}
        />
      </Section>

      <Section title="Simple terms, in the open.">
        <ProseBlock
          paragraphs={[
            "Browsing is free. Taking a spot on a round is a one off fee from $49 to $199 by project type. Rounds are capped, invited rounds are free, and BuilderHQ takes no commission on work you win. The contract is between you and the client.",
          ]}
        />
      </Section>

      <Section title="Frequently asked questions">
        <FaqList items={FAQS} />
      </Section>

      <PageClose title="The next round is open." cta={primary} />
    </MarketingPageShell>
  );
}
