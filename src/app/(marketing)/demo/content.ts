/**
 * The demo script — every word, number and beat of the guided
 * walkthrough, in one file.
 *
 * VOICE. The person watching knows nothing about tendering, scopes,
 * or BuilderHQ. Every line is written so that anyone can follow it:
 * short sentences, everyday words, one idea at a time. Professional,
 * never clever. If a sentence needs reading twice, it is wrong.
 *
 * The rhythm is text first, then the interface: each stage opens
 * with a full-screen statement over the blurred surface, and inside a
 * stage every explanation sits beside the exact element it explains.
 *
 * Beat kinds:
 *   intro — the big centred statement over the blurred surface
 *   note  — a callout anchored beside the element it explains
 *   click — a callout anchored beside the one control to click
 *   watch — a quiet bottom card while the surface performs
 *
 * TRUTH RULES. The three builders are the personas seeded into every
 * new account's example round, so the close can honestly promise a
 * worked example round LIKE this one. All figures are internally
 * consistent (a test pins the arithmetic, the weighted scores, and
 * the decision grid) and marked illustrative. The reading is
 * compressed and the script says so. No em dashes in rendered copy;
 * Australian English.
 */

/* ── the walkthrough shape ──────────────────────────────────────────── */

export type StepKind = "intro" | "note" | "click" | "watch";

export interface DemoStep {
  id: string;
  kind: StepKind;
  /** data-demo-target of the element this beat anchors to. */
  target?: string;
  /** Watch beats: how long the beat plays before it completes. */
  watchMs?: number;
  /** Intro beats: the small line above the title. */
  kicker?: string;
  title: string;
  line: string;
  /** Click beats: the short imperative inside the callout. */
  prompt?: string;
}

export interface DemoStage {
  id: string;
  /** Short label on the progress rail. */
  rail: string;
  steps: DemoStep[];
}

/* ── the demo project ───────────────────────────────────────────────── */

export const DEMO_PROJECT = {
  title: "Single dwelling · Doreen, VIC",
  facts: "4 bedrooms · 2 bathrooms · 2 storeys · $1m to $1.5m",
};

export const DEMO_DOCUMENTS: Array<{
  name: string;
  pages: number;
  kind: string;
}> = [
  { name: "Architectural set, Rev C", pages: 54, kind: "Architectural" },
  { name: "Structural engineering", pages: 18, kind: "Structural" },
  { name: "Soil report", pages: 22, kind: "Geotechnical · Class H1" },
  { name: "Energy assessment", pages: 14, kind: "NatHERS · 7.1 stars" },
  { name: "Feature and level survey", pages: 6, kind: "Survey" },
  { name: "Specifications", pages: 48, kind: "Specification" },
  { name: "Window and door schedule", pages: 12, kind: "Schedule" },
  { name: "Civil and stormwater design", pages: 21, kind: "Civil" },
  { name: "Town planning drawings", pages: 16, kind: "Planning" },
];

export const DEMO_TOTALS = {
  documents: 9,
  pages: 211,
  items: 242,
  trades: 29,
  evidenced: 218,
  builderPriced: 24,
};

/** The division opened during the scope stage: windows, priced to
 *  the schedule and the energy assessment. Two documents behind one
 *  line of scope, and a cost the reader already worries about. */
export const DEMO_DIVISION = {
  label: "Windows and external glazing",
  count: 6,
  lines: [
    {
      label: "Aluminium windows to the schedule",
      note: "Every window priced to its scheduled size and finish, W01 to W18.",
      cite: "Window and door schedule, page 2",
    },
    {
      label: "Double glazing throughout",
      note: "Low e double glazing, priced to the 7.1 star energy assessment.",
      cite: "Energy assessment, page 5",
    },
  ],
};

export const DEMO_SCOPE_DIVISIONS = [
  { label: "Preliminaries and site establishment", count: 14 },
  { label: "Approvals, certification and compliance", count: 11 },
  { label: "Demolition and site clearing", count: 6 },
  { label: "Earthworks and excavation", count: 8 },
  { label: "Footings and ground floor structure", count: 7 },
  { label: "Framing", count: 8 },
];
export const DEMO_SCOPE_DIVISIONS_AFTER = [
  { label: "Roofing and roof plumbing", count: 7 },
  { label: "Electrical and data", count: 10 },
];
export const DEMO_SCOPE_MORE = "22 more sections, all written the same way";

