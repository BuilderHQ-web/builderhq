/**
 * Landing v2 — the three-lens content system.
 *
 * One page, three lenses: the skeleton (hero → choose → problem → how →
 * trust → network → ecosystem → FAQ → close) never changes;
 * the words re-tune per audience, including Trust, which is fully
 * forked so every section speaks to its reader, never past them.
 *
 * Copy rules, enforced here so components stay dumb:
 *   · Every claim is literally true of the product today: the scope is
 *     written from the documents with a citation on every line, two
 *     human gates (operations, then the client) before it goes out,
 *     one structured instrument answered under signature, six
 *     published weighted dimensions in the comparison, ABN checked
 *     against the ABR and licences checked against the state register
 *     where one connects and by our team where one does not, one off
 *     $49–$199 for a spot on an open round, no commission either side.
 *   · Never claimed: accuracy figures, speed, volume, outcomes,
 *     quantities, estimates, or a recommended winner.
 *   · No em dashes, no exclamation marks, no hype words.
 *   · Curly apostrophes. Short sentences. Plain Australian English.
 */

export type Role = "homeowner" | "builder" | "architect";

export const ROLE_ORDER: Role[] = ["homeowner", "builder", "architect"];

export const ROLE_META: Record<
  Role,
  { chip: string; chipShort: string; dock: string }
> = {
  homeowner: { chip: "I’m a homeowner", chipShort: "Homeowner", dock: "For Homeowners" },
  builder: { chip: "I’m a builder", chipShort: "Builder", dock: "For Builders" },
  architect: { chip: "I’m a building designer", chipShort: "Building Designer", dock: "For Building Designers" },
};

type Cta = { label: string; href: string };

/**
 * The standard section head. Three levels, always in this order:
 *
 *   h2a / h2b  the plain topic, stated the way an industry body would
 *              state it. Rendered as two BLOCK lines, never wrapped by
 *              the browser, so a heading can never end on an orphan
 *              word. Keep each line short enough to fit its column at
 *              the largest clamp step (see the per-section notes).
 *   lead       the sharp line the topic used to be. Demoted, but still
 *              the sentence that lands.
 *   blurb      the supporting paragraph.
 *
 * Sections with a narrow heading column (trust, network) run
 * head-only: h2a, h2b and a paragraph. A third level in a 400px column
 * reads as clutter.
 */
export interface SectionHeadCopy {
  h2a: string;
  h2b: string;
  lead: string;
  /** Optional by design. A chapter that already carries columns of
   *  evidence under the head does not need a paragraph as well. */
  blurb?: string;
}

export type TrustIcon =
  | "shield"
  | "lock"
  | "scale"
  | "file"
  | "compass"
  | "tag"
  | "handshake"
  | "door";

export interface LensCopy {
  hero: {
    badge: string;
    h1a: string;
    h1b: string; // coloured second line
    /** One short, low-friction promise — reads the same on every
     *  breakpoint, so keep it around the two-line phone length. */
    sub: string;
    /** A second sentence, shown from sm upward only. The mobile hero
     *  stays at `sub` alone so it never crowds a phone. */
    subMore?: string;
    primary: Cta;
    secondary: Cta;
    /** Three instant answers under the CTAs — product facts only. */
    facts: string[];
  };
  problem: {
    head: SectionHeadCopy;
    /** Three structural failures of the way this is done today. */
    points: Array<{ claim: string; body: string }>;
    /** The hand-over to how-it-works. Set apart under its own rule, so
     *  it reads as the turn in the argument rather than a stray line. */
    bridge: { label: string; a: string; b: string };
  };
  spine: {
    head: SectionHeadCopy;
    steps: Array<{ title: string; headline: string; body: string }>;
  };
  trust: {
    h2a: string;
    h2b: string;
    intro: string;
    cards: Array<{ icon: TrustIcon; title: string; body: string }>;
    footer: string;
  };
  network: {
    h2a: string;
    h2b: string;
    body: string;
    bullets?: string[];
    cta: Cta | { label: string; switchTo: Role };
  };
  faq: Array<{ q: string; a: string }>;
  close: {
    h2a: string;
    h2b: string;
    sub: string;
    primary: Cta;
    trio: string[];
  };
}

