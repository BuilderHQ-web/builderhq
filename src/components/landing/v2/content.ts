/**
 * Landing v2, the home page copy.
 *
 * This file is the single source of copy for the home page. Components
 * render it and hold no words of their own. One voice, one story, read
 * by every audience: the role lens system is gone, and the three
 * audiences are argued in full on their own pages under /for.
 *
 * Voice rules, enforced here so components stay dumb:
 *   · No em dashes. No exclamation marks. No hype words.
 *   · Curly apostrophes. Short sentences. Plain Australian English.
 *   · Sentence case headings, never Title Case Every Word.
 *   · Numbers always appear with their definition.
 *
 * Claims rule: every claim below must stay inside the verified
 * capability list in 85a-docs/marketing-recon-brief.md section 2. That
 * document also lists the claims to avoid, and they are not negotiable
 * here: no accuracy or speed or volume figures, no blanket licence
 * verification claim, no take-off, quantity or cost estimate claim, and
 * the platform never picks a winner.
 */

/** Which product scene a section renders. Defined here so the copy and
 *  the scene it belongs to travel together; app-scenes imports it. */
export type SceneKey = "round" | "scope" | "marking" | "instrument" | "matrix";

export interface CtaSpec {
  label: string;
  href: string;
}

/** The one primary action on the page. Auth-aware at the component
 *  layer: a signed-in visitor is sent to their dashboard instead. */
const START: CtaSpec = { label: "Start your project", href: "/signup?role=owner" };

/* ── Hero ───────────────────────────────────────────────────────────── */

export const HERO: {
  kicker: string;
  h1: string;
  sub: string;
  primary: CtaSpec;
  /** Text link to #how. The glyph is part of the label; the component
   *  must not add a second arrow. */
  secondaryLabel: string;
  facts: string[];
} = {
  kicker: "Residential construction · Australia",
  h1: "The tendering platform for Australian residential construction.",
  sub: "Upload the plans. BuilderHQ writes the scope of works, every builder prices that same list, and every tender comes back structured, scored and ready to compare.",
  primary: START,
  secondaryLabel: "See how a round runs ↓",
  facts: [
    "Free for homeowners",
    "Builders verified before they price",
    "No commission, either side",
  ],
};

/* ── Partner marquee ────────────────────────────────────────────────── */

export const MARQUEE_EYEBROW = "Working with practices and builders across Australia";

/* ── 01 · The problem ───────────────────────────────────────────────── */

export const PROBLEM: {
  h2: string;
  lede: string;
  cards: Array<{ title: string; body: string }>;
  bridge: string;
} = {
  h2: "Three quotes, three different jobs.",
  lede: "Ask three builders to price the same home and you get three documents that cannot be compared. Not because anyone did anything wrong, but because nobody was pricing the same thing.",
  cards: [
    {
      title: "Every builder prices a different scope.",
      body: "One allows for the retaining wall, one assumes it, one leaves it out. The prices differ because the jobs differ, and nobody can see where.",
    },
    {
      title: "The quotes cannot be compared.",
      body: "Three formats, three sets of inclusions, three readings of the same drawings. Side by side means nothing when the columns measure different things.",
    },
    {
      title: "The gaps surface after signing.",
      body: "Whatever was never priced becomes a variation later. The cheapest quote is often the one that left the most out.",
    },
  ],
  bridge: "BuilderHQ removes the guesswork before the first price is written.",
};

/* ── 02 · How it works, the spine ───────────────────────────────────── */

export const HOW: { h2: string; sub: string } = {
  h2: "How a round runs.",
  sub: "From the plans to a decision you can stand behind.",
};

export const STEPS: Array<{
  n: string;
  step: string;
  headline: string;
  body: string;
  scene: SceneKey;
}> = [
  {
    n: "01",
    step: "The scope of works",
    headline: "We read the documents and write the scope.",
    body: "Upload the drawings and reports. BuilderHQ reads them and writes a scope of works in plain English, line by line, with every line tied to the document and page it came from. A person reviews it, and you approve it before anything goes live. If something is not in the documents, it is asked as a question, not guessed.",
    scene: "scope",
  },
  {
    n: "02",
    step: "The same list, priced",
    headline: "Every builder prices the same list.",
    body: "Verified builders take a spot on the round and walk your scope line by line, marking every item included, a provisional sum, or excluded. Open the round to our verified network, or invite builders you already trust. Either way, everyone prices the same documents and the same list.",
    scene: "marking",
  },
  {
    n: "03",
    step: "Structured tenders",
    headline: "Tenders arrive as answers, not PDFs.",
    body: "Every tender is the builder’s answers under signature: the price and what stands behind it, what is firm, what is allowed for, what is excluded, the programme, and who is doing the work. The same structured questions for every builder on the round, so nothing important goes unasked.",
    scene: "instrument",
  },
  {
    n: "04",
    step: "The comparison",
    headline: "Compare, question, decide.",
    body: "Every tender is scored on six published dimensions, and every score shows its working. Anything the tenders treat differently is pulled out line by line. You question builders on the record, and when you award, the contract is direct between you and your builder. No commission, either side.",
    scene: "matrix",
  },
];

