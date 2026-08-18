/**
 * The architect demo script — every word, number and beat, in one
 * file, on the same rules as the homeowner script.
 *
 * VOICE. The person watching is an architect or building designer who
 * runs tenders for clients and hates the admin of it. They know the
 * work; they do not know BuilderHQ. Short sentences, everyday words,
 * one idea at a time. Professional, never clever.
 *
 * WHAT THIS SCRIPT MUST LAND, in order:
 *   1. Nothing new to prepare: the set they already drew is the input.
 *   2. They stay in charge: their builders, their approval, their name.
 *   3. The admin disappears: scope writing, chasing, RFIs, retyping.
 *   4. The comparison is defensible: same scope, scored with working
 *      shown, and it exports under the practice's name.
 *
 * TRUTH RULES. The three builders are the personas seeded into every
 * new account's example round, so the close honestly promises a
 * worked example round like this one. The comparison stage reuses the
 * homeowner demo's tender data, whose arithmetic is pinned by test;
 * the architect-only figures are pinned in architect.test.ts. The
 * reading is compressed and the script says so. No em dashes in
 * rendered copy; Australian English.
 */

import {
  type DemoStage,
} from "../content";
import { type CloseCopy } from "../ui";

/* ── the demo project ───────────────────────────────────────────────── */

export const ARCH_PROJECT = {
  title: "Two storey extension · Northcote, VIC",
  client: "Hartley residence",
  facts: "New first floor · full ground floor rework · 4 bedrooms",
};

export const ARCH_DOCUMENTS: Array<{
  name: string;
  pages: number;
  kind: string;
}> = [
  { name: "Architectural set, Rev D", pages: 48, kind: "Architectural" },
  { name: "Interior details and joinery, Rev B", pages: 22, kind: "Interiors" },
  { name: "Demolition and retention plan", pages: 8, kind: "Architectural" },
  { name: "Structural engineering, Rev B", pages: 18, kind: "Structural" },
  { name: "Civil and stormwater design", pages: 14, kind: "Civil" },
  { name: "Building services", pages: 16, kind: "Services" },
  { name: "Soil report", pages: 20, kind: "Geotechnical · Class M" },
  { name: "Energy assessment", pages: 12, kind: "NatHERS · 7.4 stars" },
  { name: "Feature and level survey", pages: 6, kind: "Survey" },
  { name: "Specification, Rev C", pages: 56, kind: "Specification" },
];

export const ARCH_TOTALS = {
  documents: 10,
  pages: 220,
  items: 236,
  trades: 28,
  evidenced: 214,
  builderPriced: 22,
  citations: 502,
};

/** What the reading surface shows passing by. */
export const ARCH_READING_FEED = [
  { line: "New first floor over the retained rooms, priced to the engineering", cite: "Structural, page 6" },
  { line: "Joinery to the interior details, room by room", cite: "Interior details, page 9" },
  { line: "Class M site, footings priced to the soil report", cite: "Soil report, page 4" },
  { line: "7.4 star thermal upgrade across the works", cite: "Energy assessment, page 3" },
  { line: "No landscaping documented. Held as a client decision.", cite: "Whole set" },
];

/** The division opened during the scope stage: the new first floor,
 *  priced straight off the engineering. The most valuable part of the
 *  project, shown with the specifics that prove the set was read. */
export const ARCH_DIVISION = {
  label: "First floor structure and framing",
  count: 9,
  lines: [
    {
      label: "Steel beams over the ground floor opening",
      note: "Two 310UB transfer beams, sized and priced to the engineering.",
      cite: "Structural engineering, page 8, Rev B",
    },
    {
      label: "First floor joists and structural flooring",
      note: "LVL joists at 450 centres, laid to the framing layout.",
      cite: "Structural engineering, page 9, Rev B",
    },
  ],
  more: "7 more lines in this section",
};