// Partner "Join the network" CTAs. Sentinel hrefs, not links: the landing's
// <PartnerForm> intercepts clicks on these and opens the capture modal
// instead of navigating. Keep in sync with SENTINELS in partner-form.tsx.
// The finance sentinel is exported because the finance broker register is
// still live even though there is no finance lens on the landing page.
const ARCHITECT_JOIN_HREF = "#join-architect";
export const FINANCE_JOIN_HREF = "#join-finance";
const REQUEST_INTRO_HREF = "#request-intro";

export const LENS: Record<Role, LensCopy> = {
  /* ── HOMEOWNER — the default story. First time, largest cheque of
     their life, needs evidence rather than reassurance. ── */
  homeowner: {
    hero: {
      badge: "Residential tendering · Australia wide",
      h1a: "One scope.",
      h1b: "Three prices.",
      sub: "Upload your plans. Every builder prices the same list of works.",
      subMore: "You approve that list before a single builder sees it.",
      primary: { label: "Start your project", href: "/signup?role=owner" },
      secondary: { label: "See how it works", href: "#how" },
      facts: ["Free for homeowners", "You approve the scope", "Verified builders only"],
    },
    problem: {
      head: {
        h2a: "What is wrong with how",
        h2b: "homes get priced today.",
        lead: "Three builders price three different jobs.",
      },
      points: [
        {
          claim: "Every builder prices a different job",
          body: "One allows for the retaining wall. One leaves it out. One sets aside a rough figure.",
        },
        {
          claim: "The three quotes never line up",
          body: "Three formats, three sets of inclusions, and no way to tell which number is complete.",
        },
        {
          claim: "What nobody priced becomes a variation",
          body: "The cheapest quote is often the one that left the most out. The rest arrives later.",
        },
      ],
      bridge: {
        label: "The fix",
        a: "One list of works,",
        b: "priced by every builder.",
      },
    },
    spine: {
      head: {
        h2a: "From your plans",
        h2b: "to your builder.",
        lead: "Four steps, and you only do the first one.",
      },
      steps: [
        {
          title: "Upload",
          headline: "Start with your plans.",
          body: "Your drawings, your reports, whatever the designer gave you. A few details about the project, and your part is done.",
        },
        {
          title: "Your scope of works",
          headline: "Your plans become one list.",
          body: "We read every drawing, report and specification, and write out every item of work they cover. Plain English, and every line points at the page it came from. You approve it before anyone sees it.",
        },
        {
          title: "The same list, priced",
          headline: "Every builder prices that list.",
          body: "Verified builders take a spot on your round and walk your list line by line, then answer the same questions under signature. What comes back is the same shape from all of them.",
        },
        {
          title: "The comparison",
          headline: "See what each price actually covers.",
          body: "Six published weights, every flag raised, and every difference between the tenders set out item by item. You shortlist, you award, and the contract is yours.",
        },
      ],
    },
    trust: {
      h2a: "Every builder",
      h2b: "is checked.",
      intro:
        "Nobody prices your job anonymously, and every rule they price under is published before the round opens.",
      cards: [
        {
          icon: "shield",
          title: "Every builder is checked",
          body: "We check each builder’s ABN against the Australian Business Register, and their licence against the state register where one connects and by our team where it does not. A builder takes a spot on an open round only once both have passed. Insurances are declared under signature with the tender.",
        },
        {
          icon: "file",
          title: "Every line names its source",
          body: "Each line points to the document, page and revision it came from, and anything we cannot trace is removed. The pack cannot be approved while anything is unread, and nothing reaches a builder until you approve it.",
        },
        {
          icon: "scale",
          title: "Every tender is scored the same way",
          body: "Six published dimensions with fixed weights, applied to every tender on your round. Each score sets out the points earned and the points not earned, so you can see why one tender sits above another.",
        },
      ],
      footer:
        "The contract is signed directly between you and your builder.",
    },
    network: {
      h2a: "Need a designer,",
      h2b: "builder or broker?",
      body: "Our Preferred Partner register covers building designers, builders and finance brokers we know and work with. Tell us what you need and we will point you to the right one. No charge.",
      cta: { label: "Request an introduction", href: REQUEST_INTRO_HREF },
    },
    faq: [
      {
        q: "Is it really free for homeowners?",
        a: "Yes. Your scope of works, the tender round and the comparison cost nothing, and we take no commission. Builders pay a one off fee for a spot on an open round.",
      },
      {
        q: "Who writes the scope of works?",
        a: "BuilderHQ drafts it from your documents, our team reviews every line, and you approve it before any builder sees it. Anything the documents do not answer is put to you as a question.",
      },
      {
        q: "Does BuilderHQ price my project?",
        a: "No. We produce the scope, builders produce the prices. The platform never measures off a drawing, never estimates a cost, and never picks a winner.",
      },
      {
        q: "What does verified actually mean?",
        a: "We check every builder’s ABN against the Australian Business Register. Licences are checked against the state register where one connects, and by our team where one does not.",
      },
      {
        q: "Do I have to award the job through BuilderHQ?",
        a: "You award it directly with your builder, and the contract is between the two of you. The scope, the tenders and the comparison stay in your dashboard for both sides.",
      },
    ],
    close: {
      h2a: "Your build starts",
      h2b: "with the scope.",
      sub: "One scope, priced by every builder. Your decision.",
      primary: { label: "Start your project", href: "/signup?role=owner" },
      trio: [
        "Free for homeowners",
        "You approve the scope first",
        "No commission on your build",
      ],
    },
  },

  /* ── BUILDER — practical, estimating hours are the real cost, respects
     straight talk. Every fairness claim runs through the disclosure
     principle, never through other builders. ── */
  builder: {
    hero: {
      badge: "Live tender rounds",
      h1a: "Find work",
      h1b: "worth pricing.",
      sub: "Real projects, with the drawings in and the scope already written.",
      subMore: "Everyone on the round prices the same list, and the spots are capped.",
      primary: { label: "Pick your next project", href: "/signup?role=builder" },
      secondary: { label: "See how it works", href: "#how" },
      facts: ["Scope already written", "Capped rounds", "One off fee, no subscription"],
    },
    problem: {
      head: {
        h2a: "What is wrong with how",
        h2b: "work is won today.",
        lead: "Price every detail and you look expensive.",
      },
      points: [
        {
          claim: "Days of work before you price a thing",
          body: "Every tender starts by working out what the documents actually cover.",
        },
        {
          claim: "Doing it properly reads as a higher price",
          body: "Allow for the difficult ground, and the honest number reads worse than a vague one.",
        },
        {
          claim: "Nobody reads past the bottom line",
          body: "The work behind it, the programme and the exclusions never get looked at.",
        },
      ],
      bridge: {
        label: "The fix",
        a: "The scope arrives written,",
        b: "and the whole tender is read.",
      },
    },
    spine: {
      head: {
        h2a: "From the round you pick",
        h2b: "to the job you win.",
        lead: "Four steps, and the estimating groundwork is already done.",
      },
      steps: [
        {
          title: "Find your next project",
          headline: "Real projects, ready to price.",
          body: "Browse live rounds in your patch. The type, the suburb, the budget and how many spots are left, all visible before you spend a dollar.",
        },
        {
          title: "The scope is written",
          headline: "Nothing to assemble.",
          body: "Every item is written from the client’s documents and cited to the page it came from. You walk the list and mark each line, instead of losing two days working out what the drawings actually cover.",
        },
        {
          title: "Priced on more than the number",
          headline: "The lowest price does not win by default.",
          body: "Everyone prices the same list and answers the same questions, so your exclusions read as diligence rather than gaps. Six published weights, each one showing its working.",
        },
        {
          title: "Win the work",
          headline: "Win it, and keep all of it.",
          body: "One submission, one format, signed. If the client picks you, you contract with them directly. BuilderHQ takes no commission on the job, ever.",
        },
      ],
    },
    trust: {
      h2a: "Every builder",
      h2b: "is checked.",
      intro:
        "Everyone at the table is checked, and every rule the round runs on is published before it opens.",
      cards: [
        {
          icon: "shield",
          title: "Every builder is checked",
          body: "ABN against the Australian Business Register, licence against the state register where one connects and by our team where it does not. A spot on an open round opens only once both have passed, for you and for everyone you are priced against.",
        },
        {
          icon: "file",
          title: "Every line names its source",
          body: "Each line you price points to the document, page and revision it came from. Nothing is measured off a drawing. If the scope changes mid round, a numbered addendum goes to every builder at once.",
        },
        {
          icon: "scale",
          title: "Every tender is scored the same way",
          body: "Six published dimensions with fixed weights, applied to every tender on the round. Each score shows its working, so you could read your own evaluation without feeling ambushed.",
        },
      ],
      footer:
        "Your details are never sold or passed around. Rounds are capped, and you see the cap before you commit.",
    },
    network: {
      h2a: "The people your",
      h2b: "clients rely on.",
      body: "Building designers for the drawings, finance brokers for the lending. Our Preferred Partner register keeps them in one place, and when a job needs one we make the introduction.",
      cta: { label: "Meet our partners", switchTo: "architect" },
    },
    faq: [
      {
        q: "What does it cost?",
        a: "Browsing is free. A spot on an open round is a one off fee, from $49 for a renovation to $199 for multi dwelling work. No subscription, and no commission on what you win.",
      },
      {
        q: "Do I still have to work out the scope?",
        a: "No. The scope is written from the client’s documents and approved before the round opens. You walk the list and mark each line included, a provisional sum, excluded or not applicable.",
      },
      {
        q: "How is my tender assessed?",
        a: "On six published dimensions with fixed weights, the same for every builder. Every score shows its working, and an honest exclusion never reads worse than a vague inclusion.",
      },
      {
        q: "What do I need to be approved?",
        a: "An active ABN, checked against the Australian Business Register, and a current licence, checked against the state register where one connects and by our team where it does not.",
      },
      {
        q: "What if the scope changes mid round?",
        a: "A revised pack is issued as a numbered addendum to every builder at once, with the lines added, revised and removed listed, and the old pack marked superseded.",
      },
    ],
    close: {
      h2a: "Your next round is",
      h2b: "already open.",
      sub: "Prepared scope, capped rounds, tenders read in full.",
      primary: { label: "Pick your next project", href: "/signup?role=builder" },
      trio: [
        "Free to browse every round",
        "Pay only when you tender",
        "No commission on what you win",
      ],
    },
  },

  /* ── ARCHITECT — design literate, allergic to sales. Never implies a
     practice runs its rounds badly today, and never mentions referrals
     inside the tendering story. ── */
  architect: {
    hero: {
      badge: "For architects and designers",
      h1a: "Run the tender.",
      h1b: "Skip the admin.",
      sub: "Run your client’s tender, with your builders or ours.",
      subMore: "Every submission comes back in the same shape, under your practice’s name.",
      primary: { label: "Run a tender for your client", href: "/signup?role=architect" },
      secondary: { label: "See how it works", href: "#how" },
      facts: ["Free for practices", "Your builders or ours", "Your name on the evaluation"],
    },
    problem: {
      head: {
        h2a: "What is wrong with how",
        h2b: "tenders are run today.",
        lead: "A proper tender is unpaid work.",
      },
      points: [
        {
          claim: "Someone has to write the scope",
          body: "Without one shared list, each builder prices their own reading of the drawings.",
        },
        {
          claim: "Comparing submissions is unpaid work",
          body: "Someone in the practice reconciles three formats before the client can be advised.",
        },
        {
          claim: "Your name is on the recommendation",
          body: "It has to be defensible long after the round closes.",
        },
      ],
      bridge: {
        label: "The fix",
        a: "The round runs here.",
        b: "The judgement stays with you.",
      },
    },
    spine: {
      head: {
        h2a: "From your drawings",
        h2b: "to your recommendation.",
        lead: "Four steps, none of them evenings.",
      },
      steps: [
        {
          title: "Upload",
          headline: "Upload once, for your client.",
          body: "Your drawings, reports and specifications go up in one place. No brief to write, no pack to assemble, no builders to chase for a price.",
        },
        {
          title: "The list, and who prices it",
          headline: "We write the list. You choose who sees it.",
          body: "Every item is drafted from your documents and cited to its page, then your client approves it. Keep the round to builders you trust, open it to the verified network, or run both at once.",
        },
        {
          title: "The same list, priced",
          headline: "Every submission in the same shape.",
          body: "Same list, same questions, answered under signature. Nothing to normalise afterwards, and no evening spent lining up three documents that were never written to match.",
        },
        {
          title: "Your recommendation",
          headline: "Hand your client the answer.",
          body: "The scoring, the flags and every difference between the tenders are already set out on six published weights. You add the judgement, your practice’s name goes on it, and it holds up long after the round closes.",
        },
      ],
    },
    trust: {
      h2a: "Every builder",
      h2b: "is checked.",
      intro:
        "Nobody prices your client’s job anonymously, and every rule is published before the round opens.",
      cards: [
        {
          icon: "shield",
          title: "Every builder is checked",
          body: "ABN against the Australian Business Register, licence against the state register where one connects and by our team where it does not. A builder joins an open round only once both have passed. A builder you invite joins on your say so, and their verification status is shown on the round either way.",
        },
        {
          icon: "file",
          title: "Every line names its source",
          body: "Each line names the document, page and revision it came from. Anything we cannot trace is removed before your client sees it, and a revised pack goes to every builder at once as a numbered addendum.",
        },
        {
          icon: "scale",
          title: "Every tender is scored the same way",
          body: "Six dimensions, fixed weights, the same for every tender on the round. Each score shows the points earned and the points available and not earned, so any line of it can be defended.",
        },
      ],
      footer:
        "The round is yours, and the contract is your client’s.",
    },
    network: {
      h2a: "What our partner",
      h2b: "practices receive.",
      body: "The Preferred Partner register exists to make good practices easier to find. Partners receive, at no cost:",
      bullets: [
        "A place in the BuilderHQ Preferred Partner register",
        "Your projects featured across our channels, always credited",
        "An introduction when an owner asks us for a designer",
        "The monthly BuilderHQ market update",
        "First look at what we build next",
      ],
      cta: { label: "Join the network", href: ARCHITECT_JOIN_HREF },
    },
    faq: [
      {
        q: "What does it cost a practice?",
        a: "Nothing. Running rounds for your clients is free, and BuilderHQ takes no commission. Builders pay a one off fee for a spot on an open round.",
      },
      {
        q: "Can we use our own builders?",
        a: "Yes. A round can stay private to builders you invite, at no cost to them, or run open to the verified network, or both at once.",
      },
      {
        q: "Whose name is on the evaluation?",
        a: "Yours. The round belongs to your practice, and every action is recorded against the person who took it. Your client can sit on the round as a viewer or a decision maker.",
      },
      {
        q: "Does BuilderHQ recommend a builder?",
        a: "No. It scores, flags and compares, and sets out every difference between the tenders. The recommendation and the decision stay with you and your client.",
      },
      {
        q: "What if the documents are incomplete?",
        a: "Each scope line is marked full or partial, and a partial line states exactly what is still missing. The pack also says whether it supports a fixed price or a budget.",
      },
    ],
    close: {
      h2a: "The tender,",
      h2b: "without the admin.",
      sub: "Run the round. Keep the judgement.",
      primary: { label: "Run a tender for your client", href: "/signup?role=architect" },
      trio: [
        "Free for practices",
        "Open or private rounds",
        "No commission, either side",
      ],
    },
  },
};