/**
 * The budgets for what is not decided yet, each with the reasoning
 * the product itself gives. Landscaping is the one the visitor sets;
 * the other two arrive set, so the pattern shows without three
 * identical clicks.
 */
export const DEMO_PACKAGES = [
  {
    id: "appliances",
    title: "Appliances",
    covers: "Ovens, cooktops, rangehoods and dishwashers.",
    why: "Homes like this usually set aside 1 to 2.5 percent of the budget.",
    amount: 18_000,
    preset: true,
  },
  {
    id: "flooring",
    title: "Floor coverings",
    covers: "Boards, carpet and laminate to the drawn areas.",
    why: "Homes like this usually set aside 2 to 3.5 percent of the budget.",
    amount: 28_000,
    preset: true,
  },
  {
    id: "landscaping",
    title: "Landscaping",
    covers: "Garden beds and planting · Turf and lawn areas · Irrigation",
    why: "Homes around $1.25m usually put 3 to 5 percent into the garden. We suggest $47,000.",
    amount: 47_000,
    preset: false,
  },
];

export const DEMO_BUILDERS = [
  { name: "Corten Building Co", initials: "CB" },
  { name: "Meridian Homes", initials: "MH" },
  { name: "Brightwater Projects", initials: "BP" },
];

/** What every builder answers, beyond the scope itself. */
export const DEMO_ASKS = [
  "Insurance",
  "Who runs the site",
  "Warranty and defects period",
  "Variations in writing",
  "Start date and build time",
  "References",
];

/**
 * The comparison. All arithmetic is real and pinned by a test:
 * saving 685,000 − 648,000 = 37,000; Corten's own exposure 82,500;
 * 37,000 / 82,500 = 44.8%, spoken as 45. Brightwater step-up
 * 728,000 − 685,000 = 43,000. Each overall equals its weighted
 * dimension scores, rounded. The grid agrees with the tender data.
 */
export const DEMO_DIMENSIONS = [
  { label: "Price firmness", weight: 25 },
  { label: "Scope coverage", weight: 25 },
  { label: "Preparation", weight: 15 },
  { label: "Credentials", weight: 15 },
  { label: "Delivery", weight: 12 },
  { label: "Programme", weight: 8 },
];

export const DEMO_TENDERS = [
  {
    name: "Corten Building Co",
    initials: "CB",
    price: 648_000,
    overall: 62,
    dims: [55, 72, 58, 60, 62, 58],
    firmPct: 87,
    movingAud: 82_500,
    landscaping: "Your $47,000",
    driveway: "Not included",
    fullyPriced: false,
  },
  {
    name: "Meridian Homes",
    initials: "MH",
    price: 685_000,
    overall: 84,
    dims: [90, 98, 72, 70, 84, 70],
    firmPct: 100,
    movingAud: 0,
    landscaping: "Your $47,000",
    driveway: "Included",
    fullyPriced: true,
  },
  {
    name: "Brightwater Projects",
    initials: "BP",
    price: 728_000,
    overall: 81,
    dims: [82, 94, 64, 80, 90, 60],
    firmPct: 100,
    movingAud: 0,
    landscaping: "Your $47,000",
    driveway: "Included",
    fullyPriced: true,
  },
] as const;

/** Meridian's price firmness, opened: the receipts behind one score. */
export const DEMO_RECEIPTS = {
  builder: "Meridian Homes",
  dimension: "Price firmness",
  score: 90,
  lines: [
    { value: "+100", label: "every tender starts fully firm" },
    { value: "·", label: "no allowances of its own, held" },
    { value: "·", label: "carries your stated budgets, no deduction" },
    { value: "−10", label: "capped rise and fall clause" },
  ],
};

/**
 * The decision grid: the differences that matter, side by side.
 * Values must agree with DEMO_TENDERS where they overlap; a test
 * checks it.
 */
export const DEMO_GRID: Array<{
  label: string;
  vals: [string, string, string];
  differs: boolean;
}> = [
  { label: "Price ex GST", vals: ["$648,000", "$685,000", "$728,000"], differs: true },
  { label: "Every line priced", vals: ["No", "Yes", "Yes"], differs: true },
  { label: "Driveway", vals: ["Not included", "Included", "Included"], differs: true },
  { label: "Defects period", vals: ["12 months", "12 months", "24 months"], differs: true },
  { label: "Dedicated site supervisor", vals: ["No", "No", "Yes"], differs: true },
  { label: "Damages if handover is late", vals: ["No", "No", "Yes"], differs: true },
  { label: "Your garden budget", vals: ["$47,000", "$47,000", "$47,000"], differs: false },
];

