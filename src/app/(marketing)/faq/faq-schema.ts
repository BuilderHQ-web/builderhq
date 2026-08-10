import type { FaqItem } from "@/lib/seo";

/**
 * The FAQ, in one place.
 *
 * This file is the single source for /faq. `page.tsx` renders these
 * categories, and `FAQ_SCHEMA_ITEMS` below is derived from the same
 * array for the FAQPage structured data. The page and the schema can no
 * longer drift, because there is only one copy of the words.
 *
 * An answer is a list of parts so a link can sit inside a sentence and
 * still flatten to clean plain text for answer engines: a string is
 * rendered as text, an object is rendered as a link, and the schema
 * mirror joins every part's text together in order.
 *
 * Voice rules: no em dashes, no exclamation marks, no hype words, curly
 * apostrophes, short sentences, plain Australian English, sentence case
 * headings.
 *
 * Claims rule: every answer here must stay inside the verified list in
 * 85a-docs/marketing-recon-brief.md section 2. No accuracy, speed or
 * volume figures. No blanket licence verification claim: ABN is checked
 * nationally, licences against the state register where one connects and
 * by our team where one does not. Insurance is declared under signature,
 * never described as verified. The platform never picks a winner.
 */

/** A run of answer text, or a link whose label is part of the sentence. */
export type AnswerPart = string | { text: string; href: string };

export interface FaqQuestion {
  q: string;
  a: AnswerPart[];
}

