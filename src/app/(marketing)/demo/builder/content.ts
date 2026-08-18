/**
 * The builder demo script — every word, number and beat, in one file,
 * on the same rules as the other two scripts.
 *
 * THE CHAIR. The visitor plays Meridian Homes: the builder from the
 * other demos who priced everything and was not the cheapest. They
 * are invited onto the same Northcote project the architect demo runs,
 * price the same scope, and watch the level field work. Same project,
 * same numbers, third chair.
 *
 * WHAT THIS SCRIPT MUST LAND, in order:
 *   1. Work you choose: real projects, documents in, scope written.
 *   2. No take-off from scratch: the items are listed, you price them.
 *   3. One list for everyone: nobody wins by leaving work out.
 *   4. Read in full: your quote is scored, not just ranked on price.
 *
 * FEES ARE NEVER MENTIONED. A builder meeting the product for the
 * first time should be reading about the work, not the price of a
 * spot. A test pins the absence.
 *
 * TRUTH RULES. The comparison reuses the shared tender data, whose
 * arithmetic demo.test.ts pins. The featured division, RFI, addendum
 * and declarations are the architect demo's own, seen from the
 * receiving side. No em dashes in rendered copy; Australian English.
 */

import { type CoverFacts } from "@/components/builder/project-cover";

import { type DemoStage } from "../content";
import { type CloseCopy } from "../ui";

/* ── the board ──────────────────────────────────────────────────────── */

/** The facts each listing's cover band is drawn from, so the demo's
 *  cards carry the same cover the product draws. */
export interface BoardListing {
  title: string;
  facts: string;
  budget: string;
  spots: string;
  items: number;
  pages: number;
  cover: CoverFacts;
  chip: string;
}

/** Live projects on the board. Fresh projects, so no other demo's
 *  figures are contradicted or repeated. */
export const BUILDER_BOARD: BoardListing[] = [
  {
    title: "Single storey extension · Preston, VIC",
    facts: "3 bedrooms · rear extension",
    budget: "$380k to $450k",
    spots: "2 spots open",
    items: 148,
    pages: 96,
    chip: "Extension",
    cover: {
      type: "extension",
      floors: 1,
      dwellingCount: null,
      renovationScope: null,
      extensionType: "rear",
    },
  },
  {
    title: "New dwelling · Greenvale, VIC",
    facts: "4 bedrooms · 2 storeys",
    budget: "$780k to $900k",
    spots: "1 spot open",
    items: 289,
    pages: 240,
    chip: "New home",
    cover: {
      type: "single_dwelling",
      floors: 2,
      dwellingCount: null,
      renovationScope: null,
      extensionType: null,
    },
  },
  {
    title: "Kitchen and living renovation · Kew, VIC",
    facts: "Ground floor rework",
    budget: "$210k to $260k",
    spots: "3 spots open",
    items: 84,
    pages: 52,
    chip: "Renovation",
    cover: {
      type: "renovation",
      floors: 1,
      dwellingCount: null,
      renovationScope: "full_internal",
      extensionType: null,
    },
  },
];

/** The invitation that carries the featured journey. */
export const BUILDER_INVITE = {
  from: "Invitation from the project's architect",
  note: "A spot is held for you.",
  chip: "Extension",
  cover: {
    type: "extension",
    floors: 2,
    dwellingCount: null,
    renovationScope: null,
    extensionType: "ground_and_first",
  } satisfies CoverFacts,
};

/** What unlocks once the spot is yours. Example address only. */
export const BUILDER_ADDRESS = "18 Colley Street, Northcote";

/**
 * How this project works, said as three things a builder gets. Each
 * carries its own plain reason, because a rule without a reason is
 * just a rule.
 */
export const BUILDER_TERMS = [
  {
    label: "Three builders, on average",
    why: "You are not one of ten chasing the same job.",
  },
  {
    label: "Everyone prices the same list",
    why: "Nobody can look cheaper by leaving work out.",
  },
  {
    label: "Your whole quote is read",
    why: "Not just the number at the bottom.",
  },
];

