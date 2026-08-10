/**
 * Landing v2 — the three-lens content system.
 *
 * One page, three lenses: the skeleton (hero → choose → problem → how →
 * trust → proof → network → ecosystem → FAQ → close) never changes; the
 * words re-tune per audience — including Trust and Proof, which are
 * fully forked so every section speaks to its reader, never past them.
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
    primary: Cta;
    secondary: Cta;
    /** Three instant answers under the CTAs — product facts only. */
    facts: string[];
  };
  problem: {
    kicker: string;
    h2a: string;
    h2b: string;
    blurb: string;
    /** Three structural failures of the way this is done today. */
    points: Array<{ claim: string; body: string }>;
    /** One line that hands over to the how-it-works section. */
    bridge: string;
  };
  spine: {
    blurb: string;
    steps: Array<{ title: string; headline: string; body: string }>;
  };
  trust: {
    intro: string;
    cards: Array<{ icon: TrustIcon; title: string; body: string }>;
    footer: string;
  };
  proof: {
    h2a: string;
    h2b: string;
    body: string;
    place: string;
    panelTitle: string;
    gates: Array<{ label: string; detail: string }>;
    panelFooter: string;
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
      sub: "Every builder prices the same list, so the numbers compare.",
      primary: { label: "Start your project", href: "/signup?role=owner" },
      secondary: { label: "See how it works", href: "#how" },
      facts: ["Free for homeowners", "You approve the scope", "Verified builders only"],
    },
    problem: {
      kicker: "The problem",
      h2a: "Three quotes, three",
      h2b: "different scopes.",
      blurb:
        "Choosing your builder is the biggest financial decision of the build. It is usually made on three documents that were never written to be compared.",
      points: [
        {
          claim: "Every builder prices a different scope",
          body: "One allows for the retaining wall. One excludes it. One calls it a provisional sum. Nobody priced the same job.",
        },
        {
          claim: "The quotes cannot be compared",
          body: "Three formats, three sets of inclusions, and no way to tell which number is complete and which is optimistic.",
        },
        {
          claim: "What nobody priced becomes a variation",
          body: "The cheapest quote is often the one that left the most out. The rest arrives later, at a price nobody competed on.",
        },
      ],
      bridge: "The fix is a scope everyone prices, before anyone prices it.",
    },
    spine: {
      blurb:
        "From your drawings to the builder you appoint.",
      steps: [
        {
          title: "The scope of works",
          headline: "Your plans become a scope.",
          body: "Upload your drawings and reports. Every line is written in plain English and tied to the page it came from. Our team reviews it, then you approve it.",
        },
        {
          title: "The same list",
          headline: "Every builder prices what you approved.",
          body: "Verified builders take a spot and walk your scope line by line, marking each item included, a provisional sum, excluded or not applicable.",
        },
        {
          title: "The tender",
          headline: "The same questions, answered under signature.",
          body: "Price, what is firm and what can move, the programme, the people, the insurances and the terms. Every tender comes back in the same shape.",
        },
        {
          title: "The comparison",
          headline: "See what each price actually carries.",
          body: "Every tender is scored on six published dimensions, and everything they treat differently is set out item by item. You shortlist and award.",
        },
      ],
    },
    trust: {
      intro:
        "A tender is only as good as the rules behind it. Three BuilderHQ runs on, for everyone.",
      cards: [
        {
          icon: "file",
          title: "No citation, no claim",
          body: "Every line in your scope points to a document, a page and a revision. Anything that cannot be traced is removed before you see it.",
        },
        {
          icon: "shield",
          title: "A person signs off first",
          body: "Our team reviews every line before the pack reaches you, and it cannot be approved while anything is unread. Then you approve it. Two human gates.",
        },
        {
          icon: "scale",
          title: "The scoring shows its working",
          body: "Six dimensions, published weights, applied the same way to every tender. Each score sets out the points earned and the points not earned.",
        },
      ],
      footer:
        "The contract is signed between you and your builder. BuilderHQ takes no commission from either side.",
    },
    proof: {
      h2a: "Written by software,",
      h2b: "checked by people.",
      body: "We are an Australian team. The software reads the documents and drafts the scope, and a person checks every line before it reaches you. Builders are verified before they price it.",
      place: "Built in Melbourne, for Australia.",
      panelTitle: "How your scope reaches you",
      gates: [
        { label: "Read and cited", detail: "Tied to a document, page and revision" },
        { label: "Citations cross-checked", detail: "A page that document never produced is dropped" },
        { label: "Reviewed by our team", detail: "Every line confirmed, edited or removed" },
        { label: "Approved by you", detail: "Nothing goes out until you accept it" },
      ],
      panelFooter:
        "Nothing measured, nothing assumed. The documents say it, or it isn’t there.",
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
      h1a: "The scope is written.",
      h1b: "Price it.",
      sub: "Every builder on the round prices the same list.",
      primary: { label: "Pick your next project", href: "/signup?role=builder" },
      secondary: { label: "See how it works", href: "#how" },
      facts: ["Scope prepared for you", "Capped rounds", "No commission"],
    },
    problem: {
      kicker: "The problem",
      h2a: "Careful pricing",
      h2b: "reads as expensive.",
      blurb:
        "Estimating is days of work, given away free. And the tender that allows for everything looks dearest.",
      points: [
        {
          claim: "Every tender starts from scratch",
          body: "Days of estimating begin with working out what the documents actually cover, and every builder on the job repeats the same work.",
        },
        {
          claim: "Thoroughness looks like a higher price",
          body: "Allow for the difficult ground and say plainly what is excluded, and the honest number reads worse than a vague one.",
        },
        {
          claim: "Nobody reads past the number",
          body: "A quote is compared on the bottom line, so the work behind it, the programme and the exclusions never get looked at.",
        },
      ],
      bridge: "Here the scope arrives written, and the whole tender is read.",
    },
    spine: {
      blurb:
        "From the round you pick to the tender you submit.",
      steps: [
        {
          title: "The scope of works",
          headline: "The scope arrives written.",
          body: "It is drafted from the client’s documents, reviewed by a person and approved by the client before the round opens. Every line cites its source.",
        },
        {
          title: "The same list",
          headline: "Everyone prices the same list.",
          body: "Take a spot, then mark each line included, a provisional sum, excluded or not applicable. No trade grid to invent, no scope to assemble.",
        },
        {
          title: "The tender",
          headline: "Answer once, in one format.",
          body: "The same questions for every builder: price, what is firm, the programme, the people, the insurances and the terms. Signed, and verifiable by reference.",
        },
        {
          title: "The comparison",
          headline: "Read on more than the price.",
          body: "Six published dimensions, each score showing its working. An honest exclusion never reads worse than a vague inclusion, and disclosure earns points throughout.",
        },
      ],
    },
    trust: {
      intro:
        "You are giving us your estimating hours. These are the rules that sit behind every round.",
      cards: [
        {
          icon: "file",
          title: "No citation, no claim",
          body: "Every line you price points to a document, a page and a revision. Nothing is measured off a drawing, and nothing is assumed on your behalf.",
        },
        {
          icon: "scale",
          title: "The scoring is published",
          body: "Six dimensions with fixed weights, applied the same way to every tender. Each score shows its working, so you could read your own evaluation without feeling ambushed.",
        },
        {
          icon: "shield",
          title: "Nothing changes quietly",
          body: "A revised scope on a live round is issued as a numbered addendum to every builder at once, with the lines added, revised and removed set out.",
        },
      ],
      footer:
        "And your details are never sold or passed around. Rounds are capped, and the cap is visible before you commit.",
    },
    proof: {
      h2a: "The scope is checked",
      h2b: "before you price it.",
      body: "Your estimating hours are expensive, so the work happens before the round opens. Every line is written from the documents, cited, reviewed by our team and approved by the client. You price a scope already agreed.",
      place: "Built in Melbourne, for Australia.",
      panelTitle: "Before a round reaches you",
      gates: [
        { label: "Documents read", detail: "Each line cited to a document, page and revision" },
        { label: "Reviewed by our team", detail: "Confirmed, edited or removed, line by line" },
        { label: "Approved by the client", detail: "Open questions answered before the round opens" },
        { label: "Capped round", detail: "The number of spots is visible before you commit" },
      ],
      panelFooter: "No recycled leads. No scope to assemble. Work worth pricing.",
    },
    network: {
      h2a: "Building designers and brokers,",
      h2b: "in your corner.",
      body: "Our Preferred Partner register covers the people your clients lean on: building designers for the drawings, finance brokers for the lending. When a job needs one, we make the introduction.",
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
      sub: "Structured rounds for your clients, with your builders or ours, under your practice’s name.",
      primary: { label: "Run a tender for your client", href: "/signup?role=architect" },
      secondary: { label: "See how it works", href: "#how" },
      facts: ["Free for practices", "Your builders or ours", "Your name on the evaluation"],
    },
    problem: {
      kicker: "The admin",
      h2a: "A proper tender is",
      h2b: "unpaid work.",
      blurb:
        "Running a round properly means assembling a scope, briefing builders and lining up three submissions that were never written to match. All outside the fee.",
      points: [
        {
          claim: "The scope has to exist first",
          body: "Without one shared list, each builder prices their own reading of the drawings, and the submissions cannot be lined up afterwards.",
        },
        {
          claim: "Normalising submissions is unpaid work",
          body: "Three formats, three sets of inclusions, and someone in the practice has to reconcile them before the client can be advised.",
        },
        {
          claim: "Your name is on the outcome",
          body: "Whatever the practice does, the recommendation is attached to it, and it has to be defensible long after the round closes.",
        },
      ],
      bridge: "The round runs here. The judgement stays with the practice.",
    },
    spine: {
      blurb:
        "You run the round, your client decides, your practice keeps the record.",
      steps: [
        {
          title: "The scope of works",
          headline: "The scope is written for you.",
          body: "Upload the drawings and reports. Every line is drafted in plain English and cited to its source, our team reviews it, and your client approves it.",
        },
        {
          title: "The same list",
          headline: "Your builders, or ours.",
          body: "Open the round to the verified network, keep it private to builders you trust, or both. Every one of them prices the same approved list.",
        },
        {
          title: "The tender",
          headline: "Every submission in one shape.",
          body: "The same questions, answered under signature: price and firmness, programme, people, insurances and terms. Nothing to normalise afterwards.",
        },
        {
          title: "The comparison",
          headline: "A recommendation you can defend.",
          body: "Six published dimensions, every score showing its working, and every difference set out item by item. The evaluation carries your name.",
        },
      ],
    },
    trust: {
      intro:
        "Your name goes on the outcome, so the rules behind it are published and fixed.",
      cards: [
        {
          icon: "file",
          title: "No citation, no claim",
          body: "Every scope line names the document, page and revision it came from. Nothing is measured off a drawing, and anything that cannot be traced is removed.",
        },
        {
          icon: "scale",
          title: "The scoring is published",
          body: "Six dimensions, fixed weights, the same for every tender. Each score shows the points earned and the points available and not earned, so any line of it can be defended.",
        },
        {
          icon: "shield",
          title: "Nothing changes quietly",
          body: "A revised pack is issued as a numbered addendum to every builder at once, the old one marked superseded, and every action recorded against the person who took it.",
        },
      ],
      footer:
        "The round is yours, and the contract is your client’s.",
    },
    proof: {
      h2a: "Nothing goes out",
      h2b: "unchecked.",
      body: "The scope is drafted from the documents, then a person reviews every line. Approval is refused while anything is unread. Your client answers a short list of open questions, typically about six, and approves the pack.",
      place: "Built in Melbourne, for Australia.",
      panelTitle: "Before the round opens",
      gates: [
        { label: "Documents read", detail: "Cited to a document, page and revision" },
        { label: "Citations cross-checked", detail: "A page that document never produced is dropped" },
        { label: "Reviewed by our team", detail: "Every line confirmed, edited or removed" },
        { label: "Approved by your client", detail: "Their answers to the open questions, recorded" },
      ],
      panelFooter: "Two human gates before a single builder sees it.",
    },
    network: {
      h2a: "What partner",
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
      h2b: "without the tender admin.",
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
  h2a: "One platform.",
  h2b: "Every side of the build.",
  sub: "Where Australia’s residential builds get organised.",
  columns: [
    {
      who: "Homeowners",
      bring: "bring the project",
      line: "Plans in, tenders back, compared properly.",
    },
    {
      who: "Building designers",
      bring: "bring the design",
      line: "Rounds run under the practice’s name.",
    },
    {
      who: "Builders",
      bring: "bring it to life",
      line: "One list, priced fairly, won directly.",
    },
    {
      who: "Finance Brokers",
      bring: "back the build",
      line: "The right finance, right when it counts.",
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