/* ── 03 · The standards ─────────────────────────────────────────────── */

export const STANDARDS: {
  h2: string;
  lede: string;
  rules: Array<{ title: string; body: string }>;
  footer: string;
} = {
  h2: "Trust isn’t a feature. It’s the product.",
  lede: "Six rules the platform runs on. Not policies on a page somewhere. Behaviour you can check.",
  rules: [
    {
      title: "Verified before they price.",
      body: "Every builder’s ABN is checked against the Australian Business Register. Licences are checked against the state register where one connects, and by our team where one does not. Only then does a builder see a project.",
    },
    {
      title: "No citation, no claim.",
      body: "A scope line that cannot point to a document and a page does not make the list. Every line can be traced back to the drawings.",
    },
    {
      title: "A person signs off.",
      body: "The scope of works is reviewed by our team and approved by you before a builder ever prices it. Software reads. People decide.",
    },
    {
      title: "The scoring is published.",
      body: "Six dimensions, fixed weights, applied identically to every tender. Every score shows its working, including the points a builder did not earn.",
    },
    {
      title: "Nothing changes quietly.",
      body: "If the scope changes mid round, a numbered addendum goes to every builder and every price answers to it. The record shows who priced what, and when.",
    },
    {
      title: "Every tender is verifiable.",
      body: "Each submitted tender carries a reference and a public verification page confirming the document is genuine, without revealing a word of it.",
    },
  ],
  footer:
    "And when you award, the contract is yours. BuilderHQ takes no commission from either side.",
};

/* ── 04 · Who it’s for ──────────────────────────────────────────────── */

export const AUDIENCES: {
  h2: string;
  blocks: Array<{
    name: string;
    statement: string;
    line: string;
    href: string;
    cta: string;
  }>;
} = {
  h2: "Built for every side of the round.",
  blocks: [
    {
      name: "Homeowners",
      statement: "Your build, decided on evidence.",
      line: "Upload once, approve the scope, and choose between tenders that finally measure the same things.",
      href: "/for/homeowners",
      cta: "For homeowners",
    },
    {
      name: "Architects and building designers",
      statement: "Run the round for your client.",
      line: "Your builders or ours, open or private, and the evaluation carries your practice’s name.",
      href: "/for/architects",
      cta: "For architects",
    },
    {
      name: "Builders",
      statement: "Price real work, properly.",
      line: "A scope someone already did the work on, and a tender read on more than the bottom line.",
      href: "/for/builders",
      cta: "For builders",
    },
  ],
};

/* ── 05 · Proof ─────────────────────────────────────────────────────── */

export const PROOF: {
  h2: string;
  body: string;
  gatesTitle: string;
  gates: Array<{ title: string; line: string }>;
  footer: string;
} = {
  h2: "Built in Melbourne, for Australia.",
  body: "BuilderHQ is an Australian team building the infrastructure residential tendering has never had. Every scope is reviewed by a person before it goes live, and if something is not right, you can call us. Two phone numbers are at the bottom of this page, and humans answer both.",
  gatesTitle: "How every builder gets in",
  gates: [
    {
      title: "ABN verified",
      line: "Live against the Australian Business Register",
    },
    {
      title: "Licence verified",
      line: "Against the state building register where one connects",
    },
    {
      title: "Verified by our team",
      line: "Checked by hand where a register does not connect",
    },
    {
      title: "Approved to tender",
      line: "Only then does the verified badge appear",
    },
  ],
  footer: "No anonymous bids. No pay-to-appear. Just builders who cleared the gate.",
};

/** Process facts, not outcomes. Each number is a published property of
 *  the product and is stated with its definition. No dollar figures, no
 *  volumes, no savings claims. */
export const PROOF_FACTS: Array<{ value: string; label: string }> = [
  { value: "256", label: "lines in the Scope Standard" },
  { value: "93", label: "questions in every tender" },
  { value: "6", label: "published scoring dimensions" },
];

/* ── Testimonials ───────────────────────────────────────────────────── */

