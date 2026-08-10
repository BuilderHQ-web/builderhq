import type { Metadata } from "next";
import { resolveNavAuthedHref } from "@/components/landing/cta-links";

import { MarketingPageShell } from "@/components/landing/page-shell";
import { STANDARDS } from "@/components/landing/v2/content";

import { resolvePrimaryCta } from "../_components/cta";
import {
  CardGrid,
  FaqList,
  HeroActions,
  NumberedList,
  PageClose,
  ProseBlock,
  SceneFigure,
  Section,
  StepList,
} from "../_components/sections";

/**
 * /for/homeowners, the owner's argument in full.
 *
 * The home page speaks to everyone; this page re-argues the whole
 * product for the person who will choose a builder once. Copy is final
 * per 85a-docs/repositioning-plan.md Part 5A and is not to be reworded
 * without going back to that document.
 */

export const metadata: Metadata = {
  title: "BuilderHQ for homeowners: tender your build properly",
  description:
    "Upload the plans, approve a line by line scope of works, and compare builders’ tenders that finally measure the same things. Free for homeowners.",
  alternates: { canonical: "/for/homeowners" },
};

/** The problem in the owner's own terms: incomparable documents, the
 *  gap that becomes a variation, and the round run by phone. */
const PROBLEM = [
  "Three builders price your home and three documents come back. Different formats, different inclusions, different readings of the same drawings. Putting them side by side tells you nothing when the columns measure different things.",
  "One builder allows for the retaining wall, one assumes it, one leaves it out. You cannot see which, so the lowest number wins and the wall arrives later as a variation. Whatever was never priced is still yours to pay for.",
  "Then the round becomes phone calls. You ask one builder a question and forget to ask the other two, the answers come back by text, by email and in a car park on site, and nothing is written down in one place. By the time you decide, the record of what you were promised is scattered.",
];

/** The four steps of a round, told to the person who owns it. Headlines
 *  are the home page's, so the two surfaces stay one story. */
const STEPS = [
  {
    n: "01",
    step: "The scope of works",
    headline: "We read the documents and write the scope.",
    body: "Upload your drawings and reports. BuilderHQ reads them and writes your scope of works in plain English, line by line, with every line tied to the document and page it came from. Our team reviews it, and nothing goes live until you approve it. You approve six things at most. Everything that is the builders’ ordinary work is already handled.",
  },
  {
    n: "02",
    step: "The same list, priced",
    headline: "Every builder prices the same list.",
    body: "Verified builders take a spot on your round and walk your scope line by line, marking every item included, a provisional sum, or excluded. Open the round to our verified network, invite the builders you already trust, or do both. Either way, everyone is pricing the same documents and the same list.",
  },
  {
    n: "03",
    step: "Structured tenders",
    headline: "Tenders arrive as answers, not PDFs.",
    body: "Each tender comes back as the builder’s answers under signature: the price and what stands behind it, what is firm, what is allowed for, what is excluded, the programme, and who is doing the work. The same structured questions go to every builder on your round, so nothing important goes unasked.",
  },
  {
    n: "04",
    step: "The comparison",
    headline: "Compare, question, decide.",
    body: "Every tender is scored on six published dimensions, and every score shows its working. Anything the tenders treat differently is pulled out line by line, with the question worth asking beside it. You put those questions to builders on the record, and when you award, the contract is direct between you and your builder. No commission, either side.",
  },
];

const ARTIFACTS = [
  {
    title: "The scope of works",
    body: "Line by line, in plain English, each line traceable to your documents. Approved by you before anyone prices it.",
  },
  {
    title: "The tenders",
    body: "Every builder’s answers under signature. What is firm, what is allowed for, what is excluded, and who does the work.",
  },
  {
    title: "The comparison",
    body: "Six published dimensions, every score showing its working, every difference between tenders pulled out in the open, and a list of the questions worth asking before you decide.",
  },
];

/** Rules 1, 3, 4 and 5 of the six the platform runs on: the four an
 *  owner can check for themselves. Read from the home page's content
 *  spine so the two surfaces cannot drift apart. */
const RULES = STANDARDS.rules.filter((_, i) => i !== 1 && i !== 5);

const FAQS = [
  {
    q: "Is it really free for homeowners?",
    a: "Yes. Builders pay a one off fee to take a spot on a round, between $49 and $199 depending on the project type. Owners and the practices that run rounds never pay, and nobody pays commission.",
  },
  {
    q: "Who writes the scope of works?",
    a: "BuilderHQ reads your documents and drafts it, line by line, each line tied to the page it came from. Our team reviews it, and you approve it before it goes live. If the documents do not answer something, it is put to you as a question, never guessed.",
  },
  {
    q: "Do I have to use builders from your network?",
    a: "No. You can open the round to verified builders on BuilderHQ, invite builders you already know, or both. Invited builders take part at no cost.",
  },
  {
    q: "Does BuilderHQ pick the winner?",
    a: "No. It scores, flags and compares, and every score shows its working. The decision is yours, and the contract you sign is directly with your builder.",
  },
  {
    q: "What if my documents are not complete?",
    a: "The scope says so, honestly. Lines the documents do not fully answer are marked, and if the pack cannot support a fixed price round, it says budget only and tells you why in plain English.",
  },
];

export default async function HomeownersPage() {
  const navAuthedHref = await resolveNavAuthedHref();
  const primary = await resolvePrimaryCta({
    label: "Start your project",
    href: "/signup?role=owner",
  });

  return (
    <MarketingPageShell
      authedHref={navAuthedHref}
      kicker="For homeowners"
      title="The biggest decision of the build, made on evidence."
      sub="You will choose the builder once. BuilderHQ makes sure that when you do, you know exactly what each price includes, what it leaves out, and what stands behind it."
    >
      <HeroActions primary={primary} secondary={{ label: "See pricing", href: "/pricing" }} />

      <SceneFigure
        scene="round"
        caption="Three tenders on one round, scored on the same six dimensions."
      />

      <Section title="You should not need to be a quantity surveyor to compare quotes.">
        <ProseBlock paragraphs={PROBLEM} />
      </Section>

      <Section title="How it works for you.">
        <StepList steps={STEPS} />
      </Section>

      <Section title="What lands on your desk.">
        <CardGrid items={ARTIFACTS} />
      </Section>

      <Section
        title={STANDARDS.h2}
        lede="Rules the platform runs on. Not policies on a page somewhere. Behaviour you can check."
      >
        <NumberedList items={RULES} />
      </Section>

      <Section title="Frequently asked questions">
        <FaqList items={FAQS} />
      </Section>

      <PageClose title="Your build starts with your plans." cta={primary} />
    </MarketingPageShell>
  );
}