/* ── Shared, never forked: the brand spine. ────────────────────────── */

export const ECOSYSTEM = {
  h2a: "Every side of",
  h2b: "the same build.",
  sub: "One platform, where Australia’s residential builds get organised.",
  columns: [
    {
      who: "Homeowners",
      bring: "bring the project",
      line: "Plans in, tenders back, compared properly.",
    },
    {
      who: "Building designers",
      bring: "bring the design",
      line: "Tenders run under the practice’s name.",
    },
    {
      who: "Builders",
      bring: "bring it to life",
      line: "One list to price, no commission.",
    },
    {
      who: "Finance brokers",
      bring: "back the build",
      line: "Introduced when a client needs lending.",
    },
  ],
} as const;

/* ── Per-role palette — the single canvas keeps its deep base; only the
   ambient light shifts, so switching lens feels like the room's lighting
   changing, never a different page. Teal stays the brand action colour on
   every lens (buttons, logo); these hues drive eyebrows, the selected
   role, the ambient glows and the transition wash.

   Keyed a little wider than Role: the finance hue has no lens on the
   landing page, but the Preferred Partner register still renders finance
   partners in it. ──────────────────────────────────────────────────── */
export type PaletteKey = Role | "finance";

export const ROLE_PALETTE: Record<
  PaletteKey,
  {
    name: string;
    accent: string; // eyebrow / role hue
    accentSoft: string; // brighter tint for gradients
    glow1: string; // primary ambient bloom (top-left)
    glow2: string; // secondary ambient bloom (bottom-right)
    wash: string; // one-shot transition pulse
    tint: string; // faint role tint over the base
  }
