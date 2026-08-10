import type { Metadata } from "next";
import { resolveNavAuthedHref } from "@/components/landing/cta-links";

import { MarketingPageShell } from "@/components/landing/page-shell";

import { resolvePrimaryCta } from "../_components/cta";
import {
  CardGrid,
  FaqList,
  HeroActions,
  PageClose,
  ProseBlock,
  SceneFigure,
  Section,
} from "../_components/sections";

/**
 * /for/architects, the practice's argument in full.
 *
 * Copy is final per 85a-docs/repositioning-plan.md Part 5B. Three
 * framing rules govern every word on this page and are not negotiable:
 * it never suggests practices currently do this badly, it never
 * mentions referrals or commissions of any kind, and it holds open
 * that not every practice runs a formal tender. The hero's opening
 * line carries all three and stays exactly as written.
 */

export const metadata: Metadata = {
  title:
    "BuilderHQ for architects and building designers: run the round for your client",
  description:
    "Run structured tenders for your clients, with your builders or ours. A cited scope of works, comparable tenders, and an evaluation your practice can put its name to.",
  alternates: { canonical: "/for/architects" },
};

const ROUND_TYPES = [
  {
    title: "Private rounds",
    body: "Invite the builders you trust. They take part at no cost, and the round never appears anywhere public.",
  },
  {
    title: "Open rounds",
    body: "Open the spots to verified builders on BuilderHQ, checked against the business register before they see a thing.",
  },
  {
    title: "Both",
    body: "Invite your builders and open the remaining spots. Every tender arrives in the same form either way.",
  },
];

const FAQS = [
  {
    q: "Do we have to use BuilderHQ’s builders?",
    a: "No. You can open the round to verified builders on BuilderHQ, invite builders you already know, or both. Invited builders take part at no cost.",
  },
  {
    q: "What does it cost the practice?",
    a: "Nothing. Rounds are free to run, and builders you invite take part free. Builders from the open network pay a one off fee for their spot.",
  },
  {
    q: "Who owns the relationship with the client?",
    a: "You do. The round is yours, the evaluation carries your practice’s name, and BuilderHQ never contacts your client about their project except through the round you run.",
  },
];

export default async function ArchitectsPage() {
  const navAuthedHref = await resolveNavAuthedHref();
  const primary = await resolvePrimaryCta({
    label: "Run a round for your client",
    href: "/signup?role=architect",
  });

  return (
    <MarketingPageShell
      authedHref={navAuthedHref}
      kicker="For architects and building designers"
      title="Run the round for your client, your way."
      sub="Some practices run a full tender, some hand over three names, most sit somewhere in between. BuilderHQ gives every version of that job the same machinery: a cited scope of works, comparable tenders, and an evaluation you can put your name to."
    >
      <HeroActions primary={primary} secondary={{ label: "Talk to us", href: "/book-a-call" }} />

      <SceneFigure
        scene="matrix"
        caption="The scope matrix: every line of the scope against every tender on the round."
      />

      <Section title="The tender, without the tender admin.">
        <ProseBlock
          paragraphs={[
            "Upload the issued set. The platform writes the scope of works from your documents, every line tied to a sheet and page. Builders price that scope line by line and answer the same structured questions, so the returns come back comparable without you building the comparison yourself.",
          ]}
        />
      </Section>

      <Section title="However you usually work.">
        <CardGrid items={ROUND_TYPES} />
      </Section>

      <Section title="An evaluation your client can hold.">
        <ProseBlock
          paragraphs={[
            "Every evaluation is prepared by your practice with BuilderHQ. Six published dimensions, every score showing its working, every difference between tenders pulled out line by line, and a pre decision agenda of the questions worth putting to builders. When your client asks why, the answer is on the page.",
            "Share the round with your client as a viewer or a decision maker. Every action on the round is recorded with the name of the person who took it.",
          ]}
        />
      </Section>

      <Section title="Everything on the file.">
        <ProseBlock
          paragraphs={[
            "Questions, answers, addenda and decisions stay on the round. If the scope changes, a numbered addendum goes to every builder and every price answers to it. Months later, the whole round reads exactly as it happened.",
          ]}
        />
      </Section>

      <Section title="Frequently asked questions">
        <FaqList items={FAQS} />
      </Section>

      <PageClose title="The next round is the easiest one to try." cta={primary} />
    </MarketingPageShell>
  );
}
