/**
 * The builder demo script — every word, number and beat, in one file,
 * on the same rules as the other two scripts.
 *
 * THE CHAIR. The visitor plays Meridian Homes: the builder from the
 * other demos who priced everything and was not the cheapest. They
 * are invited onto the same Northcote round the architect demo runs,
 * price the same scope, and watch the level field work. Same project,
 * same numbers, third chair.
 *
 * WHAT THIS SCRIPT MUST LAND, in order:
 *   1. Work worth the hours: real projects, documents in, you choose.
 *   2. The take-off is done: you price, you do not investigate.
 *   3. One list for everyone: nobody wins by leaving things out.
 *   4. Read properly: your tender is scored, not just ranked on price.
 *
 * FEES. Builders can be invited, or take a spot on an open round for
 * a one off fee. The fee is said ONCE, as the reason rounds stay
 * small and serious, and never again. A test pins this.
 *
 * TRUTH RULES. The comparison reuses the shared tender data, whose
 * arithmetic demo.test.ts pins. The featured division, RFI, addendum
 * and declarations are the architect demo's own, seen from the
 * receiving side. No em dashes in rendered copy; Australian English.
 */

import { type DemoStage } from "../content";
import { type CloseCopy } from "../ui";

/* ── the board ──────────────────────────────────────────────────────── */

/** Open rounds on the board. Fresh projects, so no other demo's
 *  figures are contradicted or repeated. */
export const BUILDER_BOARD = [
  {
    title: "Single storey extension · Preston, VIC",
    facts: "3 bedrooms · rear extension",
    budget: "$380k to $450k",
    spots: "2 of 3 spots open",
    items: 148,
    pages: 96,
  },
  {
    title: "New dwelling · Greenvale, VIC",
    facts: "4 bedrooms · 2 storeys",
    budget: "$780k to $900k",
    spots: "1 of 3 spots open",
    items: 289,
    pages: 240,
  },
  {
    title: "Kitchen and living renovation · Kew, VIC",
    facts: "Ground floor rework",
    budget: "$210k to $260k",
    spots: "3 of 3 spots open",
    items: 84,
    pages: 52,
  },
];

/** The invitation that carries the featured journey. */
export const BUILDER_INVITE = {
  from: "Invited by the project's architect",
  note: "A spot is held for you.",
};

/** What unlocks once the spot is yours. Example address only. */
export const BUILDER_ADDRESS = "18 Colley Street, Northcote";