/* PLACEHOLDER CONTENT. These quotes are illustrative and must be
   replaced with real, attributable customer words before this page goes
   to production. Fabricated testimonials are misleading conduct under
   the Australian Consumer Law. Standing instruction: replace with
   verifiable facts (customer since, rounds run, users) the moment real
   customers permit it, and collect those facts deliberately from day
   one. No dollar or income claims in any replacement. */
export const TESTIMONIALS: Array<{ quote: string; who: string }> = [
  {
    quote:
      "The scope of works came back with everything in it, including things we had not thought to ask about. All three quotes finally made sense next to each other.",
    who: "Sarah, homeowner, Melbourne",
  },
  {
    quote:
      "The cheapest tender carried eighty thousand dollars of allowances. We would never have seen that in the PDFs.",
    who: "James, homeowner, Geelong",
  },
  {
    quote:
      "We ran the round under our own name and walked the client through the comparison in one meeting. It is the part of the job that used to take us weeks.",
    who: "A practice director, Melbourne",
  },
  {
    quote:
      "Our drawings came back as a scope our client could actually read. The tenders came back priced against it.",
    who: "A building designer, regional Victoria",
  },
  {
    quote:
      "Every builder priced the same list, so the round was about how we build, not who left the most out.",
    who: "A registered builder, Melbourne",
  },
  {
    quote:
      "The tender took an evening to do properly, and for once the owner could see the difference between our price and a cheaper one.",
    who: "A registered builder, Victoria",
  },
];

/* ── 06 · Questions ─────────────────────────────────────────────────── */

export const FAQ: {
  h2: string;
  sub: string;
  items: Array<{ q: string; a: string }>;
} = {
  h2: "Frequently asked questions",
  sub: "If yours isn’t here, email info@builderhq.com.au and a human answers.",
  items: [
    {
      q: "What does BuilderHQ actually do?",
      a: "It runs the tender. It writes the scope of works from your documents, has every builder price that same scope and answer the same questions, and turns the tenders into a scored, side by side comparison. You make the decision, on the record.",
    },
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
  ],
};

/* ── Close ──────────────────────────────────────────────────────────── */

export const CLOSE: {
  h2: string;
  sub: string;
  ctaLabel: string;
  trio: string[];
} = {
  h2: "Start with the plans.",
  sub: "Upload your project, approve your scope of works, and let the round run.",
  ctaLabel: START.label,
  trio: [
    "Free for homeowners",
    "Verified builders only",
    "No commission on your build",
  ],
};

/* ── Chrome: nav and footer ─────────────────────────────────────────── */

export const NAV_LINKS: Array<{ label: string; href: string }> = [
  { label: "How it works", href: "/#how" },
  { label: "Pricing", href: "/pricing" },
  { label: "The Build Brief", href: "/build-brief" },
];

/** The "Who it’s for" nav group. Partners is a separate existing
 *  dropdown and is deliberately not modelled here. */
export const WHO_ITS_FOR: Array<{ label: string; href: string; blurb: string }> = [
  {
    label: "Homeowners",
    href: "/for/homeowners",
    blurb: "The biggest financial decision of your life, made on evidence instead of guesswork.",
  },
  {
    label: "Architects",
    href: "/for/architects",
    blurb: "Run the round for your client, your way, with your name on an evaluation you can defend.",
  },
  {
    label: "Builders",
    href: "/for/builders",
    blurb: "Price real projects on a scope someone already did the work on, and win on capability, not just the lowest number.",
  },
];

export const FOOTER: {
  description: string;
  columns: Array<{ title: string; links: Array<{ label: string; href: string }> }>;
} = {
  description:
    "BuilderHQ is the tendering platform for Australian residential construction. It writes the scope of works from the plans, has every builder price the same list, and turns the tenders into a comparison you can act on. Built in Melbourne.",
  columns: [
    {
      title: "Platform",
      links: [
        { label: "How it works", href: "/#how" },
        { label: "Pricing", href: "/pricing" },
        { label: "Start your project", href: START.href },
        { label: "Log in", href: "/login" },
      ],
    },
    {
      title: "Who it’s for",
      links: [
        { label: "Homeowners", href: "/for/homeowners" },
        { label: "Architects", href: "/for/architects" },
        { label: "Builders", href: "/for/builders" },
        { label: "Partners", href: "/partners" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "The Build Brief", href: "/build-brief" },
        { label: "Book a call", href: "/book-a-call" },
        { label: "Contact", href: "mailto:info@builderhq.com.au" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms", href: "/terms" },
        { label: "Privacy", href: "/privacy" },
        { label: "Delete your account", href: "/delete_account" },
      ],
    },
  ],
};