> = {
  homeowner: {
    name: "teal",
    accent: "#0c9b8d", // small accents, dots, borders, eyebrows — reads on white
    accentSoft: "#0a7d73", // deep teal — big display text, stat numbers, highlights
    glow1: "rgba(0,170,158,0.17)", // ambient bloom on the warm off-white
    glow2: "rgba(28,110,200,0.09)",
    wash: "rgba(12,155,141,0.34)",
    tint: "rgba(0,170,158,0.06)",
  },
  builder: {
    name: "steel",
    accent: "#2d63d6",
    accentSoft: "#1b45c2",
    glow1: "rgba(45,99,214,0.17)",
    glow2: "rgba(22,58,150,0.09)",
    wash: "rgba(43,95,214,0.32)",
    tint: "rgba(45,99,214,0.06)",
  },
  architect: {
    name: "amber",
    accent: "#bd7d17", // rich amber, reads clean on cream
    accentSoft: "#8c5a12", // deep bronze — big display text, stat numbers
    glow1: "rgba(189,125,23,0.18)",
    glow2: "rgba(150,88,44,0.09)",
    wash: "rgba(189,125,23,0.32)",
    tint: "rgba(189,125,23,0.06)",
  },
  finance: {
    name: "violet",
    accent: "#6a3fca", // deep premium violet, reads on cream
    accentSoft: "#4f28a3", // deeper violet — big display text, stat numbers
    glow1: "rgba(110,66,206,0.16)",
    glow2: "rgba(64,36,150,0.09)",
    wash: "rgba(106,63,202,0.32)",
    tint: "rgba(110,66,206,0.06)",
  },
};