export const ARCH_SCOPE_DIVISIONS = [
  { label: "Preliminaries and site establishment", count: 13 },
  { label: "Approvals, certification and compliance", count: 9 },
  { label: "Demolition and retention", count: 6 },
  { label: "Earthworks and excavation", count: 7 },
  { label: "Footings and new ground slab", count: 8 },
];
export const ARCH_SCOPE_DIVISIONS_AFTER = [
  { label: "Roofing and roof plumbing", count: 7 },
  { label: "Windows and external glazing", count: 8 },
];
export const ARCH_SCOPE_MORE = "21 more sections, all written the same way";

/**
 * The budgets for the client decisions still open. The amounts match
 * the shared comparison data: the landscaping figure the visitor sets
 * here is the $47,000 every tender carries later.
 */
export const ARCH_PACKAGES = [
  {
    id: "appliances",
    title: "Appliances",
    covers: "Ovens, cooktops, rangehood and dishwasher.",
    why: "Projects like this usually set aside 2 to 3 percent of the build.",
    amount: 18_000,
    preset: true,
  },
  {
    id: "flooring",
    title: "Floor coverings",
    covers: "Boards, carpet and tiles to the drawn areas.",
    why: "Projects like this usually set aside 3.5 to 4.5 percent of the build.",
    amount: 28_000,
    preset: true,
  },
  {
    id: "landscaping",
    title: "Landscaping",
    covers: "Rear garden, paths and planting.",
    why: "Not documented yet, so every builder carries one figure. We suggest $47,000.",
    amount: 47_000,
    preset: false,
  },
];

/** Who is in the round, and how they got there. */
export const ARCH_ROUND = [
  { name: "Corten Building Co", initials: "CB", invited: true },
  { name: "Meridian Homes", initials: "MH", invited: true },
  { name: "Brightwater Projects", initials: "BP", invited: false },
];

/** The RFI answered during the round stage. */
export const ARCH_RFI = {
  from: "Corten Building Co",
  initials: "CB",
  question: "Is the existing crossover retained, or do we allow for a new one?",
  answer: "Retained and protected. No new crossover.",
  status: "Answered once · sent to all three builders",
  addendum: "Addendum 01",
};

/** What every builder declares under signature with the tender. */
export const ARCH_ASKS = [
  "Insurance",
  "Site supervision",
  "Warranty and defects period",
  "Variations in writing",
  "Programme and start date",
  "References",
];

/** What lands inside a submission on the tenders stage. */
export const ARCH_MARK_ROWS = [
  { label: "Steel beams over the ground floor opening", state: "Included", tone: "teal" },
  { label: "Landscaping package", state: "Provisional sum · $47,000", tone: "amber" },
  { label: "Driveway and crossover", state: "Included", tone: "teal" },
];

/** The exported deliverable at the end of the comparison. */
export const ARCH_REPORT = {
  kicker: "For your client",
  title: "Tender recommendation",
  client: "Hartley residence",
  meta: "Prepared under your practice's name",
  contents: [
    "The three tenders, priced on one scope",
    "Every score, with its working shown",
    "The flags, and the questions to settle",
  ],
};

/* ── the architect script ───────────────────────────────────────────── */