/** The submission in progress: the line being marked is the featured
 *  division's own first line, so the demos agree with each other. */
export const BUILDER_MARKING = {
  position: "Line 12 of 236",
  states: ["Included", "Excluded", "Provisional sum"],
  summary: "All 236 lines answered · declarations signed",
};

/* ── the builder script ─────────────────────────────────────────────── */

export const BUILDER_SCRIPT: DemoStage[] = [
  {
    id: "find",
    rail: "Find work",
    steps: [
      {
        id: "f-open",
        kind: "intro",
        kicker: "Part 1 · Find work",
        title: "Find work that fits your pipeline.",
        line: "Projects with the documents in and the full scope of works already written, ready to price.",
      },
      {
        id: "f-board",
        kind: "note",
        target: "board",
        title: "Browse everything that is live",
        line: "See what is open right now and take on what suits you at the time.",
      },
      {
        id: "f-spots",
        kind: "note",
        target: "open-card",
        title: "Three builders price each project",
        line: "Not ten. So the hours you spend on a price are worth spending.",
      },
      {
        id: "f-invite",
        kind: "note",
        target: "invitation",
        title: "Architects and owners can invite you",
        line: "If they want you on the job, the invitation comes straight to you.",
      },
      {
        id: "f-accept",
        kind: "click",
        target: "accept-invite",
        title: "Here is one now",
        line: "A two storey extension in Northcote. Your spot is held.",
        prompt: "Click Accept invitation",
      },
    ],
  },
  {
    id: "project",
    rail: "The project",
    steps: [
      {
        id: "p-open",
        kind: "intro",
        kicker: "Part 2 · The project",
        title: "See everything before you price.",
        line: "The whole picture from the start. No surprises later.",
      },
      {
        id: "p-brief",
        kind: "note",
        target: "brief",
        title: "The project, in full",
        line: "Address, drawings, engineering, reports. Yours the moment you are in.",
      },
      {
        id: "p-terms",
        kind: "note",
        target: "terms",
        title: "You know the terms before you start",
        line: "How many builders you are up against, and how your quote gets read.",
      },
      {
        id: "p-scope",
        kind: "click",
        target: "open-scope",
        title: "The scope is ready",
        line: "Written from the plans before you got here.",
        prompt: "Click Open the scope of works",
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
        title: "Every item, already written out.",
        line: "We read the plans and list every item of work. You put your numbers against it.",
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
        title: "Every line points to the plans",
        line: "The steel is on page 8 of the engineering. Each line names its page, so you can check it in seconds.",
      },
      {
        id: "s-fixed",
        kind: "note",
        target: "packages",
        title: "The gaps are handled too",
        line: "Where the plans stop short, we flag it and the owner sets one budget. Every builder carries the same figure.",
      },
      {
        id: "s-start",
        kind: "click",
        target: "start-tender",
        title: "Ready to price",
        line: "No take-off from scratch. Just your numbers.",
        prompt: "Click Start your tender",
      },
    ],
  },
  {
    id: "tender",
    rail: "Your tender",
    steps: [
      {
        id: "t-open",
        kind: "intro",
        kicker: "Part 4 · Your tender",
        title: "Answer the list. That is it.",
        line: "No cover letter. No formatting. The list is your tender.",
      },
      {
        id: "t-mark",
        kind: "click",
        target: "mark-included",
        title: "Line by line",
        line: "In your price, not included, or a budget. The owner reads your answer exactly as you gave it.",
        prompt: "Click Included",
      },
      {
        id: "t-rfi",
        kind: "note",
        target: "rfi",
        title: "Ask once, everybody hears",
        line: "Corten asked about the crossover. The answer went to all three builders. Nobody prices on information you did not get.",
      },
      {
        id: "t-declare",
        kind: "note",
        target: "declarations",
        title: "Say it once",
        line: "Insurance, supervision, warranty, timing. Signed beside your price, and never asked for again.",
      },
      {
        id: "t-submit",
        kind: "click",
        target: "submit",
        title: "Send it",
        line: "Your quote lands in the same shape as everybody else's.",
        prompt: "Click Submit your tender",
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
        kicker: "Part 5 · The comparison",
        title: "The cheapest quote stops winning by default.",
        line: "We show the owner what sits behind every price, so a low number is not mistaken for a good deal.",
      },
      {
        id: "c-land",
        kind: "watch",
        watchMs: 3800,
        title: "The other quotes come in",
        line: "Corten and Brightwater send theirs. Three quotes, one shape.",
      },
      {
        id: "c-prices",
        kind: "note",
        target: "price-row",
        title: "The three prices",
        line: "You are $37,000 above the cheapest. Normally that is where it ends. Not here.",
      },
      {
        id: "c-gaps",
        kind: "note",
        target: "gaps",
        title: "What is missing becomes visible",
        line: "$82,500 of the cheapest price can still move. The owner sees that sitting next to your locked price.",
      },
      {
        id: "c-scores",
        kind: "note",
        target: "receipts",
        title: "Doing it properly counts",
        line: "Coverage, preparation, delivery. Each one scored, and every score shows how it was reached.",
      },
      {
        id: "c-flags",
        kind: "note",
        target: "flags",
        title: "Missing work shows up",
        line: "The missing driveway is flagged for the owner. The same reading for everyone. Your quote drew no flags.",
      },
      {
        id: "c-outcome",
        kind: "click",
        target: "see-outcome",
        title: "A fair read",
        line: "The owner decides with all of it in front of them.",
        prompt: "Click See the outcome",
      },
    ],
  },
  {
    id: "award",
    rail: "The outcome",
    steps: [
      {
        id: "a-open",
        kind: "intro",
        kicker: "Part 6 · The outcome",
        title: "They could see why you cost more.",
        line: "Your price was higher. Your quote covered everything. On paper, that was obvious.",
      },
      {
        id: "a-won",
        kind: "note",
        target: "award",
        title: "You won the job",
        line: "The owner awards it to you directly. The contract is between you and them.",
      },
      {
        id: "a-finish",
        kind: "click",
        target: "finish",
        title: "Start the build",
        line: "Everything from the tender stays on record, for both sides.",
        prompt: "Click Finish",
      },
    ],
  },
  {
    id: "close",
    rail: "Done",
    steps: [],
  },
];

