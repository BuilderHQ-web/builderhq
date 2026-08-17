/**
 * The demo script — every word, number and beat of the guided
 * walkthrough, in one file.
 *
 * The rhythm is the one the homepage explainers taught: TEXT FIRST,
 * then the interface. Every stage opens with a full-screen statement
 * over the blurred surface, and inside a stage each explanation is
 * anchored to the exact element it describes. Nobody should ever have
 * to work out what they are looking at.
 *
 * Beat kinds:
 *   intro — the big centred statement over the blurred surface
 *   note  — an anchored callout beside the element it explains
 *   click — an anchored callout asking for one real click
 *   watch — a quiet bottom card while the surface performs
 *
 * TRUTH RULES. The three builders are the personas seeded into every
 * new account's example round, so the close can honestly promise a
 * worked example round LIKE this one; it never claims identity. All
 * figures are internally consistent (a test pins the arithmetic,
 * including the weighted scores) and marked illustrative. The reading
 * is compressed and the script says so. No em dashes in rendered
 * copy; Australian English.
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

/** Who can tender — the choice made during upload. */
export const DEMO_ROUND_CHOICES = [
  {
    id: "open",
    label: "Open to verified builders",
    sub: "Builders near you take the spots",
  },
  {
    id: "invite",
    label: "Invite your own",
    sub: "Only builders you choose",
  },
  { id: "both", label: "Both", sub: "Your builders plus ours" },
];

/** The division opened during the scope stage. */
export const DEMO_DIVISION = {
  label: "Footings and ground floor structure",
  count: 7,
  lines: [
    {
      label: "Waffle pod slab",
      note: "300mm waffle pods with an 85mm slab, priced to the engineering.",
      cite: "Structural engineering, page 6, Rev B",
    },
    {
      label: "Edge beams and set-downs",
      note: "Edge beams and wet area set-downs as detailed.",
      cite: "Structural engineering, page 7, Rev B",
    },
  ],
};

/** The divisions listed around it, in build order. */
export const DEMO_SCOPE_DIVISIONS = [
  { label: "Preliminaries and site establishment", count: 14 },
  { label: "Approvals, certification and compliance", count: 11 },
  { label: "Demolition and site clearing", count: 6 },
  { label: "Earthworks and excavation", count: 8 },
];
export const DEMO_SCOPE_DIVISIONS_AFTER = [
  { label: "Framing", count: 8 },
  { label: "Roofing and roof plumbing", count: 7 },
  { label: "Windows and external glazing", count: 6 },
  { label: "Electrical and data", count: 10 },
];
export const DEMO_SCOPE_MORE = "22 more divisions, written the same way";

/**
 * The provisional sum packages, each with the reasoning the product
 * itself gives: what homes of this type and budget usually allow.
 * Landscaping is the one the visitor sets; the other two arrive set,
 * so the pattern is visible without three identical clicks.
 */
