/**
 * The demo script — every word, number and beat of the guided
 * walkthrough, in one file.
 *
 * The demo is a faithful recreation of the product on the product's
 * own design tokens, but it is SCRIPTED: no page of the real app can
 * be at upload, analysis, review, live and compared at once, and a
 * demo must show all of them in four minutes. Keeping the entire
 * script here means keeping the demo current is editing data, never
 * surgery on components.
 *
 * TRUTH RULES. The three builders are the same three personas seeded
 * into every new account's example round, so the close can honestly
 * promise a worked example round LIKE this one; it never claims
 * identity, because the seeded project differs in its particulars.
 * All figures are internally consistent and clearly marked
 * illustrative. The reading is compressed and the script says
 * so. No em dashes in rendered copy; Australian English.
 */

/* ── the walkthrough shape ──────────────────────────────────────────── */

export type StepKind = "next" | "click" | "watch";

export interface DemoStep {
  id: string;
  kind: StepKind;
  /** data-demo-target of the control this step spotlights. */
  target?: string;
  /** Watch steps: how long the beat plays before it completes. */
  watchMs?: number;
  title: string;
  line: string;
  /** Click steps: the short imperative under the line. */
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

/** The provisional sum decision, mirroring the live product exactly:
 *  one figure for the package as a whole, member lines unnumbered. */
export const DEMO_PS = {
  title: "Landscaping",
  covers: ["Garden beds and planting", "Turf and lawn areas", "Irrigation"],
  suggested: 47_000,
};

export const DEMO_BUILDERS = [
  { name: "Corten Building Co", initials: "CB" },
  { name: "Meridian Homes", initials: "MH" },
  { name: "Brightwater Projects", initials: "BP" },
];

/**
 * The comparison. Arithmetic is real and checked by a test:
 * saving 685,000 − 648,000 = 37,000; Corten's own exposure 82,500;
 * 37,000 / 82,500 = 44.8%, spoken as 45. Brightwater step-up
 * 728,000 − 685,000 = 43,000.
 */
export const DEMO_TENDERS = [
  {
    name: "Corten Building Co",
    initials: "CB",
    price: 648_000,
    overall: 62,
    firmPct: 87,
    movingAud: 82_500,
    landscaping: "Carried at your $47,000",
    driveway: "Excluded",
    fullyPriced: false,
    tone: "risky" as const,
  },
  {
    name: "Meridian Homes",
    initials: "MH",
    price: 685_000,
    overall: 84,
    firmPct: 100,
    movingAud: 0,
    landscaping: "Carried at your $47,000",
    driveway: "Included",
    fullyPriced: true,
    tone: "firm" as const,
  },
  {
    name: "Brightwater Projects",
    initials: "BP",
    price: 728_000,
    overall: 81,
    firmPct: 100,
    movingAud: 0,
    landscaping: "Carried at your $47,000",
    driveway: "Included",
    fullyPriced: true,
    tone: "premium" as const,
  },
] as const;

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
        id: "u-intro",
        kind: "next",
        title: "Start with what you already have",
        line: "No forms to fill out first. Your architectural plans carry most of the answers, so the project starts with them.",
      },
      {
        id: "u-add",
        kind: "click",
        target: "add-plans",
        title: "Add the drawings",
        line: "PDFs straight from your architect are exactly what it expects.",
        prompt: "Click Add your plans",
      },
      {
        id: "u-register",
        kind: "next",
        title: "Nine documents, one register",
        line: "Each file is identified on sight: the architectural set, the engineering, the soil report. You can see exactly what your round will be priced from.",
      },
      {
        id: "u-send",
        kind: "click",
        target: "start-reading",
        title: "Send it for reading",
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
        id: "r-watch",
        kind: "watch",
        watchMs: 5600,
        title: "Every page, actually read",
        line: "All 211 pages are read line by line. Nothing is measured off the drawings and nothing is guessed: every line taken from your documents cites the page it came from.",
      },
      {
        id: "r-human",
        kind: "next",
        title: "Checked by a person",
        line: "Before you see anything, someone at BuilderHQ reviews what the reading found. The demo compresses this to seconds; in real life, allow a little longer.",
      },
      {
        id: "r-open",
        kind: "click",
        target: "open-scope",
        title: "Your pack is ready",
        line: "The reading wrote your build into a scope of works.",
        prompt: "Click Open your scope of works",
      },
    ],
  },
  {
    id: "scope",
    rail: "Your scope",
    steps: [
      {
        id: "s-intro",
        kind: "next",
        title: "The whole build, in plain English",
        line: "242 items across 29 trades, written from your documents. This one list is what every builder prices, so the quotes arrive on the same basis.",
      },
      {
        id: "s-expand",
        kind: "click",
        target: "expand-division",
        title: "Proof behind every line",
        line: "Nothing here is boilerplate.",
        prompt: "Open Footings and ground floor structure",
      },
      {
        id: "s-cite",
        kind: "next",
        title: "It cites its sources",
        line: "Each line states what your documents say and where. The waffle pod slab is on page 6 of your engineering, so that is what the line says.",
      },
      {
        id: "s-ps",
        kind: "click",
        target: "set-budget",
        title: "Your documents stop at the garden",
        line: "Nothing covers landscaping, so you set one budget for the package as a whole.",
        prompt: "Click Set budget",
      },
      {
        id: "s-ps-done",
        kind: "next",
        title: "One figure, carried by everyone",
        line: "Every builder carries your $47,000, so the garden never decides the comparison. The lines beneath it stay listed, without figures of their own.",
      },
      {
        id: "s-publish",
        kind: "click",
        target: "publish",
        title: "You approve before anyone sees it",
        line: "Nothing reaches a builder until you say so.",
        prompt: "Click Approve and publish",
      },
    ],
  },
  {
    id: "live",
    rail: "Going live",
    steps: [
      {
        id: "l-private",
        kind: "next",
        title: "Your address stays private",
        line: "Builders browse the project with the street address held back. It is shared only when a verified builder secures one of the spots you allowed.",
      },
      {
        id: "l-fill",
        kind: "watch",
        watchMs: 4600,
        title: "Three spots, verified builders only",
        line: "Every builder's ABN is checked against the Australian Business Register and their building licence is verified before they can tender. You chose three spots for this round; that number is yours to set, so it never becomes a scramble.",
      },
      {
        id: "l-next",
        kind: "click",
        target: "see-tendering",
        title: "The round is live",
        line: "Now the work moves to their side of the table.",
        prompt: "Click See what the builders do",
      },
    ],
  },
  {
    id: "tenders",
    rail: "Tenders",
    steps: [
      {
        id: "t-instrument",
        kind: "next",
        title: "No PDF quotes. The same questions for everyone",
        line: "Each builder walks your scope line by line and declares what their price does with every item: included, a provisional sum, or excluded. Nothing can be left vague.",
      },
      {
        id: "t-arrive",
        kind: "watch",
        watchMs: 4400,
        title: "Three tenders, one shape",
        line: "As they submit, every tender arrives in the same structure. That is what makes an honest comparison possible.",
      },
      {
        id: "t-open",
        kind: "click",
        target: "open-comparison",
        title: "Time to decide",
        line: "This is the part the whole platform exists for.",
        prompt: "Click Open the comparison",
      },
    ],
  },
  {
    id: "compare",
    rail: "The comparison",
    steps: [
      {
        id: "c-prices",
        kind: "next",
        title: "Three prices you can finally read",
        line: "Corten is cheapest at $648,000. Meridian priced every line at $685,000. Brightwater is the premium offer at $728,000. Same scope, so the differences are real.",
      },
      {
        id: "c-differ",
        kind: "click",
        target: "show-differences",
        title: "The cheapest quote is doing the least",
        line: "The comparison reads every line of all three.",
        prompt: "Click Where they differ",
      },
      {
        id: "c-moving",
        kind: "next",
        title: "$82,500 of Corten's price can still move",
        line: "Corten excluded the driveway and left $82,500 in allowances of its own. If those run 45 percent over, the $37,000 saving is gone. That arithmetic is done for you.",
      },
      {
        id: "c-ladder",
        kind: "next",
        title: "What paying more buys",
        line: "Brightwater's extra $43,000 buys a 24 month defects period, a dedicated site supervisor, and damages if handover runs late. Worth it or not, at least it is visible.",
      },
      {
        id: "c-finish",
        kind: "click",
        target: "finish",
        title: "Your decision, made with everything in view",
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

export const DEMO_DISCLAIMER =
  "Example project. Figures are illustrative.";