/* ── the award ──────────────────────────────────────────────────────── */

export const BUILDER_AWARD = {
  headline: "Meridian Homes · Selected",
  line: "The owner has awarded this project to you.",
  points: [
    "Contract signed directly between you and the owner",
    "We take nothing from the build",
    "Every document and answer stays on record for both sides",
  ],
};

/* ── the close ──────────────────────────────────────────────────────── */

export const BUILDER_CLOSE: CloseCopy = {
  kicker: "That is the whole of it",
  title: "Choose your work. Price it on a level field.",
  recap: [
    "You picked a project that suited you, with the scope already written",
    "Every builder priced the same list, so nothing could be quietly left out",
    "The owner read your quote in full, and awarded it to you directly",
  ],
  truth:
    "Sign up, set your area and the work you take on, and see the projects open right now.",
  primary: { label: "Pick your next project", href: "/signup?role=builder" },
  secondary: { label: "Back to home", href: "/" },
};

export const BUILDER_DISCLAIMER = "Example project. Figures are illustrative.";

export const BUILDER_CRUMBS: Record<string, string> = {
  find: "Find work",
  project: "Two storey extension · Northcote",
  scope: "Scope of works",
  tender: "Your tender",
  compare: "The comparison",
  award: "The outcome",
  close: "Done",
};