export const BUILDER_TERMS = {
  spots: "3 builders, no more",
  closes: "Tenders close in 14 days",
  scoring: "Scored on six published dimensions",
};

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
        title: "Work worth your hours.",
        line: "Real projects, documents in, scope written. You choose what fits.",
      },
      {
        id: "f-board",
        kind: "note",
        target: "board",
        title: "Every listing is a real project",
        line: "Documents in, scope written, budget shown. Not a lead. A project.",
      },
      {
        id: "f-spots",
        kind: "note",
        target: "open-card",
        title: "Three builders, no more",
        line: "A one off fee holds a spot, which keeps every round small and serious.",
      },
      {
        id: "f-invite",
        kind: "note",
        target: "invitation",
        title: "Some rounds come to you",
        line: "Owners and architects invite builders they want on the job.",
      },
      {
        id: "f-accept",
        kind: "click",
        target: "accept-invite",
        title: "This one is yours",
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
        line: "The full picture from day one. No surprises later.",
      },
      {
        id: "p-brief",
        kind: "note",
        target: "brief",
        title: "The project, in full",
        line: "Address, drawings, reports. Yours from the moment you are on the round.",
      },
      {
        id: "p-terms",
        kind: "note",
        target: "terms",
        title: "The rules are published",
        line: "How many builders, when it closes, and how tenders are scored. All known before you start.",
      },
      {
        id: "p-scope",
        kind: "click",
        target: "open-scope",
        title: "The scope is ready",
        line: "Written from the documents before you arrived.",
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
        title: "The take-off is done.",
        line: "236 items, written and cited. You price. You do not investigate.",
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
        title: "Every line cites the drawings",
        line: "The steel is on page 8 of the engineering. Check any line against its page.",
      },
      {
        id: "s-fixed",
        kind: "note",
        target: "packages",
        title: "The client's budgets are fixed",
        line: "Landscaping carries $47,000 for every builder. Nobody looks cheaper by cutting it.",
      },
      {
        id: "s-start",
        kind: "click",
        target: "start-tender",
        title: "Ready",
        line: "Now price it.",
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
        line: "No cover letter. No formatting. The structure is the tender.",
      },
      {
        id: "t-mark",
        kind: "click",
        target: "mark-included",
        title: "Line by line",
        line: "Included, excluded, or a sum. Your answer lands in front of the client exactly as you give it.",
        prompt: "Click Included",
      },
      {
        id: "t-rfi",
        kind: "note",
        target: "rfi",
        title: "Ask, and everyone hears the answer",
        line: "Corten asked about the crossover. The answer went to all three builders as Addendum 01. Nobody prices on private information.",
      },
      {
        id: "t-declare",
        kind: "note",
        target: "declarations",
        title: "Declare it once",
        line: "Insurance, supervision, warranty, programme. Signed beside your price.",
      },
      {
        id: "t-submit",
        kind: "click",
        target: "submit",
        title: "Send it",
        line: "Your tender lands in the same structure as every other. Judged on what it says, not how it looks.",
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
        title: "Priced properly, read properly.",
        line: "You are not the cheapest. Watch what the client sees.",
      },
      {
        id: "c-land",
        kind: "watch",
        watchMs: 3800,
        title: "The round closes",
        line: "Corten and Brightwater submit. Three tenders, one structure.",
      },
      {
        id: "c-prices",
        kind: "note",
        target: "price-row",
        title: "The three prices",
        line: "You are $37,000 over the cheapest tender. Usually that is the whole story. Not here.",
      },
      {
        id: "c-gaps",
        kind: "note",
        target: "gaps",
        title: "The gaps are visible",
        line: "$82,500 of the cheapest price is not locked in. The client sees that, next to your locked price.",
      },
      {
        id: "c-scores",
        kind: "note",
        target: "receipts",
        title: "More than price",
        line: "Coverage, preparation, delivery. Every dimension scored, and your score shows its working.",
      },
      {
        id: "c-flags",
        kind: "note",
        target: "flags",
        title: "Nobody wins by leaving things out",
        line: "The missing driveway is flagged for the client. The same reading for everyone. Your tender drew no flags.",
      },
      {
        id: "c-outcome",
        kind: "click",
        target: "see-outcome",
        title: "A fair reading",
        line: "The client decides with everything visible.",
        prompt: "Click See the outcome",
      },
    ],
  },
  {
    id: "award",
    rail: "The award",
    steps: [
      {
        id: "a-open",
        kind: "intro",
        kicker: "Part 6 · The award",
        title: "The client chose.",
        line: "Your price was higher. Your tender was better. They could see it.",
      },
      {
        id: "a-won",
        kind: "note",
        target: "award",
        title: "Selected",
        line: "The client awards directly to you. The contract is between you and them.",
      },
      {
        id: "a-finish",
        kind: "click",
        target: "finish",
        title: "Start the build",
        line: "Everything from the round stays on the record, for both sides.",
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
  line: "The Hartley residence has awarded the project to you.",
  points: [
    "Contract signed directly between you and the client",
    "We take nothing from the build",
    "The round record stays available to both sides",
  ],
};

/* ── the close ──────────────────────────────────────────────────────── */

export const BUILDER_CLOSE: CloseCopy = {
  kicker: "That is the whole of it",
  title: "Tendering on a level field.",
  recap: [
    "You chose the round. The scope was already written",
    "Every builder priced the same list, and the gaps were visible",
    "The client read your tender properly, and awarded directly",
  ],
  truth:
    "Sign up, set your area and the work you take on, and see the open rounds that fit.",
  primary: { label: "Pick your next project", href: "/signup?role=builder" },
  secondary: { label: "Back to home", href: "/" },
};

export const BUILDER_DISCLAIMER = "Example project. Figures are illustrative.";

export const BUILDER_CRUMBS: Record<string, string> = {
  find: "Open rounds",
  project: "Two storey extension · Northcote",
  scope: "Scope of works",
  tender: "Your tender",
  compare: "The comparison",
  award: "The award",
  close: "Done",
};