/* ── Showcase — the "input becomes output" transformation, plus the
   live-marketplace marquee. Pills are per-lens; the marquee cards are
   illustrative listings (shared). ─────────────────────────────────── */
export const SHOWCASE: Record<Role, { from: string; to: string; caption: string }> = {
  homeowner: { from: "Your plans", to: "Real tenders", caption: "Upload once. Every builder prices the same list." },
  builder: { from: "Your patch", to: "Won work", caption: "Rounds in your area, with the scope already written." },
  architect: { from: "Your drawings", to: "Comparable tenders", caption: "Run the round for your client, under your name." },
};

/** Illustrative marketplace listings for the marquee — clearly the kind
 *  of projects BuilderHQ carries, not claimed live inventory counts. */
export const MARQUEE_LISTINGS: Array<{
  title: string;
  suburb: string;
  type: "single_dwelling" | "multi_dwelling" | "renovation" | "extension";
  spec: string;
  budget: string;
}> = [
  { title: "Niddrie Townhouses", suburb: "Brunswick VIC", type: "multi_dwelling", spec: "6 dwellings", budget: "$1.8M" },
  { title: "Coastal Family Home", suburb: "Mornington VIC", type: "single_dwelling", spec: "5 bed · 320 m²", budget: "$2.4M" },
  { title: "Heritage Renovation", suburb: "Carlton VIC", type: "renovation", spec: "3 bed · Victorian", budget: "$850K" },
  { title: "Secondary Residence", suburb: "Flynn ACT", type: "extension", spec: "Studio + garage", budget: "$500k–$1M" },
  { title: "Deakin New Build", suburb: "Deakin ACT", type: "single_dwelling", spec: "4 bed · 2 storey", budget: "$1.2M–$1.5M" },
  { title: "Griffith Dual Occupancy", suburb: "Griffith ACT", type: "multi_dwelling", spec: "2 dwellings", budget: "$1.2M–$2M" },
  { title: "Ainslie Extension", suburb: "Ainslie ACT", type: "extension", spec: "Additions + studio", budget: "$500k–$1M" },
];