export const ARCHITECT_SCRIPT: DemoStage[] = [
  {
    id: "upload",
    rail: "Upload",
    steps: [
      {
        id: "u-open",
        kind: "intro",
        kicker: "Part 1 · Upload",
        title: "It starts with your set.",
        line: "The documents you already drew. Nothing new to prepare.",
      },
      {
        id: "u-add",
        kind: "click",
        target: "add-set",
        title: "Add your documentation",
        line: "The full set, in one upload.",
        prompt: "Click Add your documentation",
      },
      {
        id: "u-register",
        kind: "note",
        target: "register",
        title: "Filed, named and versioned",
        line: "Architecturals, structure, services, spec. Revisions and all.",
      },
      {
        id: "u-round",
        kind: "click",
        target: "choose-both",
        title: "You choose who tenders",
        line: "Invite your own builders, open the round to verified builders, or do both.",
        prompt: "Choose Your builders plus ours",
      },
      {
        id: "u-invites",
        kind: "note",
        target: "invites",
        title: "Your builders are in",
        line: "Two invitations sent. One open spot for a verified builder near the site.",
      },
      {
        id: "u-send",
        kind: "click",
        target: "start-reading",
        title: "That is the set done",
        line: "Now we write the scope of works.",
        prompt: "Click Start the reading",
      },
    ],
  },
  {
    id: "reading",
    rail: "The reading",
    steps: [
      {
        id: "r-open",
        kind: "intro",
        kicker: "Part 2 · The reading",
        title: "We read the whole set.",
        line: "Every drawing, every schedule, every page.",
      },
      {
        id: "r-watch",
        kind: "watch",
        watchMs: 5600,
        title: "220 pages, one by one",
        line: "Every scope line cites the page it came from. Your set stays the single source of truth.",
      },
      {
        id: "r-check",
        kind: "note",
        target: "human-check",
        title: "How it works",
        line: "Software reads the set and writes each item of work. A person checks every item before it reaches you. One business day, and it is ready for your review.",
      },
      {
        id: "r-done",
        kind: "click",
        target: "open-scope",
        title: "Ready for your review",
        line: "Nothing reaches a builder until you approve it.",
        prompt: "Click Review the scope of works",
      },
    ],
  },
  {
    id: "scope",
    rail: "The scope",
    steps: [
      {
        id: "s-open",
        kind: "intro",
        kicker: "Part 3 · The scope of works",
        title: "The whole project, written out.",
        line: "We read every page of your set and list every item of work. Every builder prices that same list.",
      },
      {
        id: "s-expand",
        kind: "click",
        target: "expand-division",
        title: "Look inside",
        line: "Open a section and see the detail.",
        prompt: "Open First floor structure and framing",
      },
      {
        id: "s-cite",
        kind: "note",
        target: "division-lines",
        title: "Every line points back to your set",
        line: "The steel is on page 8 of the engineering. Each line names its page, so builder queries answer themselves.",
      },
      {
        id: "s-allow",
        kind: "note",
        target: "packages",
        title: "We catch what the set leaves out",
        line: "Anything not drawn yet gets flagged and given a budget. Every builder carries the same figure, so the tenders stay comparable.",
      },
      {
        id: "s-budget",
        kind: "click",
        target: "set-budget",
        title: "Set the landscaping budget",
        line: "One figure for all three builders. The detail can wait for your client.",
        prompt: "Click Set budget",
      },
      {
        id: "s-publish",
        kind: "click",
        target: "publish",
        title: "You are the gatekeeper",
        line: "The scope goes out under your approval, or not at all.",
        prompt: "Click Approve and issue",
      },
    ],
  },
  {
    id: "live",
    rail: "The tender",
    steps: [
      {
        id: "l-open",
        kind: "intro",
        kicker: "Part 4 · Out to tender",
        title: "The tender opens.",
        line: "Your builders, and one of ours. All pricing the same scope.",
      },
      {
        id: "l-fill",
        kind: "watch",
        watchMs: 4600,
        title: "The builders come on",
        line: "Corten and Meridian accept your invitation. Brightwater takes the open spot. ABN and licence checked on all three.",
      },
      {
        id: "l-hidden",
        kind: "note",
        target: "builder-view",
        title: "The client's address stays private",
        line: "Open spot builders see the project, not the street. The address comes after they commit.",
      },
      {
        id: "l-rfi",
        kind: "note",
        target: "rfi",
        title: "Questions, answered once",
        line: "A builder asks here. You answer here. Every builder gets the answer as a numbered addendum.",
      },
      {
        id: "l-go",
        kind: "click",
        target: "see-tendering",
        title: "No chasing, no reminders",
        line: "See what comes back.",
        prompt: "Click See the tenders",
      },
    ],
  },
  {
    id: "tenders",
    rail: "Tenders",
    steps: [
      {
        id: "t-open",
        kind: "intro",
        kicker: "Part 5 · The tenders",
        title: "Every tender, one structure.",
        line: "No PDFs to decode. Nothing to retype.",
      },
      {
        id: "t-marks",
        kind: "note",
        target: "marking",
        title: "Line by line",
        line: "Each builder answers every item in your scope. Included, excluded, or a provisional sum.",
      },
      {
        id: "t-asks",
        kind: "note",
        target: "asks",
        title: "The declarations, collected",
        line: "Insurance, supervision, warranty, programme. Declared under signature with the tender.",
      },
      {
        id: "t-land",
        kind: "watch",
        watchMs: 4400,
        title: "Three tenders, ready to compare",
        line: "Each one lands in the same structure, with the builder's profile and checks behind it.",
      },
      {
        id: "t-go",
        kind: "click",
        target: "open-comparison",
        title: "All in",
        line: "Now the part your client is waiting for.",
        prompt: "Click Open the comparison",
      },
    ],
  },
  {
    id: "compare",
    rail: "The comparison",
    steps: [
      {
        id: "c-open",
        kind: "intro",
        kicker: "Part 6 · The comparison",
        title: "The cheapest tender stops winning by default.",
        line: "We show your client what sits behind every price, so you can advise on more than the bottom line.",
      },
      {
        id: "c-prices",
        kind: "note",
        target: "price-row",
        title: "The prices",
        line: "$648,000. $685,000. $728,000. Priced on the same scope, so the gaps mean something.",
      },
      {
        id: "c-scores",
        kind: "click",
        target: "show-scores",
        title: "Scored the same way",
        line: "Six dimensions, the same test for every tender.",
        prompt: "Click Show the scores",
      },
      {
        id: "c-receipts",
        kind: "note",
        target: "receipts",
        title: "Every score shows its working",
        line: "Open any score and see how it was reached. Your recommendation stands on evidence.",
      },
      {
        id: "c-differ",
        kind: "click",
        target: "show-differences",
        title: "Where they differ",
        line: "We read all three in full, so you do not have to.",
        prompt: "Click Where they differ",
      },
      {
        id: "c-grid",
        kind: "note",
        target: "grid",
        title: "Side by side",
        line: "The differences that matter, in one table. The highlighted rows are the ones to raise with your client.",
      },
      {
        id: "c-moving",
        kind: "note",
        target: "breakeven",
        title: "The risk on the cheapest tender",
        line: "$82,500 of Corten's price can still move. If it grows by 45 percent, the saving is gone. That maths is done for you.",
      },
      {
        id: "c-ladder",
        kind: "note",
        target: "ladder",
        title: "What more money buys",
        line: "Brightwater is $43,000 over Meridian. Here is exactly what that buys.",
      },
      {
        id: "c-flags",
        kind: "click",
        target: "show-flags",
        title: "Anything risky is flagged",
        line: "Nothing hides in the fine print.",
        prompt: "Click Show the flags",
      },
      {
        id: "c-questions",
        kind: "note",
        target: "flags",
        title: "With the questions drafted",
        line: "Every flag carries the question to put to that builder. Ready to send.",
      },
      {
        id: "c-report",
        kind: "note",
        target: "report",
        title: "Your name on the front",
        line: "The whole comparison, exported for your client. Your practice, your recommendation, the evidence attached.",
      },
      {
        id: "c-export",
        kind: "click",
        target: "export-report",
        title: "Hand it over",
        line: "The decision is your client's. The evidence is yours.",
        prompt: "Click Export for your client",
      },
    ],
  },
  {
    id: "close",
    rail: "Done",
    steps: [],
  },
];

/* ── the close ──────────────────────────────────────────────────────── */

export const ARCH_CLOSE: CloseCopy = {
  kicker: "That is the whole of it",
  title: "You just ran the whole tender.",
  recap: [
    "Your set became a cited scope of works",
    "Your builders and ours priced the same list",
    "The comparison came back explained, under your name",
  ],
  truth:
    "Sign up and your account opens with a worked example project like this one, ready to explore. Your next tender can run here.",
  primary: { label: "Run a tender for your client", href: "/signup?role=architect" },
  secondary: { label: "Back to home", href: "/" },
};

export const ARCH_DISCLAIMER = "Example project. Figures are illustrative.";

export const ARCH_CRUMBS: Record<string, string> = {
  upload: "New tender",
  reading: "Reading your set",
  scope: "Scope of works",
  live: "Out to tender",
  tenders: "Tenders",
  compare: "The comparison",
  close: "Done",
};