/** Anything risky gets a flag, and every flag comes with the
 *  question to ask that builder. */
export const DEMO_FLAGS = [
  {
    builder: "Corten Building Co",
    label: "The driveway is not in the price",
    ask: "Ask Corten what adding the driveway back would cost.",
  },
  {
    builder: "Corten Building Co",
    label: "$82,500 of the price can still change",
    ask: "Ask Corten which of those figures they would lock in today.",
  },
  {
    builder: "Brightwater Projects",
    label: "The 24 month defects period is a promise",
    ask: "Ask Brightwater to put the 24 months in the contract.",
  },
];

export const DEMO_COMPARE = {
  saving: 37_000,
  exposure: 82_500,
  breakevenPct: 45,
  stepUp: 43_000,
  stepUpBuys: [
    "24 month defects period instead of 12",
    "A dedicated site supervisor",
    "Damages payable if handover runs late",
  ],
};

export const fmtAud = (n: number) => `$${n.toLocaleString("en-AU")}`;

/* ── the homeowner script ───────────────────────────────────────────── */

export const HOMEOWNER_SCRIPT: DemoStage[] = [
  {
    id: "upload",
    rail: "Upload",
    steps: [
      {
        id: "u-open",
        kind: "intro",
        kicker: "Part 1 · Upload",
        title: "It starts with your plans.",
        line: "You upload them. We do the rest.",
      },
      {
        id: "u-add",
        kind: "click",
        target: "add-plans",
        title: "Add your plans",
        line: "The PDFs from your architect are all we need.",
        prompt: "Click Add your plans",
      },
      {
        id: "u-register",
        kind: "note",
        target: "register",
        title: "We know what each file is",
        line: "Plans, engineering, reports. Everything is named and counted for you.",
      },
      {
        id: "u-round",
        kind: "click",
        target: "choose-open",
        title: "You choose who can quote",
        line: "Invite your own builders, open the round to verified builders, or do both.",
        prompt: "Choose Open to verified builders",
      },
      {
        id: "u-send",
        kind: "click",
        target: "start-reading",
        title: "That is it from you",
        line: "Now we take over.",
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
        title: "We read every page.",
        line: "All of them. Properly.",
      },
      {
        id: "r-watch",
        kind: "watch",
        watchMs: 5600,
        title: "211 pages, one by one",
        line: "Every line we write down says which page it came from. Nothing is made up.",
      },
      {
        id: "r-check",
        kind: "note",
        target: "human-check",
        title: "How it works",
        line: "Our software reads every page of your plans, writes out each item of work, and checks it. One business day, and your scope of works is ready.",
      },
      {
        id: "r-done",
        kind: "click",
        target: "open-scope",
        title: "Done",
        line: "Come and see what we wrote.",
        prompt: "Click Open your scope of works",
      },
    ],
  },
  {
    id: "scope",
    rail: "Your scope",
    steps: [
      {
        id: "s-open",
        kind: "intro",
        kicker: "Part 3 · Your scope of works",
        title: "Your whole build, written out.",
        line: "We read every page of your plans and list every item of work. Every builder prices that same list.",
      },
      {
        id: "s-expand",
        kind: "click",
        target: "expand-division",
        title: "Look inside",
        line: "Open a section and see the detail.",
        prompt: "Open Windows and external glazing",
      },
      {
        id: "s-cite",
        kind: "note",
        target: "division-lines",
        title: "Every line points back to your plans",
        line: "The windows are on page 2 of your window schedule. Each line names its page, so you can check any of it yourself.",
      },
      {
        id: "s-allow",
        kind: "note",
        target: "packages",
        title: "We catch what your plans leave out",
        line: "The garden is not drawn yet, so we flag it and you set one budget. We suggest a fair number from homes like yours.",
      },
      {
        id: "s-budget",
        kind: "click",
        target: "set-budget",
        title: "Set the garden budget",
        line: "One number, carried by every builder, so the quotes stay comparable.",
        prompt: "Click Set budget",
      },
      {
        id: "s-publish",
        kind: "click",
        target: "publish",
        title: "You are in control",
        line: "Builders see nothing until you approve it.",
        prompt: "Click Approve and publish",
      },
    ],
  },
  {
    id: "live",
    rail: "Going live",
    steps: [
      {
        id: "l-open",
        kind: "intro",
        kicker: "Part 4 · Going live",
        title: "Now the builders come in.",
        line: "They all price your list. Not their own guesses.",
      },
      {
        id: "l-hidden",
        kind: "note",
        target: "builder-view",
        title: "Your address stays private",
        line: "Builders see the project, not your street. They only get the address after they take a spot.",
      },
      {
        id: "l-fill",
        kind: "watch",
        watchMs: 4600,
        title: "Only verified builders",
        line: "We check their ABN and their building licence first. You chose three spots for this project, and that number is up to you.",
      },
      {
        id: "l-go",
        kind: "click",
        target: "see-tendering",
        title: "Your project is live",
        line: "Watch what the builders do.",
        prompt: "Click See what the builders do",
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
        title: "Every builder answers the same questions.",
        line: "So you can truly compare them.",
      },
      {
        id: "t-marks",
        kind: "note",
        target: "marking",
        title: "Line by line",
        line: "Each builder marks every item we identified, so nothing is left out. Included, excluded, or an allowance.",
      },
      {
        id: "t-asks",
        kind: "note",
        target: "asks",
        title: "We ask everything for you",
        line: "Insurance, who runs the site, warranty, timing, and plenty more. All the chasing you would normally do, done.",
      },
      {
        id: "t-land",
        kind: "watch",
        watchMs: 4400,
        title: "Three quotes, one format",
        line: "Each arrives as a full document, with the builder's profile and checks behind it.",
      },
      {
        id: "t-go",
        kind: "click",
        target: "open-comparison",
        title: "All in",
        line: "Time to compare them.",
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
        title: "The cheapest quote stops winning by default.",
        line: "Three quotes for the same work, and what sits behind each price, side by side.",
      },
      {
        id: "c-prices",
        kind: "note",
        target: "price-row",
        title: "The prices",
        line: "$648,000. $685,000. $728,000. Same list of work, so the gaps are real.",
      },
      {
        id: "c-scores",
        kind: "click",
        target: "show-scores",
        title: "Every quote gets a score",
        line: "Six things that matter, scored the same way for everyone.",
        prompt: "Click Show the scores",
      },
      {
        id: "c-receipts",
        kind: "note",
        target: "receipts",
        title: "Every score is explained",
        line: "Open any score and see exactly how it was worked out.",
      },
      {
        id: "c-differ",
        kind: "click",
        target: "show-differences",
        title: "So where do they differ?",
        line: "We read every line of all three quotes for you.",
        prompt: "Click Where they differ",
      },
      {
        id: "c-grid",
        kind: "note",
        target: "grid",
        title: "Side by side",
        line: "The differences that matter, in one table. The highlighted rows are the ones to look at.",
      },
      {
        id: "c-moving",
        kind: "note",
        target: "breakeven",
        title: "Watch the cheapest quote",
        line: "$82,500 of Corten's price can still change. If it grows 45 percent, your saving is gone. We did that maths for you.",
      },
      {
        id: "c-ladder",
        kind: "note",
        target: "ladder",
        title: "What more money buys",
        line: "Brightwater costs $43,000 more than Meridian. Here is exactly what you get for it.",
      },
      {
        id: "c-flags",
        kind: "click",
        target: "show-flags",
        title: "Anything risky gets flagged",
        line: "Nothing hides in the fine print.",
        prompt: "Click Show the flags",
      },
      {
        id: "c-questions",
        kind: "note",
        target: "flags",
        title: "And we write your questions",
        line: "Every flag comes with the exact question to ask that builder. Ready to send.",
      },
      {
        id: "c-finish",
        kind: "click",
        target: "finish",
        title: "Your decision, made clear",
        line: "We never pick for you. We just make sure nothing is hidden from you.",
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

/* ── the close ──────────────────────────────────────────────────────── */

export const DEMO_CLOSE = {
  kicker: "That is the whole of it",
  title: "You just ran a full tender.",
  recap: [
    "Your plans became a complete list of every item of work",
    "Builders priced that same list, so nothing could be quietly left out",
    "You saw exactly what each quote covers, and what it does not",
  ],
  truth:
    "Sign up and we will walk you through your first project, start to finish. Your plans are all you need.",
  primary: { label: "Start your project", href: "/signup?role=owner" },
  secondary: { label: "Back to home", href: "/" },
};

export const DEMO_DISCLAIMER = "Example project. Figures are illustrative.";