export const DEMO_PACKAGES = [
  {
    id: "appliances",
    title: "Appliances",
    covers: "Ovens, cooktops, rangehoods and dishwashers.",
    why: "Homes like this usually allow 1 to 2.5 percent of the budget.",
    amount: 18_000,
    preset: true,
  },
  {
    id: "flooring",
    title: "Floor coverings",
    covers: "Boards, carpet and laminate to the drawn areas.",
    why: "Homes like this usually allow 2 to 3.5 percent of the budget.",
    amount: 28_000,
    preset: true,
  },
  {
    id: "landscaping",
    title: "Landscaping",
    covers: "Garden beds and planting · Turf and lawn areas · Irrigation",
    why: "Single dwellings around $1.25m usually put 3 to 5 percent into the garden, so a figure is suggested for you.",
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
  "Defects period",
  "Variations in writing",
  "Programme and start date",
  "References",
];

/**
 * The comparison. All arithmetic is real and pinned by a test:
 * saving 685,000 − 648,000 = 37,000; Corten's own exposure 82,500;
 * 37,000 / 82,500 = 44.8%, spoken as 45. Brightwater step-up
 * 728,000 − 685,000 = 43,000. Each overall equals its weighted
 * dimension scores, rounded.
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
    driveway: "Excluded",
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
    { value: "·", label: "carries your stated packages, no deduction" },
    { value: "−10", label: "capped rise and fall clause" },
  ],
};

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

/** The questions the round writes for you, before you decide. */
export const DEMO_QUESTIONS = [
  "Ask Corten what adding the driveway back would cost.",
  "Ask Corten which allowances they would fix if the documents were final.",
  "Ask Brightwater whether the 24 month defects period is written into the contract.",
];

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
        line: "Upload what you already have. The answers come from there.",
      },
      {
        id: "u-add",
        kind: "click",
        target: "add-plans",
        title: "Add your plans",
        line: "PDFs from your architect, exactly as they came.",
        prompt: "Click Add your plans",
      },
      {
        id: "u-register",
        kind: "note",
        target: "register",
        title: "Every file, recognised",
        line: "Plans, engineering, the soil report. Each one is named the moment it lands, so you can see what your round will be priced from.",
      },
      {
        id: "u-round",
        kind: "click",
        target: "choose-open",
        title: "Who can tender?",
        line: "Open it to verified builders near you, invite builders you already trust, or both.",
        prompt: "Choose Open to verified builders",
      },
      {
        id: "u-send",
        kind: "click",
        target: "start-reading",
        title: "That is all we need",
        line: "From here, the platform does the work.",
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
        line: "Not skimmed. Read.",
      },
      {
        id: "r-watch",
        kind: "watch",
        watchMs: 5600,
        title: "211 pages, line by line",
        line: "Nothing is measured off the drawings and nothing is guessed. Every line taken from your documents cites the page it came from.",
      },
      {
        id: "r-check",
        kind: "note",
        target: "human-check",
        title: "Then a person checks it",
        line: "Someone at BuilderHQ reviews the pack before it reaches you. It takes seconds in the demo; allow a little longer in real life.",
      },
      {
        id: "r-done",
        kind: "click",
        target: "open-scope",
        title: "Ready",
        line: "See what it wrote.",
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
        title: "Your whole build, written down.",
        line: "242 items in plain English. This is the one list every builder prices.",
      },
      {
        id: "s-expand",
        kind: "click",
        target: "expand-division",
        title: "Open a section",
        line: "See what sits inside.",
        prompt: "Open Footings and ground floor structure",
      },
      {
        id: "s-cite",
        kind: "note",
        target: "division-lines",
        title: "Every line shows its source",
        line: "The slab is on page 6 of your engineering, so that is what the line says. If a line is ever wrong, you can check it against your own documents.",
      },
      {
        id: "s-allow",
        kind: "note",
        target: "packages",
        title: "Where your documents stop",
        line: "A few choices are not documented yet, so you set a budget for each. The suggestions come from what homes like yours usually allow.",
      },
      {
        id: "s-budget",
        kind: "click",
        target: "set-budget",
        title: "Set the garden budget",
        line: "One figure for the whole package. Every builder carries the same number, so it never decides the comparison.",
        prompt: "Click Set budget",
      },
      {
        id: "s-publish",
        kind: "click",
        target: "publish",
        title: "Nothing goes out without you",
        line: "Builders see this only after you approve it.",
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
        title: "Now it goes to the builders.",
        line: "Exactly as you approved it. Every builder prices this same scope, so the quotes can finally be compared.",
      },
      {
        id: "l-hidden",
        kind: "note",
        target: "builder-view",
        title: "Your address stays hidden",
        line: "Builders see the project, not the street. The address is shared only when a builder secures a spot.",
      },
      {
        id: "l-fill",
        kind: "watch",
        watchMs: 4600,
        title: "Verified builders take the spots",
        line: "ABN checked against the Australian Business Register, building licence verified. You chose three spots for this round; that number is yours to set.",
      },
      {
        id: "l-go",
        kind: "click",
        target: "see-tendering",
        title: "The round is live",
        line: "Here is what the builders do next.",
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
        title: "Same scope. Same questions.",
        line: "Quotes usually arrive in different shapes, built on different assumptions. Not here.",
      },
      {
        id: "t-marks",
        kind: "note",
        target: "marking",
        title: "Every line, answered",
        line: "Each builder goes through your scope and declares what their price does with every item: included, an allowance, or excluded. Nothing stays vague.",
      },
      {
        id: "t-asks",
        kind: "note",
        target: "asks",
        title: "And the questions you would not think to ask",
        line: "Insurance, who runs the site, the defects period, variations in writing, programme. Their answers go on the record with the price.",
      },
      {
        id: "t-land",
        kind: "watch",
        watchMs: 4400,
        title: "Three tenders, one shape",
        line: "Each arrives as a complete document, with the builder's profile and verification behind it.",
      },
      {
        id: "t-go",
        kind: "click",
        target: "open-comparison",
        title: "Now the good part",
        line: "This is what the whole platform exists for.",
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
        title: "This is where it pays off.",
        line: "Three prices for the same work, read properly.",
      },
      {
        id: "c-prices",
        kind: "note",
        target: "price-row",
        title: "Three prices you can trust to mean something",
        line: "Corten $648,000. Meridian $685,000. Brightwater $728,000. Same scope, so the gaps are real differences, not different guesses.",
      },
      {
        id: "c-scores",
        kind: "click",
        target: "show-scores",
        title: "Every tender is scored",
        line: "Six things that matter, weighted the same way for everyone.",
        prompt: "Click Show the scores",
      },
      {
        id: "c-receipts",
        kind: "note",
        target: "receipts",
        title: "And every score shows its working",
        line: "Open any score and you see exactly what earned it and what cost it. No verdicts from us, just the builder's own answers, added up.",
      },
      {
        id: "c-differ",
        kind: "click",
        target: "show-differences",
        title: "Where they differ",
        line: "The comparison reads every line of all three so you do not have to.",
        prompt: "Click Where they differ",
      },
      {
        id: "c-moving",
        kind: "note",
        target: "breakeven",
        title: "$82,500 of the cheapest price can still move",
        line: "Corten left the driveway out and kept $82,500 in allowances of its own. If those run 45 percent over, the $37,000 saving is gone. That arithmetic is done for you.",
      },
      {
        id: "c-ladder",
        kind: "note",
        target: "ladder",
        title: "What paying more buys",
        line: "Brightwater's extra $43,000, itemised. Worth it or not, at least you can see it.",
      },
      {
        id: "c-questions",
        kind: "click",
        target: "show-questions",
        title: "It even writes your questions",
        line: "Before you decide, you get the exact questions worth putting to each builder.",
        prompt: "Click Questions to ask",
      },
      {
        id: "c-finish",
        kind: "click",
        target: "finish",
        title: "Your decision, with everything in view",
        line: "Nothing here is a verdict. Every figure traces back to the tenders themselves, so whichever builder you choose, you can defend the choice.",
        prompt: "Click Finish the round",
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
  title: "You just ran a tender round.",
  recap: [
    "Your documents became a 242 item scope of works, every documented line citing its page",
    "Three verified builders priced the same list",
    "The comparison showed you what each price covers",
  ],
  truth:
    "When you sign up, a worked example round like this one is waiting in your account, three tenders and all, so you can explore everything again before you upload a single document.",
  primary: { label: "Start your project", href: "/signup?role=owner" },
  secondary: { label: "Back to home", href: "/" },
};

export const DEMO_DISCLAIMER = "Example project. Figures are illustrative.";
