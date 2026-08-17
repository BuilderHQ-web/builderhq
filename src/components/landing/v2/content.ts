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
    /** Which of the two the hero fills in. The default is the
     *  primary; "secondary" hands the filled button to the walk
     *  through, for a visitor who has never seen a tender round. */
    lead?: "primary" | "secondary";
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
    /** Carried by every step but the last, which keeps the filled
     *  CTA. Without one, the earlier steps carry no button at all. */
    stepCta?: Cta;
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
      h1a: "See beyond",
      h1b: "the price.",
      sub: "Upload your plans. We read every line and write out the full scope of works.",
      subMore: "Every builder prices that same scope, so you can see what sits behind each number.",
      primary: { label: "Start your project", href: "/signup?role=owner" },
      secondary: { label: "Watch the demo", href: "/demo" },
      lead: "secondary",
      facts: ["Free for homeowners", "You approve the scope", "Verified builders only"],
    },
    problem: {
      head: {
        h2a: "Residential quotes",
        h2b: "have no standard.",
        lead: "Every builder prices to their own assumptions, so no two quotes cover the same work."
      },
      points: [
        {
          claim: "Each quote covers different work",
          body: "One allows for the retaining wall. One leaves it out. One sets aside a rough figure.",
        },
        {
          claim: "The numbers cannot be compared",
          body: "Three formats, three sets of inclusions, and no way to tell which number is complete.",
        },
        {
          claim: "What nobody priced becomes a variation",
          body: "The cheapest quote is usually the one that left the most out. The rest arrives later, at a price nobody competed on.",
        },
      ],
      bridge: {
        label: "The fix",
        a: "One scope of works,",
        b: "priced by every builder.",
      },
    },
    spine: {
      head: {
        h2a: "From your plans",
        h2b: "to your builder.",
        lead: "Four steps. You do the first one, we do the rest.",
      },
      stepCta: { label: "See it in the demo", href: "/demo" },
      steps: [
        {
          title: "Upload",
          headline: "Start with your plans.",
          body: "Your drawings, your reports, whatever your designer gave you. Add a few details about the project and that is your part done. Everything after this is ours.",
        },
        {
          title: "Your scope of works",
          headline: "Your plans become one scope.",
          body: "We read every drawing, report and specification, and write out every item of work they cover. Every scope item points at the page it came from. You approve it before any builder sees it.",
        },
        {
          title: "The same list, priced",
          headline: "Every builder prices that scope.",
          body: "Verified builders walk your scope line by line and answer the same questions under signature. Nobody quietly leaves an item out, and nothing turns up later as a variation you never agreed to.",
        },
        {
          title: "The comparison",
          headline: "See what each price actually covers.",
          body: "We read every tender in full and set out where they differ, item by item: what each one has allowed for, what it has left out, and where the money can still move. Then you choose.",
        },
      ],
    },
    trust: {
      h2a: "Every builder",
      h2b: "is vetted.",
      intro:
        "Nobody prices your job anonymously. Every builder is vetted before they see it, and the rules they price under are published before the round opens.",
      cards: [
        {
          icon: "shield",
          title: "Every builder is vetted",
          body: "We check each builder’s ABN against the Australian Business Register, and their licence against the state register where one connects and by our team where it does not. A builder takes a spot on an open round only once both have passed. Insurances are declared under signature with the tender.",
        },
        {
          icon: "file",
          title: "Every scope item is referenced",
          body: "Each line points to the document, page and revision it came from, and anything we cannot trace is removed. The pack cannot be approved while anything is unread, and nothing reaches a builder until you approve it.",
        },
        {
          icon: "scale",
          title: "Every tender is scored the same way",
          body: "Every tender is read against the same six things: how firm the price is, how much of the scope it covers, how well it is prepared, who the builder is, how they deliver, and how believable the programme is. Each one shows its working, so you can see why one tender sits above another.",
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
      h2a: "See beyond",
      h2b: "the price.",
      sub: "Upload your plans and find out what each builder has actually allowed for.",
      primary: { label: "Start your project", href: "/signup?role=owner" },
      trio: [
        "One scope, priced by every builder",
        "You approve it before anyone sees it",
        "Free, and no commission",
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
      h1b: "that fits your pipeline.",
      sub: "Live tenders in your area, with the drawings in and the scope of works already written.",
      subMore: "We read the client’s documents and lay out every item, so you price instead of investigating.",
      primary: { label: "Pick your next project", href: "/signup?role=builder" },
      secondary: { label: "See how it works", href: "#how" },
      facts: [
        "Detailed scope of works provided",
        "Limited spots on every tender",
        "Priced properly, read properly",
      ],
    },
    problem: {
      head: {
        h2a: "What is wrong with how",
        h2b: "tenders are awarded today.",
        lead: "Price every detail and you look expensive.",
      },
      points: [
        {
          claim: "The good jobs are hard to find",
          body: "Real opportunities sit behind agents, referrals and lead sites, and the ones that reach you are rarely worth the hours.",
        },
        {
          claim: "Every tender starts from scratch",
          body: "Days of work just establishing what the documents actually cover, before a single rate goes in.",
        },
        {
          claim: "Nobody reads past the bottom line",
          body: "The work behind it, the programme and the exclusions never get looked at.",
        },
      ],
      bridge: {
        label: "The fix",
        a: "We write the scope for you.",
        b: "Your whole tender gets read.",
      },
    },
    spine: {
      head: {
        h2a: "From finding the job",
        h2b: "to winning it.",
        lead: "Four steps, and the hardest part is already done for you.",
      },
      steps: [
        {
          title: "Find your next project",
          headline: "Live tenders, ready to price.",
          body: "Browse open rounds in your area. The type, the suburb, the budget and how many spots are left, so you can pick the jobs that suit the work you want.",
        },
        {
          title: "The scope is written",
          headline: "A detailed scope of works, provided.",
          body: "We read the client’s documents and lay out the full scope of works for you, every scope item referenced to the page it came from. You walk the list and mark each line, instead of losing days working out what the drawings actually cover.",
        },
        {
          title: "Priced on more than the number",
          headline: "A careful price is finally seen as one.",
          body: "Everyone prices the same scope and answers the same questions, so an exclusion you have stated plainly reads as diligence rather than a gap. Every tender is read the same way, and every score shows its working.",
        },
        {
          title: "Win the work",
          headline: "Win the job, on your terms.",
          body: "One submission, one format, signed. If the client picks you, you contract with them directly and BuilderHQ takes no commission on the job.",
        },
      ],
    },
    trust: {
      h2a: "You know the rules",
      h2b: "before you price.",
      intro:
        "Everyone pricing the same job has been checked first, and everyone works to the same rules.",
      cards: [
        {
          icon: "shield",
          title: "Everyone here is verified",
          body: "ABN against the Australian Business Register, licence against the state register where one connects and by our team where it does not. A spot on an open round opens only once both have passed, for you and for everyone you are priced against.",
        },
        {
          icon: "file",
          title: "Every scope item is referenced",
          body: "Each line you price points to the document, page and revision it came from. Nothing is measured off a drawing. If the scope changes mid round, a numbered addendum goes to every builder at once.",
        },
        {
          icon: "scale",
          title: "You see how you were scored",
          body: "The same six measures for every tender on the round, published before it opens. Each score shows its working, so you could read your own evaluation and know exactly where it came from.",
        },
      ],
      footer:
        "Your details stay private. Every round is capped, and you see the cap before you enter.",
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
        a: "On the same six measures for every builder, published before the round opens. Every score shows its working, and an honest exclusion never reads worse than a vague inclusion.",
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
      h2a: "Your next job",
      h2b: "is already live.",
      sub: "Real tenders, with the scope of works already written for you.",
      primary: { label: "Pick your next project", href: "/signup?role=builder" },
      trio: [
        "Detailed scope of works provided",
        "Limited spots on every tender",
        "Every tender read in full",
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
      sub: "Run your client’s tender with the builders you trust, or ours.",
      subMore: "Every submission comes back priced against one defined scope, under your practice’s name.",
      primary: { label: "Run a tender for your client", href: "/signup?role=architect" },
      secondary: { label: "See how it works", href: "#how" },
      facts: [
        "Invite your own builders",
        "One scope, priced by all",
        "Your name on the recommendation",
      ],
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
        a: "We run the round.",
        b: "You advise your client.",
      },
    },
    spine: {
      head: {
        h2a: "From your drawings",
        h2b: "to your recommendation.",
        lead: "Four steps, and the practice keeps the judgement throughout.",
      },
      steps: [
        {
          title: "Upload",
          headline: "Upload once, for your client.",
          body: "Your drawings, reports and specifications go up in one place. No brief to write, no pack to assemble, no builders to chase for a price.",
        },
        {
          title: "The scope, and who prices it",
          headline: "We identify the scope. You choose who prices it.",
          body: "We read your documents and lay out the full scope of works, every item referenced to its page, then your client approves it. Keep the round to builders you trust, open it to the verified network, or run both at once.",
        },
        {
          title: "The same list, priced",
          headline: "Every submission against one scope.",
          body: "Every builder prices the same scope and answers the same questions under signature. There is nothing left to reconcile, and no risk that one submission quietly excluded what another included.",
        },
        {
          title: "Your recommendation",
          headline: "Hand your client the answer.",
          body: "The scoring, the flags and every difference between the tenders are already set out for you. You add the judgement, your practice’s name goes on it, and the whole record holds up long after the round closes.",
        },
      ],
    },
    trust: {
      h2a: "Your recommendation",
      h2b: "can be defended.",
      intro:
        "Every builder is checked before they price, and every rule is set before the round opens.",
      cards: [
        {
          icon: "shield",
          title: "Every builder is checked first",
          body: "ABN against the Australian Business Register, licence against the state register where one connects and by our team where it does not. A builder joins an open round only once both have passed. A builder you invite joins on your say so, and their verification status is shown on the round either way.",
        },
        {
          icon: "file",
          title: "Every scope item is referenced",
          body: "Each line names the document, page and revision it came from. Anything we cannot trace is removed before your client sees it, and a revised pack goes to every builder at once as a numbered addendum.",
        },
        {
          icon: "scale",
          title: "Every score can be defended",
          body: "The same six measures for every tender on the round, published in advance. Each score shows what was earned and what was not, so any line of your recommendation can be defended.",
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
      h2a: "Give your client",
      h2b: "an answer they trust.",
      sub: "One scope, priced by every builder, and a recommendation that holds up.",
      primary: { label: "Run a tender for your client", href: "/signup?role=architect" },
      trio: [
        "One scope, priced by all",
        "Open rounds or your own builders",
        "Your name on the recommendation",
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
