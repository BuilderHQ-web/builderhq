/**
 * Landing v2 — the three-lens content system.
 *
 * One page, three lenses: the skeleton (hero → choose → problem → how →
 * trust → proof → network → ecosystem → FAQ → close) never changes; the
 * words re-tune per audience — including Trust and Proof, which are
 * fully forked so every section speaks to its reader, never past them.
 *
 * Copy rules, enforced here so components stay dumb:
 *   · Every claim is literally true of the product today: the
 *     three-builder unlock cap, $49–$199 unlock pricing, ABR +
 *     state-register checks with team verification where registers
 *     don't connect, no commission, free for homeowners,
 *     address/contact/docs hidden until a verified builder unlocks.
 *   · No em dashes, no exclamation marks, no hype words.
 *   · Curly apostrophes. Short sentences. Plain Australian English.
 */

export type Role = "homeowner" | "builder" | "architect" | "finance";

export const ROLE_ORDER: Role[] = ["homeowner", "builder", "architect", "finance"];

export const ROLE_META: Record<
  Role,
  { chip: string; chipShort: string; dock: string }
> = {
  homeowner: { chip: "I’m a homeowner", chipShort: "Homeowner", dock: "For Homeowners" },
  builder: { chip: "I’m a builder", chipShort: "Builder", dock: "For Builders" },
  architect: { chip: "I’m a building designer", chipShort: "Building Designer", dock: "For Building Designers" },
  finance: { chip: "I’m a finance broker", chipShort: "Finance", dock: "For Finance Brokers" },
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

export type ChaosIcon =
  | "phone"
  | "file"
  | "message"
  | "clock"
  | "layers"
  | "users"
  | "dollar"
  | "ghost"
  | "coffee"
  | "heart"
  | "calendar";

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
    /** The old way — rendered as scattered debris chips. */
    chaos: Array<{ icon: ChaosIcon; text: string }>;
    /** With BuilderHQ — rendered as one clean, ordered panel. */
    order: string[];
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
const ARCHITECT_JOIN_HREF = "#join-architect";
const FINANCE_JOIN_HREF = "#join-finance";
const REQUEST_INTRO_HREF = "#request-intro";

export const LENS: Record<Role, LensCopy> = {
  /* ── HOMEOWNER — the default story. Nervous, first time, needs safety. ── */
  homeowner: {
    hero: {
      badge: "Residential tendering · Now live in Australia",
      h1a: "Choose better.",
      h1b: "Build smarter.",
      sub: "The easiest way to find, compare and appoint the right builder.",
      primary: { label: "Start your project", href: "/signup?role=owner" },
      secondary: { label: "See how it works", href: "#how" },
      facts: ["Free for homeowners", "Every builder verified", "Australia wide"],
    },
    problem: {
      kicker: "The problem",
      h2a: "Getting quotes shouldn’t feel like",
      h2b: "chasing.",
      blurb:
        "Choosing your builder is the biggest decision of the whole build. Today it runs on phone tag, mismatched PDFs and gut feel. We gave it structure instead.",
      chaos: [
        { icon: "phone", text: "Missed call · Builder #3 · 9:12am" },
        { icon: "file", text: "quote_FINAL_v3 (1).pdf" },
        { icon: "message", text: "“Does that include site costs?”" },
        { icon: "clock", text: "Plans sent 3 weeks ago · no reply" },
        { icon: "layers", text: "Three prices, three formats" },
      ],
      order: [
        "Three tenders, one format, side by side",
        "Every document in one place",
        "Every builder ABN and licence checked",
        "Your address hidden until you match",
      ],
    },
    spine: {
      blurb:
        "The whole process, start to finish. No brokers, no call centres, no surprises.",
      steps: [
        {
          title: "Post your project",
          headline: "Post once. Builders come to you.",
          body: "Upload your plans and scope a single time. Verified builders review your project and secure a tender spot to price it, and your address stays private until one does.",
        },
        {
          title: "Verified builders",
          headline: "Every builder checked before you meet.",
          body: "ABN and licence verified against government registers by our team. No anonymous bids, and no one who has not cleared our checks.",
        },
        {
          title: "Compare tenders",
          headline: "Compare like for like, in one view.",
          body: "Every builder prices the same scope in the same format. Price, inclusions and timelines side by side, so you decide on facts, not guesswork.",
        },
        {
          title: "Award",
          headline: "Award on your terms, keep every dollar.",
          body: "You choose who builds. No commission, no cut of your contract, and you can walk away at any point.",
        },
      ],
    },
    trust: {
      intro:
        "Marketplaces earn trust with structure, not slogans. Three rules BuilderHQ runs on, for everyone, from day one.",
      cards: [
        {
          icon: "shield",
          title: "Checked, then checked again",
          body: "Every ABN is checked live against the Australian Business Register, every licence against its state register. Where a register doesn’t connect, we verify by hand. Only then does the badge appear.",
        },
        {
          icon: "lock",
          title: "Private by default",
          body: "The marketplace sees a suburb and a scope, nothing more. Address, contact and documents unlock only for verified builders who commit to tendering.",
        },
        {
          icon: "scale",
          title: "A considered shortlist",
          body: "Three builders can unlock a project, maximum. Genuine competition for owners, a real opportunity for builders, and no one pricing against a crowd.",
        },
      ],
      footer:
        "And when the job is awarded, the contract is yours. BuilderHQ takes no commission from either side.",
    },
    proof: {
      h2a: "Checked by people,",
      h2b: "not just code.",
      body: "We’re an Australian team building the trusted layer for residential construction. Every builder is reviewed before they tender, every project checked before it lists. Where a register doesn’t connect, we verify by hand.",
      place: "Built in Melbourne, for Australia.",
      panelTitle: "How every builder gets in",
      gates: [
        { label: "ABN verified", detail: "Live against the Australian Business Register" },
        { label: "Licence verified", detail: "Against the relevant state building register" },
        { label: "Verified by our team", detail: "Checked against government registers, by hand where they don’t connect" },
        { label: "Approved to tender", detail: "Only then does the verified badge appear" },
      ],
      panelFooter:
        "No anonymous bids. No pay-to-appear. Just builders who cleared the gate.",
    },
    network: {
      h2a: "Need a designer",
      h2b: "or a broker?",
      body: "Our Preferred Partner networks connect you with building designers and finance brokers we know and trust. Tell us what you need before you build, and we’ll point you to the right fit. No charge, no obligation.",
      cta: { label: "Request an introduction", href: REQUEST_INTRO_HREF },
    },
    faq: [
      {
        q: "Is it really free for homeowners?",
        a: "Yes, completely. Uploading, matching, receiving tenders and awarding cost nothing, and we take no commission. Builders fund BuilderHQ with a small fee to unlock projects they want to tender on. Never you.",
      },
      {
        q: "Who can see my plans and address?",
        a: "Browsing builders see your suburb and scope only. Your address, contact and documents reach only verified builders who unlock to tender, capped at three per project.",
      },
      {
        q: "What does verified actually mean?",
        a: "Before a builder can tender, we check their ABN against the Australian Business Register and their licence against the relevant state register, automatically where the register allows it and by hand where it doesn’t. Every approved builder carries both checks.",
      },
      {
        q: "How quickly will I hear from builders?",
        a: "Builders in your area are notified the moment your project goes live, and you’ll see interest as it happens from your dashboard. You set the pace from there.",
      },
      {
        q: "Do I have to award the job through BuilderHQ?",
        a: "You award it with the builder directly, and the contract is entirely between you and them. Your tender record stays in your dashboard as a clean reference for both sides.",
      },
    ],
    close: {
      h2a: "Your build starts",
      h2b: "with your plans.",
      sub: "Verified builders. Comparable tenders. You stay in control.",
      primary: { label: "Start your project", href: "/signup?role=owner" },
      trio: [
        "Free for homeowners, forever",
        "Every builder ABN and licence checked",
        "No commission on your build",
      ],
    },
  },

  /* ── BUILDER — practical, lead-gen fatigued, respects straight talk. ── */
  builder: {
    hero: {
      badge: "Live projects tendering now",
      h1a: "Choose better.",
      h1b: "Build smarter.",
      sub: "The easiest way to find and win projects from owners ready to build.",
      primary: { label: "Pick your next project", href: "/signup?role=builder" },
      secondary: { label: "See how it works", href: "#how" },
      facts: ["Tender ready", "Scope defined", "Three builders max"],
    },
    problem: {
      kicker: "Sound familiar?",
      h2a: "Good work shouldn’t be",
      h2b: "this hard to find.",
      blurb:
        "You know the drill: paying for shared leads, chasing drawings, hearing nothing back. We built the opposite.",
      chaos: [
        { icon: "users", text: "Lead sold to six builders" },
        { icon: "dollar", text: "$190 lead fee · never answered" },
        { icon: "message", text: "“Can you just give a rough price?”" },
        { icon: "clock", text: "Chasing drawings for two weeks" },
        { icon: "ghost", text: "Detailed quote · no response" },
      ],
      order: [
        "Real drawings and a defined scope",
        "Three builders max, all committed",
        "Owners reviewed and tender-ready",
        "Free sign up, no commission",
      ],
    },
    spine: {
      blurb:
        "From first look to submitted tender. Exactly how it works, and exactly what it costs.",
      steps: [
        {
          title: "Find work",
          headline: "Your pipeline, on your terms.",
          body: "Live residential projects in your area, matched to the work you do. Set your patch, pursue only what fits, and browse it all at no cost. Nothing is ever sold as a lead.",
        },
        {
          title: "Preview",
          headline: "See the full scope before you spend.",
          body: "Plans, suburb, size and budget, all shown up front. You decide if a job is worth pricing before any money moves.",
        },
        {
          title: "Unlock",
          headline: "One flat fee, never a commission.",
          body: "Unlock the address, documents and owner contact from $49. No subscription, and never a cut of the job you win. Three builders, maximum.",
        },
        {
          title: "Tender",
          headline: "Priced direct, no middleman.",
          body: "The owner compares your tender alongside the rest and messages you directly. You keep the relationship, and the win.",
        },
      ],
    },
    trust: {
      intro:
        "You’re trusting us with your pipeline and your estimating hours. Here’s what we do to deserve both.",
      cards: [
        {
          icon: "file",
          title: "Tender-ready or it doesn’t list",
          body: "Every project is reviewed before it goes live: real drawings, a defined scope, and an owner who’s ready to hear numbers. If it isn’t ready to price, it doesn’t reach you.",
        },
        {
          icon: "compass",
          title: "Your pipeline, your call",
          body: "Set your patch and project types, preview every match free, unlock only what you want to price. Nothing is pushed, nothing auto-charges, walk anytime.",
        },
        {
          icon: "scale",
          title: "A fair shot, every time",
          body: "Three builders per project, maximum, each paying the same flat fee. The owner sees every tender in one format, and we take nothing off your win.",
        },
      ],
      footer:
        "And your details are never sold or passed around. You are a member here, not a lead to be resold.",
    },
    proof: {
      h2a: "We vet the work,",
      h2b: "not just the builders.",
      body: "Your estimating hours are expensive, so we spend ours first. A person reviews every project before it lists: the drawings are real, the scope is defined, and the owner genuinely wants tenders. If we wouldn’t price it, we don’t publish it.",
      place: "Built in Melbourne, for Australia.",
      panelTitle: "Before a project reaches you",
      gates: [
        { label: "Plans attached", detail: "Real working drawings, not a wish list" },
        { label: "Scope defined", detail: "Type, size, land and budget band up front" },
        { label: "Owner confirmed", detail: "A real person, ready to receive tenders" },
        { label: "Capped at three", detail: "Your unlock buys a seat at a small table" },
      ],
      panelFooter: "No recycled leads. No stale listings. Only work worth pricing.",
    },
    network: {
      h2a: "Building designers and brokers,",
      h2b: "in your corner.",
      body: "Our Preferred Partner networks cover the people your clients lean on too: building designers for design, finance brokers for lending. When a job needs one, we make the introduction. Already work with someone great? Send them our way.",
      cta: { label: "Meet our partners", switchTo: "architect" },
    },
    faq: [
      {
        q: "What does it cost?",
        a: "Browsing and previews are free. Unlocking a project to tender is a one off fee between $49 and $199 depending on the project type. That’s it. No subscription, no lead packs, and no commission on jobs you win.",
      },
      {
        q: "How is this different from lead platforms?",
        a: "Leads there are resold to whoever pays. Here a project is unlocked by three builders at most, every owner has uploaded real plans, and you see the scope before you pay. A seat at a real tender, not a phone number.",
      },
      {
        q: "What do I need to get approved?",
        a: "An active ABN and a current builder licence. We check both, automatically where state registers allow it and by hand where they don’t, before you can tender.",
      },
      {
        q: "What happens after I unlock a project?",
        a: "You get the full document set, the site address and the owner’s details, and your tender goes into the owner’s comparison view. You can message them directly in the project thread.",
      },
      {
        q: "Where do the projects come from?",
        a: "Homeowners upload real residential projects, from renovations and extensions to new builds and multi dwelling work, and our team reviews every listing before it goes live.",
      },
    ],
    close: {
      h2a: "Your next job is",
      h2b: "already listed.",
      sub: "Real plans, ready owners, three builders max. Your move.",
      primary: { label: "Pick your next project", href: "/signup?role=builder" },
      trio: [
        "Free to browse every project",
        "Pay only when you tender",
        "No commission on jobs you win",
      ],
    },
  },

  /* ── ARCHITECT — design literate, allergic to sales. Give, don't ask. ── */
  architect: {
    hero: {
      badge: "Now inviting partner practices",
      h1a: "Your designs,",
      h1b: "in the right hands.",
      sub: "We put your practice in front of homeowners and builders planning to build.",
      primary: { label: "Join the network", href: ARCHITECT_JOIN_HREF },
      secondary: { label: "See how it works", href: "#how" },
      facts: ["By invitation", "Featured and referred", "Your name on your work"],
    },
    problem: {
      kicker: "The idea",
      h2a: "Great practices deserve",
      h2b: "better referrals.",
      blurb:
        "Every week, homeowners and builders ask us the same question: do you know a good building designer? We’d rather answer with practices we actually know.",
      chaos: [
        { icon: "message", text: "“Know a good builder?” · every week" },
        { icon: "coffee", text: "Referral promised over coffee · forgotten" },
        { icon: "heart", text: "Award-worthy build · 43 likes" },
        { icon: "calendar", text: "No idea who has capacity this quarter" },
      ],
      order: [
        "Featured and tagged by BuilderHQ",
        "Referred when the fit is right",
        "Verified builders to send clients to",
        "Market intelligence, monthly",
      ],
    },
    spine: {
      blurb:
        "Everything the network does for your practice. And the one thing it never does: charge you.",
      steps: [
        {
          title: "Get featured",
          headline: "Your work, in front of ready clients.",
          body: "We feature your practice and share your projects across our channels, tagged and credited, so homeowners planning a build discover you.",
        },
        {
          title: "Get referred",
          headline: "Warm referrals, never cold leads.",
          body: "When a homeowner asks us for a building designer, we introduce one who fits: right style, right area, right stage. A real introduction, never a resold lead.",
        },
        {
          title: "Stay ahead",
          headline: "Market insight, every month.",
          body: "The monthly BuilderHQ market update: construction activity, budgets and what clients are building, drawn from real platform data.",
        },
        {
          title: "Join the network",
          headline: "It costs nothing, and you can leave anytime.",
          body: "No membership fees, no contracts, no exclusivity. If it ever stops making sense, one email opts you out.",
        },
      ],
    },
    trust: {
      intro:
        "A referral network only works if practices can trust it. So the rules are written in your favour.",
      cards: [
        {
          icon: "tag",
          title: "Your name stays on your work",
          body: "Whenever we feature a project, your practice is credited and tagged. Your drawings and photos stay yours, and nothing is published without your approval.",
        },
        {
          icon: "handshake",
          title: "Referrals with judgement",
          body: "We only put your practice forward when a project genuinely fits: right type, right area, right budget. A recommendation from us has to mean something, or it means nothing.",
        },
        {
          icon: "door",
          title: "Free, and free to leave",
          body: "No fees, no contracts, no exclusivity, at any point. If the network ever stops earning its place in your week, one email ends it. No notice period, no hard feelings.",
        },
      ],
      footer:
        "We grow when good building designers look good. That’s the whole model.",
    },
    proof: {
      h2a: "Every practice,",
      h2b: "personally invited.",
      body: "There’s no open directory to buy into. Register your interest or catch our eye with active, well documented residential work, and we pick up the phone. Nothing is shared until you’ve agreed exactly what we publish and how it’s credited.",
      place: "Built in Melbourne, for Australia.",
      panelTitle: "How practices join",
      gates: [
        { label: "We do the homework", detail: "Active projects, public work and reviews" },
        { label: "We call and ask", detail: "A conversation, never a cold listing" },
        { label: "You approve everything", detail: "Logo, photos and links, on your terms" },
        { label: "We feature and refer", detail: "Tagged showcases and matched referrals" },
      ],
      panelFooter: "No fees at any step. Leaving takes one email.",
    },
    network: {
      h2a: "What partner",
      h2b: "practices receive.",
      body: "The network exists to make quality practices easier to find, and to give our homeowners somewhere trustworthy to start. Partners receive, at no cost:",
      bullets: [
        "A feature in the BuilderHQ Preferred Partner network",
        "Your projects promoted across our channels, always tagged",
        "Referrals when owners and builders ask us for a building designer",
        "The monthly BuilderHQ Market Update",
        "First look as client-side tendering tools roll out",
      ],
      cta: { label: "Join the network", href: ARCHITECT_JOIN_HREF },
    },
    faq: [
      {
        q: "Is there really no fee?",
        a: "Really. The network is free to join and free to stay in, with no contracts and no exclusivity. We’re building the referral layer for residential construction, and it only works if the best practices are in it.",
      },
      {
        q: "What do you need from us?",
        a: "Permission to include your practice, then your logo, a few preferred project photos and your social handles, so we can start featuring your work properly.",
      },
      {
        q: "Why is BuilderHQ doing this?",
        a: "Because our homeowners keep asking for building designer recommendations, and our builders look for designers to collaborate with. Recommending practices we know makes the whole platform stronger.",
      },
      {
        q: "Can our clients tender their projects through BuilderHQ?",
        a: "Yes. When a design is ready to price, your client can upload it, or we’ll set it up for them, and verified builders tender on it in a format you and your client can compare properly.",
      },
      {
        q: "How do we leave if it’s not for us?",
        a: "One email. No lock in, no notice period, no hard feelings.",
      },
    ],
    close: {
      h2a: "Good building designers should be",
      h2b: "easy to find.",
      sub: "Join the practices we feature, promote and refer.",
      primary: { label: "Join the network", href: ARCHITECT_JOIN_HREF },
      trio: [
        "No fees, no contracts",
        "Featured and promoted by BuilderHQ",
        "Opt out with one email",
      ],
    },
  },

  /* ── FINANCE BROKER — the newest partner lens. Reaches brokers at the
     moment homeowners need finance; give value, ask nothing. ── */
  finance: {
    hero: {
      badge: "Now inviting finance partners",
      h1a: "Your next client",
      h1b: "is about to build.",
      sub: "Homeowners planning builds ask us who to talk to about finance. Be the broker we introduce.",
      primary: { label: "Join the network", href: FINANCE_JOIN_HREF },
      secondary: { label: "See how it works", href: "#how" },
      facts: ["Preferred and referred", "Clients ready to build", "Invite only"],
    },
    problem: {
      kicker: "The idea",
      h2a: "Good brokers deserve",
      h2b: "better introductions.",
      blurb:
        "Every week, homeowners planning a build ask us the same thing: can you recommend a broker? Today that referral goes to whoever is top of mind. We’d rather send it to someone we trust.",
      chaos: [
        { icon: "message", text: "“Know a good broker?” · asked weekly" },
        { icon: "dollar", text: "Paid per lead · half never answer" },
        { icon: "ghost", text: "Pre-approval sent · then silence" },
        { icon: "users", text: "Same enquiry sold to five brokers" },
      ],
      order: [
        "Introduced to clients who are ready",
        "Warm intros, never resold leads",
        "Featured in the partner directory",
        "Construction and lending insights",
      ],
    },
    spine: {
      blurb:
        "Everything the network does for your business. And the one thing it never does: charge you.",
      steps: [
        {
          title: "Get listed",
          headline: "Seen where homeowners look for finance.",
          body: "Your business in the Preferred Finance Partner directory and featured across our channels, so when a homeowner asks who to talk to about finance, your name is there.",
        },
        {
          title: "Get introduced",
          headline: "Warm intros to clients ready to build.",
          body: "When a homeowner planning a build needs finance, we introduce a broker who fits: right specialty, right area, right stage. A warm introduction, never a resold lead.",
        },
        {
          title: "Stay ahead",
          headline: "Lending and market insight, monthly.",
          body: "The monthly BuilderHQ market update: construction activity, borrowing trends and what buyers are financing, drawn from real platform data.",
        },
        {
          title: "Join the network",
          headline: "No fees, no lead charges, leave anytime.",
          body: "No cost to join, no lead fees, no exclusivity. If it ever stops making sense, one email opts you out.",
        },
      ],
    },
    trust: {
      intro:
        "A referral network only works if brokers can trust it. So the rules are written in your favour.",
      cards: [
        {
          icon: "tag",
          title: "Your brand stays yours",
          body: "When we feature or list your business, you’re credited and tagged. Your logo, profile and details stay yours, and nothing goes live without your approval first.",
        },
        {
          icon: "handshake",
          title: "Introductions with judgement",
          body: "We only put your name forward when a client genuinely fits: the right finance need, the right area, the right time. An introduction from us has to mean something.",
        },
        {
          icon: "door",
          title: "Free, and free to leave",
          body: "No fees, no lead charges, no exclusivity, at any point. If the network stops earning its place, one email ends it. No notice period, no hard feelings.",
        },
      ],
      footer:
        "We grow when our homeowners are well looked after. Good brokers make that happen.",
    },
    proof: {
      h2a: "Every partner,",
      h2b: "personally chosen.",
      body: "There’s no open directory to buy into. Register your interest or come recommended by clients who speak well of you, and we pick up the phone. Nothing is shared until you’ve agreed to exactly what we publish.",
      place: "Built in Melbourne, for Australia.",
      panelTitle: "How partners join",
      gates: [
        { label: "We do the homework", detail: "Experience, reviews and client care" },
        { label: "We call and ask", detail: "A conversation, never a cold sign-up" },
        { label: "You approve everything", detail: "Logo, profile and links, on your terms" },
        { label: "We list and introduce", detail: "Directory placement and matched intros" },
      ],
      panelFooter: "No fees at any step. Leaving takes one email.",
    },
    network: {
      h2a: "What finance",
      h2b: "partners receive.",
      body: "The network exists to connect homeowners who are building with brokers who can genuinely help. Partners receive, at no cost:",
      bullets: [
        "A place in the Preferred Finance Partner directory",
        "Features across BuilderHQ’s channels, always tagged",
        "Warm introductions to clients planning a build",
        "The monthly BuilderHQ market update",
        "First look as new homeowner resources roll out",
      ],
      cta: { label: "Join the network", href: FINANCE_JOIN_HREF },
    },
    faq: [
      {
        q: "Is there really no fee?",
        a: "Really. The network is free to join and free to stay in, with no lead charges and no exclusivity. We’re building the trusted referral layer for residential construction, and it only works if the best brokers are in it.",
      },
      {
        q: "What do you need from us?",
        a: "Your approval to list you, then your logo, a short business profile, and your website and socials, so we can present your business properly.",
      },
      {
        q: "What kind of clients are these?",
        a: "Homeowners on BuilderHQ who are preparing to build, renovate or develop and have asked us for finance guidance: construction loans, borrowing capacity, or refinancing to fund a build.",
      },
      {
        q: "Why is BuilderHQ doing this?",
        a: "Because our homeowners keep asking for finance recommendations, and we’d rather introduce someone we trust than send them to a search result. It makes the whole experience better.",
      },
      {
        q: "How do we leave if it’s not for us?",
        a: "One email. No lock in, no notice period, no hard feelings.",
      },
    ],
    close: {
      h2a: "Be the broker",
      h2b: "we recommend.",
      sub: "Join the finance partners we feature, list and introduce.",
      primary: { label: "Join the network", href: FINANCE_JOIN_HREF },
      trio: [
        "No fees, no lead charges",
        "Warm client introductions",
        "Opt out with one email",
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
      line: "Plans in, tenders back, control kept.",
    },
    {
      who: "Building designers",
      bring: "bring the design",
      line: "Featured, referred and kept in the loop.",
    },
    {
      who: "Builders",
      bring: "bring it to life",
      line: "Real work, priced fairly, won directly.",
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
   role, the ambient glows and the transition wash. ─────────────────── */
export const ROLE_PALETTE: Record<
  Role,
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
  homeowner: { from: "Your plans", to: "Real tenders", caption: "Upload once. Watch verified builders line up to price it." },
  builder: { from: "Your patch", to: "Won work", caption: "Real projects in your area, priced on your terms, won direct." },
  architect: { from: "Your practice", to: "New referrals", caption: "Featured, tagged and sent the clients who fit you best." },
  finance: { from: "Your expertise", to: "Ready clients", caption: "Introduced to homeowners the moment they’re ready to finance a build." },
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
   design + demo the component. Names/quotes/stats are illustrative. ── */
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
        "I’d put off getting quotes for our extension for the best part of a year because I dreaded the ring-around. This took an afternoon. Three local builders, all verified, all pricing the same job.",
      name: "Nadia Halabi",
      title: "Extension · Brunswick, VIC",
      initials: "NH",
      stats: [
        { value: "24 hours", label: "to first contact" },
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
  finance: [
    {
      quote:
        "The people they introduce have already decided to build, so they convert. It is a different world to the cold leads I used to pay for and chase.",
      name: "James Petropoulos",
      title: "Petro Finance · Carlton, VIC",
      initials: "JP",
      stats: [
        { value: "1 in 2", label: "introductions convert" },
        { value: "$0", label: "in lead fees" },
        { value: "$920k", label: "average build loan" },
      ],
    },
    {
      quote:
        "No lead fees, no exclusivity, and I’m the broker they actually put forward. That is a partnership, not another list I’m paying to sit on.",
      name: "Danielle Ferraro",
      title: "Ferraro Lending · Brighton, VIC",
      initials: "DF",
      stats: [
        { value: "8", label: "warm intros this quarter" },
        { value: "$0", label: "to join or stay" },
        { value: "1", label: "email to opt out" },
      ],
    },
    {
      quote:
        "Construction finance is a niche, and these are exactly the clients I want, introduced when they are actually ready, not months too early.",
      name: "Michael Tran",
      title: "Meridian Finance · Deakin, ACT",
      initials: "MT",
      stats: [
        { value: "6", label: "clients this quarter" },
        { value: "0", label: "cold leads" },
        { value: "$0", label: "cost to me" },
      ],
    },
  ],
};