/* ── Testimonials — PLACEHOLDER CONTENT. Replace with real, attributable
   quotes + real numbers before deploy. Fabricated testimonials breach the
   Australian Consumer Law (misleading conduct); these are here only to
   design + demo the component. Names/quotes/stats are illustrative, and
   still describe the earlier marketplace rather than the tender. ── */
export type Testimonial = {
  quote: string;
  name: string;
  title: string;
  initials: string;
  stats: Array<{ value: string; label: string }>;
};

export const TESTIMONIALS: Record<Role, Testimonial[]> = {
  homeowner: [
    {
      quote:
        "We’d already been quoted by two builders and the numbers were pages apart, impossible to line up. Putting the plans up here and getting everything back in the same format is what finally let us pick one without second-guessing.",
      name: "Kate & Tom Fletcher",
      title: "New build · Point Cook, VIC",
      initials: "KF",
      stats: [
        { value: "3", label: "quotes to compare" },
        { value: "$89k", label: "high to low" },
        { value: "$0", label: "it cost us" },
      ],
    },
    {
      quote:
        "I’d put off getting quotes for our extension for the best part of a year because I dreaded the ring-around. Three local builders, all verified, all pricing the same job.",
      name: "Nadia Halabi",
      title: "Extension · Brunswick, VIC",
      initials: "NH",
      stats: [
        { value: "1", label: "scope, three prices" },
        { value: "3", label: "builders in reach" },
        { value: "0%", label: "commission taken" },
      ],
    },
    {
      quote:
        "Every builder who got in touch had already read the brief. No one was fishing for a number. For the amount we’re spending, that told me plenty.",
      name: "Peter Nguyen",
      title: "New build · Curtin, ACT",
      initials: "PN",
      stats: [
        { value: "3", label: "builders, our call" },
        { value: "100%", label: "verified up front" },
        { value: "$0", label: "to us, ever" },
      ],
    },
  ],
  builder: [
    {
      quote:
        "I’ve thrown thousands at lead sites where the same enquiry lands with five or six of us. Here it’s three at most, and the plans are actually attached. Two unlocks in, my crew is booked out for the next twelve months.",
      name: "Dave Marchetti",
      title: "Marchetti Built · Geelong, VIC",
      initials: "DM",
      stats: [
        { value: "$99", label: "to unlock the job" },
        { value: "$1.4M", label: "contract won" },
        { value: "12 months", label: "crew booked out" },
      ],
    },
    {
      quote:
        "You see the full scope before you spend a dollar. If it’s not for us, we pass. If it is, we price it properly. No time wasted.",
      name: "Sam Whittaker",
      title: "Whittaker Homes · Bendigo, VIC",
      initials: "SW",
      stats: [
        { value: "$99", label: "flat, per unlock" },
        { value: "14", label: "documents up front" },
        { value: "$0", label: "commission on wins" },
      ],
    },
    {
      quote:
        "The owners here have made up their minds to build. I’m not chasing anyone for a decision, and that is the whole difference.",
      name: "Rob Kelleher",
      title: "Southern Cross Building · Queanbeyan",
      initials: "RK",
      stats: [
        { value: "1 in 3", label: "tenders won" },
        { value: "$0", label: "in lead fees" },
        { value: "3 max", label: "at the table" },
      ],
    },
  ],
  architect: [
    {
      quote:
        "The referrals actually match what we do, so I’m not fielding enquiries for work we’d never take. And they credit us every time, which matters more than people realise.",
      name: "Claire Donovan",
      title: "Donovan Architecture · Fitzroy, VIC",
      initials: "CD",
      stats: [
        { value: "4", label: "referrals this quarter" },
        { value: "9,200", label: "reached in a feature" },
        { value: "$0", label: "to be part of it" },
      ],
    },
    {
      quote:
        "They rang and asked before publishing anything of ours. That is rare. Two genuine enquiries came from the one project they featured.",
      name: "Marcus Lidström",
      title: "Studio Lidström · Hawthorn, VIC",
      initials: "ML",
      stats: [
        { value: "2", label: "enquiries from a feature" },
        { value: "$0", label: "in fees" },
        { value: "1", label: "email to leave" },
      ],
    },
    {
      quote:
        "It’s a small, curated network, not a list of hundreds. Being one of the few they would genuinely recommend is worth far more than being lost in a directory.",
      name: "Aisha Rahman",
      title: "Rahman Studio · Braddon, ACT",
      initials: "AR",
      stats: [
        { value: "3", label: "new clients this year" },
        { value: "12", label: "market updates a year" },
        { value: "0", label: "contracts to sign" },
      ],
    },
  ],
};