export interface FaqCategory {
  /** Anchor id, used by the sticky category nav. */
  id: string;
  label: string;
  questions: FaqQuestion[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "getting-started",
    label: "Getting started",
    questions: [
      {
        q: "What does BuilderHQ actually do?",
        a: [
          "It runs the tender. It writes the scope of works from your documents, has every builder price that same scope and answer the same questions, and turns the tenders into a scored, side by side comparison. You make the decision, on the record.",
        ],
      },
      {
        q: "Who is BuilderHQ for?",
        a: [
          "Homeowners and developers running their own build, architects and building designers running rounds for clients, and residential builders tendering for work. The work is Australian residential construction: new homes, extensions, renovations and multi dwelling projects.",
        ],
      },
      {
        q: "What does it cost?",
        a: [
          "Running a round is free. Homeowners, developers and the practices that run rounds for their clients pay nothing, and nobody pays commission on the contract. Builders pay a one off fee to take a spot on a round, between $49 and $199 depending on the project type. The four prices are on the ",
          { text: "pricing page", href: "/pricing" },
          ".",
        ],
      },
      {
        q: "What do I need to start?",
        a: [
          "Drawings. The more complete the documents, the stronger the scope. If the pack cannot support a fixed price round, the scope says budget only and explains why.",
        ],
      },
    ],
  },
  {
    id: "homeowners",
    label: "For homeowners",
    questions: [
      {
        q: "Who writes the scope of works?",
        a: [
          "BuilderHQ reads your documents and drafts it, line by line, each line tied to the page it came from. Our team reviews it, and you approve it before it goes live. If the documents do not answer something, it is put to you as a question, never guessed.",
        ],
      },
      {
        q: "What do I have to approve?",
        a: [
          "Every scope line is reviewed by our team first. You answer the small number of questions only you can answer: an allowance, an exclusion, or leave it to builders to price. Then you approve the pack. Everything that is the builders’ ordinary work is handled before you see it.",
        ],
      },
      {
        q: "How do I compare the tenders?",
        a: [
          "Every tender is scored on six published dimensions: price firmness, scope coverage, preparation, credentials and capacity, delivery and aftercare, and programme confidence. The weights are fixed and applied identically to every tender, and every score shows its working, including the points a builder did not earn. Anything the tenders treat differently is pulled out line by line, so you can see where one builder allowed for something another priced in full. Where an answer deserves a question, it is flagged with the question to put to the builder, and those questions become your agenda before you decide.",
        ],
      },
      {
        q: "Who can see my address?",
        a: [
          "Your address and contact details are hidden until a verified builder takes a spot on your round. Before that, a builder sees the suburb, the project type and the scope of works.",
        ],
      },
    ],
  },
  {
    id: "architects",
    label: "For architects and building designers",
    questions: [
      {
        q: "Do we have to use BuilderHQ’s builders?",
        a: [
          "No. You can open the round to verified builders on BuilderHQ, invite builders you already know, or both. Invited builders take part at no cost.",
        ],
      },
      {
        q: "What does it cost the practice?",
        a: [
          "Nothing. Rounds are free to run, and builders you invite take part free. Builders from the open network pay a one off fee for their spot.",
        ],
      },
      {
        q: "Can my client see the round?",
        a: [
          "Yes. Share the round with your client as a viewer or a decision maker. Every action on the round is recorded with the name of the person who took it.",
        ],
      },
      {
        q: "Who owns the relationship with the client?",
        a: [
          "You do. The round is yours, the evaluation carries your practice’s name, and BuilderHQ never contacts your client about their project except through the round you run.",
        ],
      },
    ],
  },
  {
    id: "builders",
    label: "For builders",
    questions: [
      {
        q: "What does it cost to tender?",
        a: [
          "Browsing is free. Taking a spot on a round is a one off fee from $49 to $199 by project type. Invited rounds are free, and BuilderHQ takes no commission on work you win. The four prices are on the ",
          { text: "pricing page", href: "/pricing" },
          ".",
        ],
      },
      {
        q: "How many builders are on a round?",
        a: [
          "Rounds are capped. You are never pricing against a crowd, and the cap is shown before you take a spot.",
        ],
      },
      {
        q: "Do I have to use the platform’s scope?",
        a: [
          "Yes, and that is the point. Every builder prices the same list, so your price is compared with like for like. Anything you would price differently has a place to say so, on the record.",
        ],
      },
    ],
  },
  {
    id: "verification",
    label: "Verification and trust",
    questions: [
      {
        q: "What does verified actually mean?",
        a: [
          "Every builder’s ABN is checked against the Australian Business Register before they can see a project. Licences are checked against the state register where one connects, and by our team where one does not. Insurance is different: public liability and workers compensation are declared by the builder under signature, not checked against a register, and the tender says so on its face.",
        ],
      },
      {
        q: "How do I know a tender is genuine?",
        a: [
          "Every submitted tender carries a reference and a public verification page. Anyone you show it to can check the reference and confirm the document is genuine, prepared through BuilderHQ by the named builder for the named project, without the page revealing a word of what is in it.",
        ],
      },
      {
        q: "What happens if the scope changes mid round?",
        a: [
          "A numbered addendum goes to every builder on the round, and every price answers to the same change. The pack it replaces is marked superseded and stays on the record, so months later the round still shows who priced what, and when. Nothing changes quietly.",
        ],
      },
    ],
  },
  {
    id: "platform",
    label: "Platform and data",
    questions: [
      {
        q: "Do you use AI?",
        a: [
          "BuilderHQ uses AI to read documents and draft the scope of works, always behind a review by our team and your approval. It records what the documents state, and it never measures or scales anything off a drawing. The evaluation is not AI at all: every tender is scored from the builders’ own answers under fixed, published rules, and every score shows its working. It never invents a scope line without a citation, and it never makes the decision.",
        ],
      },
      {
        q: "Can I delete my account?",
        a: [
          "Yes. You can delete your account and your data at any time. Start on the ",
          { text: "delete your account", href: "/delete_account" },
          " page, and we remove the account and everything held with it.",
        ],
      },
    ],
  },
];

/** What a link renders as in plain text: its label, in the sentence. */
function partText(part: AnswerPart): string {
  return typeof part === "string" ? part : part.text;
}

/**
 * Plain-text mirror of every answer above, for the FAQPage structured
 * data. Answer engines quote these strings, so they are derived rather
 * than retyped: whatever the page shows is what the schema says.
 */
export const FAQ_SCHEMA_ITEMS: FaqItem[] = FAQ_CATEGORIES.flatMap((cat) =>
  cat.questions.map((qa) => ({
    q: qa.q,
    a: qa.a.map(partText).join(""),
  })),
);
