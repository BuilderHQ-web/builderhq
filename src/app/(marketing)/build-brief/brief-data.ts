/**
 * The Build Brief · content as data.
 *
 * One `BriefIssue` per weekly edition, matching the print/PDF format:
 * The Note → Market Watch (three signals) → The Feature → Project of
 * the Week → Voices → Partner Corner → Over to you. The template in
 * `[slug]/page.tsx` renders every section from this structure, so a
 * new edition is one new entry here (plus an OG card and, when the
 * Partner Corner features someone new, their partner slug).
 *
 * Editorial rules carried over from the publication:
 *   - every number is attributed (source line per signal)
 *   - third-party photography is never republished on the web edition;
 *     Project of the Week links out to the original coverage instead
 *   - the four-audience takes mirror the site's role system and link
 *     to the matching role pages
 *   - partner features link to the live partner profile (the register
 *     is the canonical record)
 */

import type { BriefChartSpec } from "./brief-charts";

/**
 * Copy strings support one inline mark: `[label](href)` renders as a
 * link (internal via next/link, external in a new tab). Everything
 * else is plain text — the publication stays data, not markup.
 */

export interface BriefTakes {
  owners: string;
  designers: string;
  builders: string;
  brokers: string;
}

export interface BriefSignal {
  /** "01" — the running number within Market Watch. */
  n: string;
  /** Segment name, e.g. "The Number", "Approval Watch", "Cost Pulse". */
  kicker: string;
  headline: string;
  /** Trailing words of the headline, rendered in the accent colour. */
  headlineAccent?: string;
  stat: { value: string; label: string; sub?: string };
  /** Small comparison rows rendered as a native chart-style list. */
  rows?: Array<{ label: string; value: string; accent?: boolean }>;
  rowsTitle?: string;
  /** In-code chart (Issue 002 onward) — see brief-charts.tsx. */
  chart?: BriefChartSpec;
  body: string[];
  /** A dated, actionable item that would be lost inside body copy —
   *  a deadline the reader has to act on. Set apart from the prose so
   *  it survives a skim. Issue 005 onward. */
  callout?: { kicker: string; title: string; paragraphs: string[] };
  source: string;
  /** One short closing line, set apart in italic at the signal's foot.
   *  Ran unrendered in the copy decks of Issues 004 and 005; settled
   *  as a permanent fixture from Issue 006. */
  weekend?: string;
  takes: BriefTakes;
}

export interface BriefQuoteDocRow {
  item: string;
  amount: string;
  /** PC = prime cost, PS = provisional sum. */
  flag?: "PC" | "PS" | "Excluded";
}

export interface BriefIssue {
  slug: string;
  number: number;
  /** ISO date, the Friday of publication. */
  date: string;
  displayDate: string;
  /** The issue's lead headline (also the SEO title core). */
  title: string;
  standfirst: string;
  /** Verbatim title tag override — used absolute, no site suffix. */
  seoTitle?: string;
  seoDescription: string;
  keywords: string[];
  ogImage: string;
  note: {
    /** Small-caps line above the heading, e.g. "This week from the
     *  BuilderHQ team". */
    eyebrow?: string;
    heading: string;
    paragraphs: string[];
    signoff: string;
  };
  /** Section intro line above Market Watch, e.g. "Three signals. For
   *  everyone in the build." */
  signalsIntro?: string;
  signals: BriefSignal[];
  feature: {
    kicker: string;
    headline: string;
    headlineAccent?: string;
    /** Italic serif deck under the headline. */
    standfirst?: string;
    /** Lede paragraph(s) ahead of any sub-sections. */
    paragraphs: string[];
    /** Sub-headed blocks, rendered as real h3 sections. */
    sections?: Array<{ heading: string; paragraphs: string[] }>;
    /** "The fine print" — optional expandable block. */
    finePrint?: { title: string; items: string[] };
    /** Newspaper fact box beside the article — key figures pulled
     *  from the copy, never new claims. */
    factBox?: { title: string; rows: Array<{ k: string; v: string }> };
    /** One line lifted from the article, set large. */
    pullQuote?: string;
    quoteDoc?: {
      docTitle: string;
      docSubtitle: string;
      rows: BriefQuoteDocRow[];
      total: { label: string; amount: string };
      footnotes: string[];
      annotations: Array<{ n: string; term: string; def: string }>;
    };
    source?: string;
    takes: BriefTakes;
  };
  /** Absent = the section does not render for that edition. */
  project?: {
    kicker: string;
    /** Named-project form (Issue 001). */
    name?: string;
    studio?: string;
    recognition?: string;
    /** Editorial-headline form (Issue 002 onward). */
    headline?: string;
    headlineAccent?: string;
    body: string[];
    pullQuote: string;
    credit?: string;
    /** Optional licensed photograph. The card renders typographic
     *  when absent — the outbound link is the point of the item. */
    image?: { src: string; alt: string; credit: string };
    /** Outbound link to the original coverage — we do not republish
     *  third-party photography. */
    link?: { label: string; href: string };
    source?: string;
    takes: BriefTakes;
  };
  /** Absent = the section does not render for that edition. */
  voices?: {
    kicker: string;
    headline: string;
    quote: string;
    attribution: string;
    role: string;
    body: string[];
    source?: string;
    takes?: BriefTakes;
  };
  /**
   * The BuilderHQ Procurement Standard. An editorial section on the
   * problem the Standard addresses, written to inform rather than to
   * sell: the practice it describes is industry-wide and the fix is
   * named, not pitched.
   */
  bps?: {
    kicker: string;
    headline: string;
    headlineAccent?: string;
    /** Italic serif deck under the headline. */
    standfirst?: string;
    paragraphs: string[];
    /** The problem stated as discrete, checkable propositions. */
    principles?: Array<{ n: string; title: string; body: string }>;
    /**
     * One scope line shown as three builders actually price it, then
     * the four answers the Standard requires instead. Issue 005 onward:
     * the argument is easier to see than to read.
     */
    comparison?: {
      title: string;
      line: string;
      quotes: Array<{ who: string; treatment: string; note?: string }>;
      verdict: string;
      answersTitle: string;
      answers: string[];
    };
    /** Closing block: what the Standard is, plainly. */
    definition?: { heading: string; paragraphs: string[] };
    pullQuote?: string;
    source?: string;
    takes?: BriefTakes;
  };
  /**
   * The podcast announcement. An announcement, not a signal: renders
   * with the weight of Partner Corner, photograph first. Issue 006
   * onward.
   */
  /**
   * A standing association, announced at the top of the issue. Two
   * marks on cream and one statement of fact: the weight is in the
   * names, so the layout stays out of their way. Issue 007 onward.
   */
  association?: {
    kicker: string;
    headline: string;
    headlineAccent?: string;
    /** Each mark carries its own height, because a tall shield and a
     *  wide lockup at the same height are not equal weight. */
    logos: Array<{ src: string; alt: string; height: number }>;
    paragraphs: string[];
    /** A closing line, set apart from the body. */
    closing?: string;
    cta?: { label: string; href: string };
  };
  podcast?: {
    kicker: string;
    headline: string;
    headlineAccent?: string;
    standfirst?: string;
    image: { src: string; alt: string };
    paragraphs: string[];
    cta?: { label: string; href: string };
  };
  /** Absent = the section does not render (content pending). */
  partnerCorner?: {
    /** Live partner slug — the section pulls name, logo and profile
     *  link from the register. */
    partnerSlug: string;
    headline: string;
    principal: string;
    principalRole: string;
    /** In the partner's own voice — only ever supplied, never written
     *  for them. */
    principalQuote?: string;
    portrait?: string;
    /**
     * Show the practice's mark beside the principal's portrait. The
     * person and the practice carry equal billing where a founder is
     * introduced alongside the business they built.
     */
    showLogo?: boolean;
    /**
     * The mark to use, when the register record does not carry one the
     * Brief can render. An individual broker's brand is their firm's,
     * which lives on `institution`, and that artwork is not always
     * prepared to float on a white card. Falls back to the partner
     * logo, then the institution logo.
     */
    logo?: string;
    /** Caption under the portrait when person and practice share the
     *  frame, e.g. "Fletcher Thompson, Director". */
    portraitCaption?: string;
    /** Editorial deck — one statement line above the copy. */
    deck?: string;
    /** Compact stat row from the register record. */
    stats?: Array<{ value: string; label: string; star?: boolean }>;
    why: string;
    practice: string;
    welcome: string;
    /**
     * A featured project, weighted ahead of the practice. Images are
     * always supplied by the partner; `credit` names the photographer
     * where one is known.
     */
    project?: {
      kicker: string;
      name: string;
      deck?: string;
      paragraphs: string[];
      hero: { src: string; alt: string };
      gallery?: Array<{ src: string; alt: string }>;
      credit?: string;
      facts?: Array<{ k: string; v: string }>;
      link?: { label: string; href: string };
    };
  };
  overToYou: {
    question: string;
    body: string;
  };
  /**
   * Questions this edition answers — rendered as a visible block near
   * the foot AND mirrored as FAQPage structured data (Issue 003
   * onward). Answers must restate figures already sourced above;
   * never new claims.
   */
  faq?: Array<{ q: string; a: string }>;
  /** End-of-page blocks (Issue 002 onward). */
  share?: string;
  subscribeLine?: string;
  furtherReading?: Array<{ label: string; href: string }>;
  /** Visible, grouped source list with working links (Issue 002
   *  onward) — the colophon `sources` remains the one-line credit. */
  sourceGroups?: Array<{
    heading: string;
    links: Array<{ label: string; href: string }>;
  }>;
  /** Back-cover credit line rendered under the source list. */
  creditLine?: string;
  /** Colophon — datasets and publications used. */
  sources: string[];
}

export const BRIEF_ISSUES: BriefIssue[] = [
  {
    slug: "issue-001",
    number: 1,
    date: "2026-07-10",
    displayDate: "Friday, 10 July 2026",
    title: "We need 60,000 housing starts a quarter. We are not there yet.",
    standfirst:
      "Dwelling commencements against the 1.2 million home target, May building approvals, rising construction costs, and how to compare three builder quotes fairly.",
    seoDescription:
      "The Build Brief, Issue 001: Australia's housing starts against the 1.2 million home target, May building approvals, new dwelling construction costs, comparing builder quotes, and Melbourne design studio Evoka. Five minutes, every Friday, by BuilderHQ.",
    keywords: [
      "australian housing market",
      "housing starts australia",
      "dwelling commencements",
      "building approvals australia",
      "construction costs australia",
      "new home building costs",
      "builder quotes comparison",
      "residential construction news",
      "1.2 million homes target",
      "home building australia",
    ],
    ogImage: "/build-brief/og-issue-001.jpg",
    note: {
      heading: "A first word from the BuilderHQ team",
      paragraphs: [
        "Welcome to The Build Brief. Every Friday, one calm and useful read on the forces shaping how homes get built in Australia.",
        "This is our first edition, so here is what we are setting out to do. Building a home in Australia asks a great deal of the people who take it on, and the information around it is often scattered, technical, or quietly out of date. The Build Brief is our attempt to fix a small part of that.",
        "Each Friday we take the week in residential construction, the numbers, the decisions and the shifts that actually matter, and set them out plainly enough to act on. Homeowners and developers, architects and designers, builders, and the brokers behind the finance each watch the same market through a different window. We look through all four.",
        "We are not here to sell you anything in these pages. We are here to be useful, and to earn a place in your Friday. If we manage that, everything else takes care of itself. Thank you for reading the very first edition.",
      ],
      signoff: "The BuilderHQ Team",
    },
    signals: [
      {
        n: "01",
        kicker: "The Number",
        headline: "We need 60,000 starts a quarter. We are not there yet.",
        stat: {
          value: "48,012",
          label: "dwelling commencements, March quarter 2026",
          sub: "about 20% below the pace",
        },
        rowsTitle: "How the quarter compares to the pace we need",
        rows: [
          { label: "March quarter 2026", value: "48,012", accent: true },
          { label: "Pace needed for the target", value: "60,000" },
          { label: "Gap to close", value: "~12,000 starts" },
        ],
        body: [
          "About 12,000 starts below the quarterly pace the 1.2 million-home target implies. The demand is strong; the opportunity is in turning it into homes.",
        ],
        source: "ABS Building Activity · Treasury, 2026",
        takes: {
          owners: "Line up finance, design and builder before you commit.",
          designers: "Bring budget into the design early, not at tender.",
          builders: "Clear pricing and timelines reassure cautious clients.",
          brokers: "Start the construction-finance conversation early.",
        },
      },
      {
        n: "02",
        kicker: "Approval Watch",
        headline:
          "Approvals are holding. The density we need is still catching up.",
        stat: {
          value: "-10.4%",
          label: "medium-density approvals, May",
          sub: "detached houses rose 2.8%",
        },
        rowsTitle: "May approvals: houses up, medium-density softer",
        rows: [
          { label: "Total dwellings approved", value: "-1.1%" },
          { label: "Private sector houses", value: "+2.8%", accent: true },
          { label: "Private dwellings excl. houses", value: "-10.4%" },
          { label: "Value of residential approved", value: "-5.7%" },
        ],
        body: [
          "Detached homes are leading, while apartments and townhouses have more ground to make up. Both matter for supply near infrastructure.",
        ],
        source: "ABS Building Approvals, May 2026",
        takes: {
          owners: "Test townhouse or dual-occupancy feasibility early.",
          designers: "Planning-aware, medium-density design is worth prioritising.",
          builders: "Multi-residential timing still hinges on approvals and funding.",
          brokers: "Detached and multi-residential clients need different plans.",
        },
      },
      {
        n: "03",
        kicker: "Cost Pulse",
        headline: "Build prices are rising as borrowing power tightens.",
        stat: {
          value: "+5.6%",
          label: "new dwelling price growth, year to May",
          sub: "up from 4.7%",
        },
        rowsTitle: "Prices rising as new lending eases",
        rows: [
          { label: "New dwelling prices, year to May", value: "+5.6%", accent: true },
          { label: "New loan commitments, Mar qtr", value: "-6.2%" },
          { label: "Owner-occupier lending", value: "-6.9%" },
          { label: "First home buyer lending", value: "-4.3%" },
        ],
        body: [
          "Costs are climbing while new lending has cooled, so it pays to plan feasibility early. New lending eased 6.2% last quarter.",
        ],
        source: "ABS CPI & Lending Indicators, 2026",
        takes: {
          owners: "Check how long a quote holds, and keep a contingency.",
          designers: "Design with pricing in mind from the start.",
          builders: "Set out price validity, exclusions and any escalation clearly.",
          brokers: "Approved borrowing and final cost can move apart; plan for it.",
        },
      },
    ],
    feature: {
      kicker: "The Feature",
      headline: "Three quotes, three different scopes. How to compare them fairly.",
      paragraphs: [
        "Ask three builders to price the same home and the totals can look very different. That is rarely about one being cheaper. It comes down to what each quote includes, and what still sits in allowances.",
        "Line them up on the same scope and you are comparing prices, not guesses. The annotated quote alongside shows the five places two quotes most often part ways: prime cost items, provisional sums, exclusions, price validity and progress payments.",
        "A clear, complete quote protects the client, and it is a good builder's fastest way to earn trust.",
      ],
      quoteDoc: {
        docTitle: "Quotation No. 2041",
        docSubtitle: "New two-storey dwelling · Prepared for: A. Homeowner",
        rows: [
          { item: "Preliminaries & site set-up", amount: "$18,400" },
          { item: "Demolition & excavation", amount: "$9,200" },
          { item: "Slab & footings", amount: "$41,600" },
          { item: "Frame & roof structure", amount: "$58,300" },
          { item: "Roofing & cladding", amount: "$37,900" },
          { item: "Windows & external doors", amount: "$22,000", flag: "PC" },
          { item: "Kitchen joinery", amount: "$28,000", flag: "PS" },
          { item: "Tiling & waterproofing", amount: "$16,500" },
          { item: "Services (elec. + plumb.)", amount: "$34,200" },
          { item: "Landscaping", amount: "Excluded", flag: "Excluded" },
        ],
        total: { label: "Total (ex GST)", amount: "$266,100" },
        footnotes: [
          "Price valid: 30 days from issue",
          "Payments: deposit + 5 progress claims",
        ],
        annotations: [
          {
            n: "01",
            term: "Prime cost items",
            def: "an estimate, not a fixed price",
          },
          {
            n: "02",
            term: "Provisional sums",
            def: "allowance for unselected work",
          },
          { n: "03", term: "Exclusions", def: "not in the price at all" },
          { n: "04", term: "Price validity", def: "how long the quote holds" },
          {
            n: "05",
            term: "Progress payments",
            def: "when money is claimed",
          },
        ],
      },
      takes: {
        owners: "Compare like for like before you compare price.",
        designers: "Clear drawings and selections make quotes comparable.",
        builders: "A transparent quote earns trust faster than a low one.",
        brokers: "Realistic allowances keep a loan on track later.",
      },
    },
    project: {
      kicker: "Project of the Week",
      name: "House in a Garden",
      studio: "Edition Office",
      recognition: "Victorian Architecture Awards 2026 · winner",
      body: [
        "This year's Victorian Architecture Award winner treats landscape as part of the architecture, not a finishing layer. Privacy, outlook and light are resolved by the garden from the first sketch.",
      ],
      pullQuote:
        "The strongest projects use landscape to solve privacy, light and outlook from the very beginning.",
      credit: "Photography by Maxime Delvaux, published with the original coverage.",
      link: {
        label: "View the project at ArchitectureAU",
        href: "https://architectureau.com/articles/2026-victorian-architecture-awards/",
      },
      takes: {
        owners: "A smart site strategy adds value without adding size.",
        designers: "Landscape as concept, not decoration.",
        builders: "Sequencing structure, glazing and planting is the craft.",
        brokers: "Design quality can support long-term value.",
      },
    },
    voices: {
      kicker: "Voices · From the Frontline",
      headline: "The ambition is right. The pace is the challenge.",
      quote: "The housing target will be won or lost before construction starts.",
      attribution: "Attributed to Tom Devitt",
      role: "Senior Economist, Housing Industry Association",
      body: [
        "HIA's Tom Devitt notes Australia needs about 240,000 homes a year, and started 197,340 in the year to March. The encouraging part is where the leverage sits: much of the gap is decided before a site even begins, in design, approval, finance and contracts.",
      ],
      takes: {
        owners: "Resolve finance, design and builder early to keep momentum.",
        designers: "Approvals and documentation shape the timeline too.",
        builders: "Speed and certainty before site start are real advantages.",
        brokers: "Guiding clients before contract stage makes the difference.",
      },
    },
    partnerCorner: {
      partnerSlug: "evoka-studio",
      headline:
        "Meet Evoka Studio, where a home is carried from feasibility to the final drawing.",
      principal: "Anthony Camuglia",
      principalRole: "Founder",
      principalQuote:
        "Design has been a passion of mine for as long as I can remember.",
      portrait: "/build-brief/issue-001/anthony-camuglia.jpg",
      why: "Anthony brings ten years of residential design and delivery to every Evoka Studio project. The studio starts with feasibility, so owners understand what a site can carry before design begins. From there, concept design, town planning, and construction documentation are all handled under one roof, with a focus on creativity, transparency, and seamless delivery from the first sketch through to handover.",
      practice:
        "Evoka Studio is a Niddrie practice designing new homes, renovations and townhouse developments across Melbourne, running end to end from feasibility and schematic design through planning and interiors to construction documentation.",
      welcome:
        "Selected by BuilderHQ as one of our Preferred Design Partners. We welcome Anthony and the Evoka Studio team, and look forward to introducing their work to owners and developers across Melbourne.",
    },
    overToYou: {
      question:
        "What would you most like The Build Brief to help you understand?",
      body: "Reply with a line. The topics readers ask about most will shape where we take future editions.",
    },
    sources: [
      "Australian Bureau of Statistics",
      "Treasury",
      "Reserve Bank of Australia",
      "Housing Industry Association",
      "Consumer Affairs Victoria",
      "ArchitectureAU",
      "ArchDaily",
    ],
  },
  {
    slug: "issue-002",
    number: 2,
    date: "2026-07-17",
    displayDate: "Friday, 17 July 2026",
    title:
      "Victoria's new building rules, the labour squeeze, and the return of negotiation.",
    standfirst:
      "Victoria's building rules changed on 1 July. Australia is now the world's most labour-constrained construction market. And auctions are giving way to negotiation.",
    seoTitle: "The Build Brief 002: Victoria's New Building Rules | BuilderHQ",
    seoDescription:
      "Victoria's building rules changed on 1 July. Australia is now the world's most labour-constrained construction market. And auctions are giving way to negotiation.",
    keywords: [
      "australian residential construction news",
      "victoria building regulations july 2026",
      "first resort home warranty victoria",
      "construction labour shortage australia",
      "building approvals australia",
      "melbourne auction clearance rates",
      "dwellings under construction australia",
      "construction cost inflation 2026",
      "home warranty $400,000 victoria",
      "rectification orders victoria",
      "data centre construction melbourne",
    ],
    ogImage: "/build-brief/og-issue-002.jpg",
    note: {
      eyebrow: "This week from the BuilderHQ team",
      heading: "Three things moved this week.",
      paragraphs: [
        "Victoria's building rules changed on 1 July, and the detail is now landing in contracts being signed today. Australia became the most labour-constrained construction market in the world. And buyers quietly got their leverage back.",
        "This edition leans practical. The Feature sets out Victoria's new buyer protections in plain terms, including the dates that decide which scheme covers your job. If you are signing a contract in Victoria this month, that is the section to read.",
        "One note on reading the numbers. Approvals and activity are not the same thing. An approval is a permit, a promise that a home could be built. Activity is the work itself. Both were published this month, and they did not tell the same story. That gap is this week's real signal.",
        "If The Build Brief is new to you, [our first edition](/build-brief/issue-001) sets out what we are here to do.",
      ],
      signoff: "The BuilderHQ Team",
    },
    signalsIntro: "Three signals. For everyone in the build.",
    signals: [
      {
        n: "01",
        kicker: "The Number",
        headline: "The pipeline is full. The industry is finishing,",
        headlineAccent: "not starting.",
        stat: {
          value: "243,864",
          label: "dwellings under construction, March quarter 2026",
          sub: "90,972 are detached houses",
        },
        chart: {
          kind: "bars",
          title: "The pipeline against the flow, March quarter 2026",
          desc: "Dwellings under construction dwarf both the quarter's commencements and completions.",
          valueHeading: "Dwellings, March quarter 2026",
          bars: [
            {
              label: "Under construction",
              value: 243864,
              display: "243,864",
              accent: true,
            },
            { label: "Commenced", value: 48012, display: "48,012" },
            { label: "Completed", value: 43816, display: "43,816" },
          ],
        },
        body: [
          "Australia has 243,864 homes under construction, including 90,972 detached houses. Starts fell 11.2% over the quarter to 48,012, yet they are still 11.7% higher than a year ago, and completions held at 43,816. The industry is busy finishing what it already had rather than breaking new ground.",
          "Approvals are a promise. Commencements are the work, and the space between the two is where capacity bites. Related reading: [how we think about comparing builders before a start](/build-brief/perspectives/choosing-a-builder-word-of-mouth).",
        ],
        source:
          "ABS Building Activity, Australia, March quarter 2026 (released 8 July 2026)",
        takes: {
          owners:
            "A deep pipeline means good trades are already committed. Book early. When you are ready, [post your project](/signup?role=owner).",
          designers:
            "Documentation quality decides how fast a job moves from permit to site.",
          builders:
            "The backlog is real work. Sequencing and cash flow matter more than chasing new leads.",
          brokers:
            "Longer builds stretch construction facilities. Check expiry dates before drawdown.",
        },
      },
      {
        n: "02",
        kicker: "Cost Pulse",
        headline: "Residential is not only competing with",
        headlineAccent: "residential anymore.",
        stat: {
          value: "100%",
          label:
            "Australian and New Zealand cities reporting construction labour shortages",
          sub: "cost inflation forecast 5.4% in 2026",
        },
        chart: {
          kind: "bars",
          title: "Markets reporting construction labour shortages",
          desc: "Share of surveyed construction markets reporting labour shortages, by region.",
          valueHeading: "Share of surveyed markets",
          max: 100,
          bars: [
            {
              label: "Australia & New Zealand",
              value: 100,
              display: "100%",
              accent: true,
            },
            { label: "European Union", value: 93, display: "93%" },
            { label: "North America", value: 79, display: "79%" },
            { label: "Global average", value: 71, display: "71%" },
          ],
        },
        body: [
          "Turner & Townsend rates Australia and New Zealand the most labour-constrained construction markets in the world, with shortages reported in every city surveyed, against a global average of 71%. Labour availability is now the single biggest driver of construction costs. Input costs, by contrast, have stabilised over the past year.",
          "The pressure has become sectoral. Data centres are the top performing sector in both Melbourne and Sydney, and 83% of markets report shortages in the mechanical, electrical and plumbing trades those projects consume. May's record $10.83 billion of non-residential approvals was driven by large data centre projects in Victoria and New South Wales. Add health, defence and the run-up to Brisbane 2032, and the trades a home needs are being bid for by projects a home cannot outbid.",
          "Regional construction cost inflation is forecast at 5.4% this year, easing to 4.9% in 2027.",
        ],
        source:
          "Turner & Townsend Global Construction Market Intelligence, reported by Build Australia, 9 July 2026; ABS Building Approvals, May 2026",
        takes: {
          owners:
            "Waiting does not automatically make a build cheaper. Trade availability, not material price, will set your timeline.",
          designers:
            "Design complexity now has a clearer labour-cost consequence. Bring buildability forward.",
          builders:
            "Your mechanical, electrical and plumbing subcontractors are being courted. Capacity is a strategic question, not a back-office one. When you have room, [browse projects that fit your capacity](/signup?role=builder).",
          brokers:
            "Labour escalation can move a final build cost after approval. Contingency is doing real work this year.",
        },
      },
      {
        n: "03",
        kicker: "Market Mood",
        headline: "The market has moved from theatre to",
        headlineAccent: "negotiation.",
        stat: {
          value: "30%",
          label: "national auction share of new listings, June 2026",
          sub: "clearance rate 52.7%, lowest since July 2022",
        },
        chart: {
          kind: "slope",
          title: "Auction share of new listings",
          desc: "The national share of auctions to new listings fell from about 45% in November 2025 to just over 30% in June 2026, against a long-term average of around 28%.",
          valueHeading: "Auction share of new listings",
          points: [
            { label: "Nov 2025", value: 45, display: "~45%" },
            { label: "Jun 2026", value: 30, display: "~30%" },
          ],
          reference: { value: 28, display: "28%", label: "long-term average" },
          domain: [22, 50],
        },
        body: [
          "The national share of auctions to new listings fell from nearly 45% in November 2025 to just over 30% in June 2026, led by Sydney and Melbourne, against a long-term average of around 28%. Some of that is the ordinary swing from spring selling season to winter. The part that is not seasonal is the clearance rate, which fell from a peak of 72% in late September 2025 to 52.7% in late March, the lowest since July 2022.",
          "As clearances fall and withdrawals rise, vendors are choosing private treaty over a public campaign that might not sell. Cotality attributes the broader cooling to the cumulative effect of rate rises, cost of living pressure and policy uncertainty. With the share still above its long-run average, there is room for it to fall further.",
          "For anyone buying a site, a knockdown or a renovator, the negotiating table has moved.",
        ],
        source: "Cotality Monthly Housing Chart Pack, July 2026",
        takes: {
          owners:
            "There may be more room to negotiate on land and renovator stock than there was six months ago. Before you commit, [get a preliminary estimate](/estimate_request_landing_page).",
          designers:
            "Clients may take longer to commit. Stage feasibility so the early decisions feel safe.",
          builders:
            "The pipeline is less automatic. Clarity and trust before contract matter more.",
          brokers:
            "Pre-approvals, valuations and deposit positions need closer monitoring in a softer market.",
        },
      },
    ],
    feature: {
      kicker: "The Feature",
      headline: "Victoria's building rules changed on 1 July. Here is what",
      headlineAccent: "actually moved.",
      standfirst:
        "The largest change to Victorian domestic building regulation in years commenced this month. Three things matter most, and one date decides which set applies to you.",
      paragraphs: [
        "The Building Legislation Amendment (Buyer Protections) Act 2025 commenced on 1 July, alongside provisions from the Building Legislation and Treasury Legislation (Tax Relief) Amendment Act 2026. Three things matter most.",
      ],
      sections: [
        {
          heading: "Insurance: from last resort to first resort",
          paragraphs: [
            "Domestic Building Insurance has been replaced by the First Resort Home Warranty Scheme for contracts signed on or after 1 July 2026, on work over $20,000 in buildings of three storeys or less. Cover rises from $300,000 to $400,000.",
            'The phrase that matters is "first resort". Under DBI, an owner could claim only if the builder died, disappeared or became insolvent. Under Home Warranty, an owner can claim where work is incomplete, defective or non-compliant and the builder is unable or unwilling to put it right. Major defects are covered for six years, others for two.',
            "The Building and Plumbing Commission is now the sole, not-for-profit provider. The private domestic building insurance market closed on 1 July. Existing DBI policies run on their own terms until they expire, and cover does not transfer.",
          ],
        },
        {
          heading: "Rectification orders: a ten-year reach, backwards",
          paragraphs: [
            "The BPC can now direct a builder or a developer to fix defective, non-compliant or incomplete work, up to ten years after completion, extendable by VCAT. The power is retrospective, so it reaches homes finished before 1 July. The BPC can also issue a rectification costs order, recovering the cost of investigating and monitoring compliance.",
          ],
        },
        {
          heading: "Registration: financial standing becomes a licence condition",
          paragraphs: [
            "The BPC can set minimum financial requirements for domestic building practitioners. A two-year transition runs to 30 June 2028, with the requirements expected to apply from 1 July 2028. Practitioners will need to satisfy them to become registered and to stay registered. It is the same direction the platform takes with [verified builders on BuilderHQ](/#trust).",
          ],
        },
        {
          heading: "Three practical notes",
          paragraphs: [
            "The premium is paid to the BPC within ten business days of the contract being signed or work starting, whichever comes first, and the owner is covered from signing. Victorian HIA contract templates issued before 1 July should not be used for new jobs. And industry has asked that dispute resolution keep pace with the new cover, which is a fair point: the scheme's value to owners and builders alike depends on claims moving quickly.",
          ],
        },
      ],
      finePrint: {
        title: "Also worth knowing",
        items: [
          "Developers of apartment buildings of four storeys or more must notify the BPC before applying for an occupancy permit, from 1 July 2026.",
          "Developer bonds of 2% of total build cost do not effectively commence until 1 July 2027, applying where a building permit is issued on or after that date. Decennial insurance will be an alternative.",
          "A new building permit levy of 0.37 cents in the dollar applies to non-regional Class 2 to 8 buildings where the cost of work is $1.5 million or more, replacing the cladding rectification levy.",
          "Further Domestic Building Contracts Act reforms are expected from 1 December 2026.",
        ],
      },
      factBox: {
        title: "The detail that matters",
        rows: [
          { k: "1 July 2026", v: "Home Warranty replaces DBI for new contracts" },
          { k: "$400,000", v: "cover, up from $300,000" },
          { k: "6 yrs · 2 yrs", v: "major defects · other defects" },
          { k: "10 years", v: "rectification reach, retrospective" },
          { k: "1 July 2028", v: "financial standing expected to apply" },
        ],
      },
      source:
        "Building and Plumbing Commission; Maddocks, 8 July 2026; Victorian Government",
      takes: {
        owners:
          "Check your contract date. It decides which scheme covers you. When quotes arrive, [compare tenders side by side](/#how).",
        designers:
          "Defect definitions now sit closer to documentation. Specify clearly.",
        builders:
          "New contracts, new premium timing, new obligations. Update the paperwork this month.",
        brokers:
          "Warranty cover and builder financial standing now travel together.",
      },
    },
    voices: {
      kicker: "Voices · From the Frontline",
      headline: "Momentum is real. So are the new headwinds.",
      quote:
        "The data continues to reflect the good momentum in Australian home building",
      attribution: "Tim Reardon",
      role: "Chief Economist, Housing Industry Association",
      body: [
        "Private house approvals reached 10,537 in May, the highest since September 2021 and a fourth consecutive month above 10,000, up 13.2% on the year. Victorian new home approvals rose 15.0% over the three months to May against the same quarter a year earlier, behind only Tasmania and Queensland.",
        "Reardon credits population growth and low unemployment for the underlying demand, while noting that rising interest rates, fuel costs and international turmoil have started to weigh on confidence. The Reserve Bank has lifted the cash rate three times this year to 4.35%, held in June, and next decides on 11 August.",
        "Both things are true at once, and the space between them is where early planning earns its keep. Building in Victoria? [Victorian builders on the platform](/for/builders) pick up projects that fit their capacity.",
      ],
      source:
        "HIA Economics, July 2026; ABS Building Approvals, May 2026; Reserve Bank of Australia",
    },
    partnerCorner: {
      partnerSlug: "levan-design",
      headline: "Meet Levan Design.",
      principal: "Natasha Levan",
      principalRole: "Principal, Levan Design",
      portrait: "/build-brief/issue-002/natasha-levan.jpg",
      // principalQuote is pending from the partner — the layout renders
      // it the moment it lands in this entry.
      deck: "One pair of hands, from the first sketch to the last drawing.",
      stats: [
        { value: "30+ yrs", label: "designing buildings" },
        { value: "2003", label: "her practice, Eltham" },
        { value: "5.0", label: "13 Google reviews", star: true },
      ],
      why: "Natasha Levan has drawn buildings for more than thirty years, and she still draws every one herself. Commercial work, apartments and interiors came first, then five years inside Englehart Homes learning how houses are priced and built. Since 2003, all of it has gone into one thing: homes for Melbourne's north east, done properly.",
      practice:
        "Deliberately small, by design: new homes, renovations, extensions and interiors, each carried by the same hand from feasibility to documentation. Registered building practitioner with the Victorian Building Authority; member of Design Matters National.",
      welcome:
        "Featured from our Preferred Design Partners register. We are glad to put our name behind Natasha, and to introduce her work to owners across Melbourne.",
    },
    overToYou: {
      question:
        "What would you most like The Build Brief to help you understand?",
      body: "Reply with a line. The topics readers ask about most shape where we take future editions.",
    },
    share:
      "Forward The Build Brief to someone planning, designing, financing or building a home.",
    subscribeLine: "Five minutes, every Friday.",
    furtherReading: [
      { label: "Read Issue 001", href: "/build-brief/issue-001" },
      {
        label: "Read the full opinion piece",
        href: "/build-brief/perspectives/choosing-a-builder-word-of-mouth",
      },
    ],
    sourceGroups: [
      {
        heading: "Market Watch 01 · 243,864",
        links: [
          {
            label: "ABS, Building Activity, Australia, March quarter 2026",
            href: "https://www.abs.gov.au/statistics/industry/building-and-construction/building-activity-australia/latest-release",
          },
        ],
      },
      {
        heading: "Market Watch 02 · 100%",
        links: [
          {
            label:
              'Build Australia, "Construction costs rise as labour shortages worsen and demand grows", 9 July 2026 (Turner & Townsend Global Construction Market Intelligence)',
            href: "https://www.buildaustralia.com.au/news_article/construction-costs-rise-as-labour-shortages-worsen/",
          },
          {
            label: 'ABS, "Dwelling approvals fall in May"',
            href: "https://www.abs.gov.au/media-centre/media-releases/dwelling-approvals-fall-may",
          },
        ],
      },
      {
        heading: "Market Watch 03 · 30%",
        links: [
          {
            label: "Cotality, Monthly Housing Chart Pack, July 2026",
            href: "https://www.cotality.com/au/insights/articles/monthly-housing-chart-pack-july-2026",
          },
          {
            label:
              'Mortgage Professional Australia, "Fewer vendors testing market at auction as clearance rates slide"',
            href: "https://www.mpamag.com/au/news/general/fewer-vendors-testing-market-at-auction-as-clearance-rates-slide/582467",
          },
        ],
      },
      {
        heading: "The Feature · Victoria's 1 July reforms",
        links: [
          {
            label: 'Building and Plumbing Commission, "Home Warranty insurance"',
            href: "https://www.bpc.vic.gov.au/news/2026/home-warranty-insurance-coming-soon",
          },
          {
            label: "BPC, Domestic Building Insurance and Home Warranty",
            href: "https://www.bpc.vic.gov.au/home-owners/insurance-for-domestic-building-work/domestic-building-insurance-and-home-warranty",
          },
          {
            label: 'Maddocks, "Building reforms continue in Victoria", 8 July 2026',
            href: "https://www.maddocks.com.au/insights/building-reforms-continue-in-victoria-amendments-commencing-on-1-july-2026-and-other-upcoming-changes-to-building-legislation",
          },
          {
            label: 'Victorian Government, "Better domestic building insurance"',
            href: "https://www.vic.gov.au/better-domestic-building-insurance",
          },
          {
            label:
              'HIA, "How new Buyer Protection and insurance laws affect builders in Victoria"',
            href: "https://hia.com.au/resources-and-advice/managing-your-business/managing-compliance/articles/how-new-buyer-protection-and-insurance-laws-affect-builders-in-victoria",
          },
        ],
      },
      {
        heading: "Voices",
        links: [
          {
            label:
              'HIA Economics, "Detached house approvals continue to pick up", July 2026',
            href: "https://hia.com.au/our-industry/newsroom/economic-research-and-forecasting/2026/07/detached-house-approvals-continue-to-pick-up",
          },
          {
            label: "ABS Building Approvals, May 2026",
            href: "https://www.abs.gov.au/statistics/industry/building-and-construction/building-approvals-australia/latest-release",
          },
          {
            label: "RBA, Monetary Policy Decision, June 2026",
            href: "https://www.rba.gov.au/media-releases/2026/mr-26-15.html",
          },
        ],
      },
    ],
    creditLine:
      "This edition used data and reporting from the Australian Bureau of Statistics, the Reserve Bank of Australia, the Housing Industry Association, Turner & Townsend, Cotality, Build Australia, the Building and Plumbing Commission and Maddocks. The Build Brief is compiled by BuilderHQ, Melbourne.",
    sources: [
      "the Australian Bureau of Statistics",
      "the Reserve Bank of Australia",
      "the Housing Industry Association",
      "Turner & Townsend",
      "Cotality",
      "Build Australia",
      "the Building and Plumbing Commission",
      "Maddocks",
    ],
  },
  {
    slug: "issue-003",
    number: 3,
    date: "2026-07-24",
    displayDate: "Friday, 24 July 2026",
    title:
      "The cost base restarts, the failure rate turns, and a 20-day house.",
    standfirst:
      "Construction costs picked up again in the June quarter. Construction insolvencies fell for the first time in five years. And a Melbourne pilot went from slab to practical completion in 20 business days.",
    seoTitle:
      "The Build Brief 003: Construction Costs Rise, Insolvencies Turn | BuilderHQ",
    seoDescription:
      "Construction costs rose 1.0% in the June quarter as the March lull ended. Construction insolvencies fell for the first time in five years. A Melbourne prefab pilot went slab to completion in 20 business days. And the BuilderHQ Procurement Standard goes to Master Builders Australia.",
    keywords: [
      "construction costs australia june quarter 2026",
      "cordell construction cost index",
      "construction cost increase 2026",
      "construction insolvency australia",
      "asic insolvency statistics construction",
      "construction insolvencies falling",
      "prefab homes australia",
      "modular housing victoria",
      "metricon prefab pilot",
      "how long does a prefab home take to build",
      "rba august 2026 rate decision building",
      "cpi june quarter 2026 new dwelling costs",
      "builderhq procurement standard",
      "construction procurement standard",
      "comparing builder quotes australia",
      "provisional sums and prime cost items",
      "price validity period building contract",
    ],
    ogImage: "/build-brief/og-issue-003.jpg",
    note: {
      eyebrow: "This week from the BuilderHQ team",
      heading: "The cost base restarted, and the failure rate turned.",
      paragraphs: [
        "Two numbers landed this week that point in opposite directions, and both are worth your attention.",
        "Construction costs grew 1.0% in the June quarter, up from just 0.2% in March. The lull did not last. At the same time, construction company failures fell for the first time in five years, even though construction remains the largest single category of business failure in Australia by a wide margin.",
        "Read together, they describe an industry that is busier and more stable than it was, and getting more expensive again. That is not a contradiction. It is what a recovery under cost pressure looks like.",
        "The third item this week is a Melbourne estate where two houses went from slab to practical completion in twenty business days. Worth understanding properly, including what that number does and does not include.",
        "One date to circle. The June quarter inflation figure lands on Wednesday 29 July, and the Reserve Bank decides on 11 August. New dwelling costs carry the largest single weight in the CPI basket, so this week's cost index reaches well beyond building. Voices sets out why. And if The Build Brief is new to you, [last week's edition](/build-brief/issue-002) covered Victoria's new building rules in full.",
      ],
      signoff: "The BuilderHQ Team",
    },
    signalsIntro: "Three signals. For everyone in the build.",
    signals: [
      {
        n: "01",
        kicker: "Cost Pulse",
        headline: "Construction costs are moving again. The March lull",
        headlineAccent: "did not last.",
        stat: {
          value: "+1.0%",
          label: "national construction cost growth, June quarter 2026",
          sub: "annual growth 2.8%",
        },
        chart: {
          kind: "bars",
          title: "Quarterly construction cost growth, 2026",
          desc: "The Cordell Construction Cost Index rose 1.0% in the June quarter after 0.2% in March. Annual growth lifted from 2.3% to 2.8%.",
          valueHeading: "Quarterly growth",
          bars: [
            { label: "March quarter 2026", value: 0.2, display: "0.2%" },
            {
              label: "June quarter 2026",
              value: 1.0,
              display: "1.0%",
              accent: true,
            },
          ],
        },
        body: [
          "Cotality's Cordell Construction Cost Index rose 1.0% nationally over the June quarter, up sharply from 0.2% in the March quarter. Annual growth lifted from 2.3% to 2.8%.",
          "The context matters as much as the number. After the disruption to shipping through the Strait of Hormuz earlier this year, analysts forecast severe increases in material and fuel costs. Those increases have not arrived at the scale predicted. Annual growth of 2.8% remains below the 2.9% recorded in both the March and June quarters of 2025, so the cost base is accelerating from a low point rather than spiking.",
          "Where the pressure is showing up is more useful than the headline. Cotality points to PVC and PEX pipe products, heavy plant and crane hire, fuel levies, and freight and logistics charges. These are the line items that rarely appear in a quote comparison and often appear later as a surcharge.",
          "The practical consequence is that estimates are ageing faster than they were three months ago.",
        ],
        source:
          "Cotality Cordell Construction Cost Index, June quarter 2026 (released 22 July 2026)",
        takes: {
          owners:
            "An estimate prepared three months ago may no longer hold. Ask when it was priced, and [get a current estimate](/estimate_request_landing_page) before you commit.",
          designers:
            "Cost advice given during design needs a review date attached to it.",
          builders:
            "The movement is in freight, plant and logistics rather than headline materials. Worth naming in your quote so it does not read as a margin grab later.",
          brokers:
            "Contingency assumptions set early in the year are looking thinner than they did.",
        },
      },
      {
        n: "02",
        kicker: "The Number",
        headline: "A busy builder is not automatically a",
        headlineAccent: "safe builder.",
        stat: {
          value: "24.4%",
          label:
            "construction's share of all company administrations, 1 July 2025 to 31 May 2026",
          sub: "construction failures down 4.5% on last year",
        },
        chart: {
          kind: "bars",
          title: "Share of company administrations by industry",
          desc: "Construction's share of external administrations, 1 July 2025 to 31 May 2026, against the next largest industries.",
          valueHeading: "Share of administrations",
          max: 30,
          bars: [
            { label: "Construction", value: 24.4, display: "24.4%", accent: true },
            {
              label: "Accommodation & food services",
              value: 14.9,
              display: "14.9%",
            },
            {
              label: "Other & non-described services",
              value: 9.8,
              display: "9.8%",
            },
            { label: "Retail trade", value: 7.2, display: "7.2%" },
            {
              label: "Professional & technical services",
              value: 6.8,
              display: "6.8%",
            },
          ],
        },
        body: [
          "ASIC's June Corporate Insolvency Update shows 12,819 companies entered external administration in the first eleven months of the financial year, down 4.6% on the same period a year earlier. Construction was the largest category at 24.4% of appointments, well ahead of accommodation and food services at 14.9%.",
          "There is a second, more encouraging number underneath it. Analysis of ASIC's insolvency statistics published on 13 July found 3,435 construction companies entered external administration for the first time in 2025-26, down from 3,596 the year before. That is a fall of 4.5%, and the first annual decline since the post-COVID insolvency wave began.",
          "Both things are true at once. The failure rate has turned, and construction is still the single largest source of company failure in Australia, as it has been every year since 2021-22.",
          "Worth keeping in proportion. Construction has the highest count partly because Australia has more construction businesses than almost any other industry. The figure is a reason to do due diligence, not a reason for alarm. It is also the reason [every builder on BuilderHQ is verified](/#trust) against the ABN register and state licence registers before an owner ever compares a price.",
        ],
        source:
          "ASIC Corporate Insolvency Update, Issue 40, June 2026; ASIC Insolvency Statistics Series 1, published 13 July 2026",
        takes: {
          owners:
            "Ask about licensing, insurance and current workload before you talk about price.",
          designers:
            "A builder's financial standing belongs in the recommendation, alongside their portfolio.",
          builders:
            "The trend is improving. Being able to show financial standing is becoming a competitive advantage.",
          brokers:
            "Builder due diligence protects the loan as much as the borrower.",
        },
      },
      {
        n: "03",
        kicker: "Method",
        headline: "Factory-built housing is no longer a",
        headlineAccent: "conference topic.",
        stat: {
          value: "20",
          label:
            "business days from slab to practical completion, Metricon prefab pilot",
          sub: "around 90% built off-site",
        },
        chart: {
          kind: "strip",
          title: "The prefabricated build sequence",
          desc: "Six stages from factory to completion. Factory manufacture and transport happen off-site; the pilot's 20 business days cover slab to practical completion on site.",
          stages: [
            { label: "Factory manufacture", accent: true },
            { label: "Transport", accent: true },
            { label: "Slab & site preparation" },
            { label: "Crane & install" },
            { label: "Services connection" },
            { label: "Practical completion" },
          ],
          callout: {
            from: 2,
            to: 5,
            label: "20 business days",
            sub: "slab to practical completion",
          },
          legend: { accent: "Off-site", context: "On site" },
        },
        body: [
          "Metricon has completed a prefabricated homes pilot with SIGNEX Group and Stockland at Mt Atkinson Estate in Truganina. Around 90% of each home was manufactured off-site, then transported and installed, with both homes moving from slab to practical completion in twenty business days.",
          "The number needs one qualification to be useful. Twenty business days covers slab to practical completion. It does not include planning, approvals, site preparation or the slab itself. The saving is real, and it sits in the construction phase rather than across the whole project.",
          "This is not an isolated experiment. New South Wales has legislated formal recognition of prefabricated buildings, funded a certification framework, and opened a program to expand local manufacturing capacity for modular housing. One clarification, because the term covers two different things: volumetric modular, whole room boxes built in a factory, suits repeatable designs such as estates, social housing and mid-rise apartments. Panelised prefabrication, wall and floor cassettes, frames and trusses, is already standard on many custom homes. The more repeatable the design, the larger the time saving.",
          "The part that matters for anyone comparing quotes is that prefabrication moves work rather than removing it. The payment schedule is front-loaded, inclusions sit in different places, site works may or may not be inside the number, and responsibility for defects is shared across more parties. Ask both builders to price the same scope boundaries, and [compare the tenders side by side](/#how) so what sits outside each number is visible. Most people compare totals. The difference is almost always in what sits outside the number.",
        ],
        source:
          "Metricon, with SIGNEX Group and Stockland; NSW Government Modern Methods of Construction Industry Expansion Program",
        takes: {
          owners:
            "Ask what the quoted timeline includes, and who is responsible if a module is damaged in transit.",
          designers:
            "Repeatable design elements convert into programme savings more directly than they used to.",
          builders:
            "The install, services, fit-out and warranty still sit with a builder of record. Prefabrication changes the sequence, not the accountability.",
          brokers:
            "Progress-payment structures built around on-site stages do not fit neatly when most of the value is manufactured off-site.",
        },
      },
    ],
    feature: {
      kicker: "The Feature",
      headline: "Australian construction does not have a building problem. It has a",
      headlineAccent: "procurement problem.",
      standfirst:
        "We published a Perspective this week arguing that the one stage of a residential project without a common standard is the stage that decides everything else. Here is the short version, and where it goes next.",
      paragraphs: [
        "Australia has standards for design, engineering, compliance, safety and construction. A builder cannot pour a slab, frame a wall or connect a service without meeting a defined benchmark. Procurement, the stage that governs the largest commitment an owner makes, has no equivalent. The argument is set out in full in [the Perspective](/build-brief/perspectives/construction-procurement-standard); what follows is the working version.",
        "The consequence is familiar to anyone who has run a tender. Builders present proposals in different formats, carry different allowances, make different assumptions, and disclose commercial terms in different ways. Owners and their architects end up comparing documents that were never designed to line up, rather than comparing the builders behind them.",
        "Two builders can quote the same project and mean entirely different things. The price looks comparable. The offer behind it rarely is.",
      ],
      sections: [
        {
          heading: "The proposal",
          paragraphs: [
            "The BuilderHQ Procurement Standard, or BPS, is a structured framework that standardises how procurement information is presented. It does not tell builders what to charge or how to build. Under BPS, a builder completes a structured submission covering the same ground, in the same order, every time.",
            "Eligibility and capability. Licensing, insurance and the capacity to take the project on, established before price enters the conversation.",
            "Commercial disclosures. The price, its basis, how long it holds and the terms that shape it, stated plainly rather than left to interpretation.",
            "Inclusions and exclusions. A clear schedule of what the price covers and what it does not, so scope gaps surface before contract rather than during construction.",
            "Allowances. Provisional sums and prime cost items itemised, so an owner can see how much of a price is firm and how much can still move.",
            "Programme. Start date, build duration and the commitments behind them, so ready in March is never confused with on site in March.",
            "Documentation and commentary. The builder's own context, recommendations and evidence, presented alongside the numbers rather than lost around them.",
          ],
        },
        {
          heading: "What it is not",
          paragraphs: [
            "BPS is not a replacement for HIA or Master Builders contracts, and it is not a new layer of regulation. It sits before contract execution, complementing the standards the industry already relies on by improving the quality and transparency of what is disclosed during procurement.",
            "A better-presented tender does not remove the need for professional judgement. It gives that judgement something consistent to work with.",
          ],
        },
        {
          heading: "The standard is already taking shape",
          paragraphs: [
            "This is not a framework waiting for software. BuilderHQ has built BPS into its own tender process: a structured submission that walks a builder through the same six disclosures, in the same order, before a tender can be sealed, and gives the owner and their architect a like-for-like evaluation on the other side. It is in final testing on the platform now, and the first structured tender rounds open soon. We will have more to say about that shortly.",
          ],
        },
        {
          heading: "Where it goes next",
          paragraphs: [
            "The proposed framework has been submitted to Master Builders Australia for consideration, and BuilderHQ is seeking input from the Housing Industry Association, state building authorities, lenders, insurers and consumer advocates.",
            "It is offered as the start of an industry conversation rather than a finished standard. Builders, architects, designers, lenders and insurers interested in shaping future versions are invited to [register their interest](mailto:info@builderhq.com.au?subject=BPS%20%C2%B7%20Register%20interest).",
            "Better information at the start of a project is the cheapest risk reduction available to anyone building a home.",
          ],
        },
      ],
      factBox: {
        title: "The standard at a glance",
        rows: [
          { k: "Six", v: "disclosures, eligibility to commentary" },
          { k: "Before contract", v: "complements HIA and Master Builders forms" },
          { k: "In practice", v: "built into BuilderHQ’s tender process" },
          {
            k: "With MBA",
            v: "submitted to Master Builders Australia for consideration",
          },
        ],
      },
      source:
        'BuilderHQ Perspective, "Australian construction doesn\'t have a building problem. It has a procurement problem.", 23 July 2026',
      takes: {
        owners:
          "Ask every builder to set out inclusions, exclusions and allowances in the same structure. The comparison gets easier immediately.",
        designers:
          "A consistent submission format makes a recommendation defensible rather than subjective.",
        builders:
          "Structured disclosure makes diligence visible. The builder who documents properly currently gets no credit for it.",
        brokers:
          "Consistent allowances and programme commitments make a construction facility easier to size correctly.",
      },
    },
    voices: {
      kicker: "Voices · From the Frontline",
      headline: "Costs are rising from a low base, and the base is broadening.",
      quote:
        "The annual growth rate of 2.8% remained below the 2.9% growth recorded in the March and June quarters of 2025",
      attribution: "John Bennett",
      role: "Cordell Costings Estimation Manager, Cotality",
      body: [
        "Bennett's point is the one most likely to be missed this week. The quarterly figure jumped fivefold, from 0.2% to 1.0%, which reads alarming in isolation. The annual rate tells the calmer story: cost growth is still running below where it sat a year ago, and the severe increases forecast after the disruption to Middle East shipping have not materialised at the scale predicted.",
        "What has changed is the composition. Pressure has moved out of headline materials and into freight, fuel levies, heavy plant, crane hire and logistics. Those costs are harder to see in a quote and harder to challenge after the fact.",
        "The June quarter inflation figure lands on Wednesday 29 July, and the Reserve Bank decides on 11 August. New dwelling costs carry the largest single weight in the CPI calculation, which is why this index is worth watching well beyond the building industry. If a build is on your horizon, [post your project](/signup?role=owner) while estimates are still ageing slowly.",
      ],
      source:
        "Cotality, reported by CommBank Newsroom, 22 July 2026; ABS release calendar; Reserve Bank of Australia",
    },
    partnerCorner: {
      partnerSlug: "bianca-dacic",
      headline: "Meet Bianca Dacic.",
      principal: "Bianca Dacic",
      principalRole: "Founder and director, Loan Savvy",
      portrait: "/partners/bianca-dacic/portrait.jpg",
      deck: "The Loan Savvy broker who gets first home buyers in, even without the deposit.",
      stats: [
        { value: "5.0", label: "93 Google reviews", star: true },
        { value: "2018", label: "Loan Savvy, her own brokerage" },
        { value: "10+ yrs", label: "in lending, software to broking" },
      ],
      why: "Bianca has quietly become one of the more trusted brokers in Melbourne's north west, and the proof is in the people who keep coming back: more than ninety Google reviews, every one of them five star. What they single out is that she gets them in. She is a specialist in buying with little or no deposit, guiding first home buyers through the part of lending most find daunting, with a patience that turns a stressful process into a manageable one. For an owner financing a build, especially one working hard to pull a deposit together, a broker this trusted, and this good at the hard part of getting finance approved, is exactly who we want beside them.",
      practice:
        "Loan Savvy is the Niddrie brokerage Bianca founded in 2018, after years on the industry's other side in mortgage software and broker training with firms such as Rubik and Temenos. The practice works across home, commercial, and car and asset lending, including construction loans and progress payments, and adds the practical coaching many brokers leave out: reading bank statements and credit reports, and helping clients set and reach a savings goal on the way to a purchase. Bianca is a credit representative (510930) of Mortgage Specialists Pty Ltd under Australian Credit Licence 387025.",
      welcome:
        "Featured from our Preferred Partner register. We are glad to put our name behind Bianca, and to introduce her to owners financing a build across Melbourne.",
    },
    faq: [
      {
        q: "How much did construction costs rise in the June 2026 quarter?",
        a: "The Cordell Construction Cost Index rose 1.0% nationally in the June quarter 2026, up from 0.2% in the March quarter. Annual growth lifted from 2.3% to 2.8%, still below the 2.9% recorded in the March and June quarters of 2025.",
      },
      {
        q: "Are construction insolvencies falling in Australia?",
        a: "Yes, for the first time in five years. 3,435 construction companies entered external administration in 2025-26, down from 3,596 the year before, a fall of 4.5%. Construction remains the largest single category of company failure, at 24.4% of appointments in the eleven months to 31 May 2026.",
      },
      {
        q: "How fast can a prefabricated home be built in Australia?",
        a: "A Melbourne pilot by Metricon, SIGNEX Group and Stockland took two homes from slab to practical completion in 20 business days, with around 90% of each home manufactured off-site. The figure excludes planning, approvals, site preparation and the slab itself.",
      },
      {
        q: "What is the BuilderHQ Procurement Standard (BPS)?",
        a: "BPS is a proposed framework that standardises how builders present tenders: eligibility, commercial disclosures, inclusions and exclusions, allowances, programme and commentary, in the same order every time. It sits before contract, complements HIA and Master Builders contracts, and has been submitted to Master Builders Australia for consideration.",
      },
    ],
    overToYou: {
      question:
        "What would you most like The Build Brief to help you understand?",
      body: "Reply with a line. The topics readers ask about most shape where we take future editions.",
    },
    share:
      "Forward The Build Brief to someone planning, designing, financing or building a home.",
    subscribeLine: "Five minutes, every Friday.",
    furtherReading: [
      {
        label: "Read the full Perspective on the procurement problem",
        href: "/build-brief/perspectives/construction-procurement-standard",
      },
      { label: "Read Issue 002", href: "/build-brief/issue-002" },
      { label: "Read Issue 001", href: "/build-brief/issue-001" },
    ],
    sourceGroups: [
      {
        heading: "Market Watch 01 · +1.0%",
        links: [
          {
            label:
              "Cotality, Cordell Construction Cost Index, June quarter 2026 (released 22 July 2026)",
            href: "https://www.cotality.com/au/resources/downloads/cordell-construction-cost-index-ccci",
          },
          {
            label:
              'CommBank Newsroom, "Home-building costs rise, but not as much as feared", 22 July 2026',
            href: "https://www.commbank.com.au/articles/newsroom/2026/July/home-building-costs-rise-but-not-as-much-as-feared.html",
          },
        ],
      },
      {
        heading: "Market Watch 02 · 24.4%",
        links: [
          {
            label: "ASIC Corporate Insolvency Update, Issue 40, June 2026",
            href: "https://www.asic.gov.au/about-asic/corporate-publications/newsletters/asic-corporate-insolvency-update/asic-corporate-insolvency-update-issue-40-june-2026/",
          },
          {
            label: "ASIC Insolvency Statistics, Series 1",
            href: "https://www.asic.gov.au/about-asic/corporate-publications/statistics/insolvency-statistics/",
          },
          {
            label:
              'The Good Builder, "Construction insolvencies just fell for the first time in five years", 13 July 2026',
            href: "https://thegoodbuilder.com.au/construction-insolvencies-just-fell-for-the-first-time-in-five-years/",
          },
        ],
      },
      {
        heading: "Market Watch 03 · 20 days",
        links: [
          {
            label:
              'The Urban Developer, "Slab to Home in 20 Days: Metricon\'s Mainstream Modular Materialises"',
            href: "https://www.theurbandeveloper.com/articles/metricon-modular-pilot-success-truganina-vic",
          },
          {
            label:
              'NSW Government, "Expressions of Interest open for the future of housing construction in NSW"',
            href: "https://www.nsw.gov.au/ministerial-releases/expressions-of-interest-open-for-future-of-housing-construction-nsw",
          },
          {
            label:
              'Built Offsite, "NSW seeks global manufacturing partners to expand modular housing production"',
            href: "https://builtoffsite.com.au/news/nsw-seeks-global-manufacturing-partners-to-expand-modular-housing-production/",
          },
        ],
      },
      {
        heading: "The Feature · BPS",
        links: [
          {
            label:
              'BuilderHQ Perspective, "Australian construction doesn\'t have a building problem. It has a procurement problem."',
            href: "https://builderhq.com.au/build-brief/perspectives/construction-procurement-standard",
          },
        ],
      },
      {
        heading: "Voices",
        links: [
          {
            label: "CommBank Newsroom, 22 July 2026 (as above)",
            href: "https://www.commbank.com.au/articles/newsroom/2026/July/home-building-costs-rise-but-not-as-much-as-feared.html",
          },
          {
            label: "ABS release calendar, July 2026",
            href: "https://www.abs.gov.au/release-calendar/future-releases-calendar/202607/rcc_economy",
          },
        ],
      },
    ],
    creditLine:
      "This edition used data and reporting from Cotality, the Australian Securities and Investments Commission, the Australian Bureau of Statistics, the Reserve Bank of Australia, Metricon, the New South Wales Government and CommBank Newsroom. The Build Brief is compiled by BuilderHQ, Melbourne.",
    sources: [
      "Cotality",
      "the Australian Securities and Investments Commission",
      "the Australian Bureau of Statistics",
      "the Reserve Bank of Australia",
      "Metricon",
      "the New South Wales Government",
      "CommBank Newsroom",
    ],
  },
  {
    slug: "issue-004",
    number: 4,
    date: "2026-07-31",
    displayDate: "Friday, 31 July 2026",
    title:
      "The average new house is declared at $517,430 before land, and Victoria resets its workmanship benchmark.",
    standfirst:
      "The average new Australian house was declared at $517,430 of building work at permit stage last financial year, before land. Inflation eased enough to take an August rate rise off the table. And from 1 August, Victoria’s revised Guide to Standards and Tolerances sets the benchmark for judging workmanship.",
    seoTitle:
      "The Build Brief 004: What a New House Costs Before It Is Built | BuilderHQ",
    seoDescription:
      "The average new Australian house was declared at $517,430 of building work at permit stage in 2025-26, up 5.0%, before land. Inflation eased to 3.8% and an August rate rise moved off the table. Victoria’s Guide to Standards and Tolerances 2026 edition applies from 1 August and is not retrospective. Plus the Productivity Commission on housing regulation.",
    keywords: [
      "cost to build a house australia 2026",
      "average build cost new house australia",
      "average house approval value australia",
      "how much does it cost to build a house in australia",
      "cpi june 2026 australia",
      "rba august 2026 rate decision",
      "trimmed mean inflation australia",
      "new dwelling prices australia",
      "guide to standards and tolerances 2026",
      "guide to standards and tolerances victoria",
      "building and plumbing commission victoria",
      "domestic building workmanship standards victoria",
      "building tolerances australia",
      "domestic building disputes victoria",
      "productivity commission housing supply regulation",
      "upzoning australia",
      "building approvals 2025-26",
      "housing approvals australia financial year",
      "builderhq procurement standard",
      "comparing builder quotes australia",
    ],
    // The generic masthead card until a bespoke Issue 004 card is
    // made; a missing file would break every social preview.
    ogImage: "/build-brief/og-issue-004.jpg",
    note: {
      eyebrow: "This week from the BuilderHQ team",
      heading:
        "The industry raised its own bar. A federal review asked government to lower theirs.",
      paragraphs: [
        "Three numbers this week. What a house costs to build, what money costs while you build it, and the benchmark your workmanship is now judged against.",
        "The average new house was declared at $517,430 of building work before land, up 5.0%. Inflation eased enough to take an August rate rise off the table. And Victoria's revised Guide to Standards and Tolerances applies from tomorrow.",
        "Set that beside Monday, when the Productivity Commission found that regulation has become a handbrake on new homes. One arm of the system settled how we judge work done well. Another said the rules on what can be built at all are slowing supply. Both are in here.",
      ],
      signoff: "The BuilderHQ Team",
    },
    signalsIntro: "Three signals. For everyone in the build.",
    signals: [
      {
        n: "01",
        kicker: "Cost Pulse",
        headline: "The average new house is declared at half a million dollars",
        headlineAccent: "before land.",
        stat: {
          value: "$517,430",
          label:
            "average declared build cost of a new private house, 2025-26",
          sub: "up 5.0% on the year",
        },
        chart: {
          kind: "bars",
          title: "Average declared build cost of a new private house",
          desc: "The average approval value for a new private house rose from $492,931 in 2024-25 to $517,430 in 2025-26, an increase of 5.0%. Both figures are declared building work at permit stage and exclude land.",
          valueHeading: "Average declared value",
          bars: [
            { label: "2024-25", value: 492931, display: "$492,931" },
            {
              label: "2025-26",
              value: 517430,
              display: "$517,430",
              accent: true,
            },
          ],
        },
        body: [
          "Across 2025-26 the average approval value for a new private house was $517,430, up 5.0% on last year's $492,931. June alone averaged $529,790.",
          "Know what it is. When a permit is issued the cost of the work is declared, and the ABS collects every one. Construction at the point of approval, excluding land. Not an index, not a forecast. Declared values sit low too, since variations and site costs land later, so the 5.0% movement is the truer signal.",
          "Wednesday's inflation data agrees from a different direction: new dwelling prices rose 5.8% over the year, up from 5.6%. Two independent measures, both near 5%, both edging up.",
        ],
        source:
          "ABS Building Approvals, Australia, June 2026 (released 30 July 2026); ABS Consumer Price Index, June 2026",
        takes: {
          owners:
            "Build cost, land and finance move separately. Ask which of the three your estimate actually covers, and [get a current estimate](/estimate_request_landing_page) before you commit to a budget.",
          designers:
            "Cost advice given at concept needs a review date attached. Five per cent a year compounds across a long documentation phase.",
          builders:
            "Two national measures now sit near 5%. Useful context when you explain a price movement to a client who last saw a figure in January.",
          brokers:
            "Construction cost assumptions set twelve months ago are roughly 5% light before anything site-specific is considered.",
        },
      },
      {
        n: "02",
        kicker: "Market Mood",
        headline: "The headline rate came down. The measure the Reserve Bank watches",
        headlineAccent: "did not.",
        stat: {
          value: "3.8%",
          label: "annual CPI inflation, 12 months to June 2026",
          sub: "trimmed mean held at 3.6%",
        },
        chart: {
          kind: "slope",
          title: "Annual inflation, headline against underlying",
          desc: "Headline CPI eased from 4.0% in the year to May to 3.8% in the year to June. The trimmed mean, the Reserve Bank's preferred measure of underlying inflation, held at 3.6% and stayed above the 2 to 3 per cent target band.",
          valueHeading: "Headline CPI",
          points: [
            { label: "Year to May", value: 4.0, display: "4.0%" },
            { label: "Year to June", value: 3.8, display: "3.8%", accent: true },
          ],
          second: {
            label: "Trimmed mean",
            points: [
              { label: "Year to May", value: 3.6, display: "3.6%" },
              { label: "Year to June", value: 3.6, display: "3.6%" },
            ],
          },
          band: { from: 2.0, to: 3.0, label: "RBA target band" },
          reference: { value: 3.0, display: "3.0%", label: "Top of target band" },
          domain: [1.6, 4.4],
        },
        body: [
          "Annual inflation eased to 3.8% in the year to June, from 4.0%. Fuel fell 10.9% as oil markets steadied. Markets cut the odds of an 11 August rise to near zero, Westpac moved to a hold, and all four majors now expect no change. The cash rate stays at 4.35%.",
          "The caution is the second line on the chart. The trimmed mean, the measure the Reserve Bank watches, held flat at 3.6% and stays above the target band. Housing was again the largest contributor at 6.8%, driven by electricity up 22.4% after rebates expired. A hold is welcome. It is not relief.",
        ],
        source:
          "ABS Consumer Price Index, Australia, June 2026 (released 29 July 2026); The Conversation; Canstar",
        takes: {
          owners:
            "Near-term rate risk has eased. Confirm how long your finance approval and your builder's price each hold, because the two rarely expire together.",
          designers:
            "Client confidence should improve into spring. Feasibility conversations get easier when the rate outlook is stable.",
          builders:
            "A hold is not a cut. Borrowing costs stay where they are, and so does the pressure on client budgets.",
          brokers:
            "Underlying inflation above the target band means the next move is still unsettled. Buffers keep earning their place.",
        },
      },
      {
        n: "03",
        kicker: "The Rulebook",
        headline: "Your finishes are judged from 1.5 metres away.",
        headlineAccent: "Now it is written down.",
        stat: {
          value: "1.5 m",
          label: "the distance a wall, ceiling or floor finish is assessed from",
          sub: "600 mm for fixtures · 3 m for glass",
        },
        rowsTitle: "What the Guide calls outside tolerance",
        rows: [
          { label: "Floor level, any room", value: "10 mm" },
          { label: "Floor level, any 2 m length", value: "4 mm", accent: true },
          { label: "Floor level, across the whole footprint", value: "20 mm" },
          { label: "Crack in a slab on ground", value: "2 mm wide" },
          { label: "Crack in a masonry wall", value: "5 mm wide" },
        ],
        chart: {
          kind: "strip",
          title: "Where the Guide sits, and what outranks it",
          desc: "Legislation, regulations, the National Construction Code and Australian Standards prescribe requirements and take precedence. The Guide is informative only.",
          stages: [
            { label: "Legislation and regulations" },
            { label: "National Construction Code" },
            { label: "Australian Standards" },
            { label: "The Guide", accent: true },
          ],
          callout: {
            from: 3,
            to: 3,
            label: "Informative only",
            sub: "Everything above it takes precedence",
          },
          legend: { accent: "Recognised benchmarks", context: "Prescribed requirements" },
        },
        body: [
          "Victoria's Building and Plumbing Commission has issued the 2026 edition of the Guide to Standards and Tolerances. It applies to contracts entered into and work commenced on or after 1 August 2026, and it is not retrospective. Earlier jobs stay on the previous edition.",
          "Two rules do most of the work. Finishes are assessed from a normal viewing position, 1.5 metres back in ordinary light, so a mark you have to hunt for is generally within tolerance. And tolerances never scale down: 4 mm over 2 metres means 4 mm over 1 metre and 4 mm over 500 mm, not a proportion of it.",
        ],
        source:
          "Building and Plumbing Commission, Guide to Standards and Tolerances 2026 (dated 14 July 2026, applies from 1 August 2026)",
        takes: {
          owners:
            "Before raising a concern, look at it from 1.5 metres in normal light. That is the test the Guide applies.",
          designers:
            "Where a finish needs to beat the recognised tolerance, the specification is the only place to say so.",
          builders:
            "A written benchmark cuts both ways. It is the standard a client is held to as much as you are.",
          brokers:
            "Workmanship disputes stall progress claims. A settled benchmark shortens the argument.",
        },
      },
    ],
    feature: {
      kicker: "The Feature",
      headline: "The deposit now takes eleven years. The rules are part of",
      headlineAccent: "the price.",
      standfirst:
        "The Productivity Commission released its interim report on housing supply regulation this week. Its finding is that regulation has become a handbrake on new homes. Submissions are open until the end of September.",
      paragraphs: [
        "The Productivity Commission's interim report landed Monday with a direct finding: regulation has become a handbrake on new housing supply.",
        "The framing deserves care. The Commission is not against regulation, and accepts rules are needed for safety, quality and liveability. Its argument is that too much of it stops homes being built. The context: a 20% deposit now takes about eleven years to save, up from eight in 2005.",
      ],
      sections: [
        {
          heading: "Four principles",
          paragraphs: [
            "The report proposes four principles for a better housing regulatory system: adopt a build mindset, regulate only where necessary, coordinate housing with infrastructure, and keep the process simple.",
          ],
        },
        {
          heading: "Where reform would do the most",
          paragraphs: [
            "**Land-use controls.** The single biggest lever the Commission examined. It raises broad-based upzoning: three-storey development on most residential land, smaller minimum lot sizes, more mixed use, and more mid-rise in well-serviced areas. Commissioner Alison Roberts put it plainly: the rules that stop someone adding a granny flat, or replacing a house with townhouses, sit at the core of the problem.",
            "**Infrastructure coordination.** Roads, utilities and sewerage usually come before homes, especially in greenfield areas. Where housing and infrastructure plans are not aligned, rezoned land can sit unused for years. The report wants infrastructure plans funded and sequenced alongside land release.",
            "**Approval processes.** Approvals cross multiple decision-makers, and poor coordination adds months or years. One developer told the Commission that approvals added more than three years to a 1,600 lot development in Melbourne's growth corridor. Proposed fixes: fast-track pathways, state-led assessment, coordination bodies that can resolve disputes.",
          ],
        },
        {
          heading: "What it is, and what it is not",
          paragraphs: [
            "This is an interim report. It makes no recommendations, sets out reform directions and asks for evidence. Submissions close 30 September 2026; the final report is due March 2027. The Housing Industry Association has welcomed it.",
            "Read it beside this week's other numbers. Approvals closed the year at 205,249 dwellings, up 9.2% and the highest since 2020-21. Master Builders still puts the country 47,750 homes short. Permission is at a five-year high and delivery is behind. The path from approval to completed home is where the years go.",
          ],
        },
      ],
      factBox: {
        title: "The figures",
        rows: [
          { k: "Years to save a 20% deposit", v: "About 11, from 8 in 2005" },
          { k: "Dwellings approved, 2025-26", v: "205,249, up 9.2%" },
          { k: "Shortfall against the Accord", v: "47,750 homes" },
          { k: "Approval delay, one Melbourne project", v: "More than 3 years" },
          { k: "Submissions close", v: "30 September 2026" },
          { k: "Final report due", v: "March 2027" },
        ],
      },
      pullQuote: "Land that has been rezoned for housing can sit unused for years.",
      source:
        "Productivity Commission, Housing supply regulation interim report (released 27 July 2026); ABS Building Approvals, June 2026; Master Builders Australia; Housing Industry Association",
      takes: {
        owners:
          "If you have been through a slow approval, the Commission is taking submissions until 30 September.",
        designers:
          "The upzoning directions point toward more medium-density work. Practices positioned for townhouses and mid-rise stand to benefit.",
        builders:
          "Nothing changes today. The final report lands in March 2027, and state governments decide what follows it.",
        brokers:
          "Approval delay is a funding cost. Three years added to a rezoned site is carried by someone.",
      },
    },
    bps: {
      kicker: "The BuilderHQ Procurement Standard",
      headline: "Cost is the part everyone talks about. Scope is where the money",
      headlineAccent: "quietly moves.",
      standfirst:
        "The Feature is about the years lost between approval and completion. This is about the weeks lost between drawings and a signed contract, and why three quotes for the same house are so hard to compare.",
      paragraphs: [
        "A national average cannot tell an owner whether the three quotes on their kitchen table describe the same house. Usually they do not. One carries an allowance for joinery, one prices it firm, one is silent. Each quote is honest. None is comparable, and the difference only surfaces later as a variation.",
        "That is not a failure of builders. It is a failure of format. Australian residential tendering has no common structure, so every builder invents one, and the person least equipped to reconcile them is the homeowner.",
        "We measured it. We ran real Australian document sets through our analysis, from one architectural set to twelve documents deep, then checked what they actually settle. The pattern held regardless of thickness. In every package the same areas were left open: site preliminaries, painting, landscaping, services connections. Ordinary trades on every job. That is the gap a builder fills with judgement, and judgement is what an owner cannot compare.",
      ],
      principles: [
        {
          n: "01",
          title: "One scope, read from the documents",
          body: "The documents are read against a fixed schedule of the work a home requires. Every line is either evidenced, with the page it came from, or recorded as a gap. Nothing is assumed.",
        },
        {
          n: "02",
          title: "The gaps are settled before pricing, not after",
          body: "Where the documents are silent, the question is asked once, of the client, before the round opens. Every builder then carries the same figure. Otherwise each guesses privately and the difference appears later as a variation.",
        },
        {
          n: "03",
          title: "Every tender answers the same lines",
          body: "For each line a builder states one of four things: included as documented, carried as an allowance at a stated figure, excluded, or not applicable. A quote stops being a document to interpret.",
        },
        {
          n: "04",
          title: "The comparison shows its working",
          body: "Where builders disagree on a line, it is visible rather than buried. Every figure carries the disclosure it came from, so an owner can defend it and a builder is never ambushed by it.",
        },
      ],
      definition: {
        heading: "What the Standard is",
        paragraphs: [
          "A common format for residential tendering: one scope read from the project's own documents, one set of questions every builder answers, one comparison that shows its working.",
          "Fair in both directions. A builder who prices carefully should not lose to a cheaper quote that is quieter about what it leaves out. An owner should not need to be a quantity surveyor to see the difference.",
          "Being built now, tested against real Australian project documents. Not yet released. [Our Perspective on procurement](/build-brief/perspectives/construction-procurement-standard) sets out the argument in full.",
        ],
      },
      pullQuote:
        "A national average cannot tell an owner whether three quotes describe the same house.",
      takes: {
        owners:
          "When you next receive quotes, put them side by side and look for the lines that appear in one and not the others. That difference is usually the whole story.",
        designers:
          "A documented allowance is worth more than a silent assumption. Where a schedule cannot be finalised, naming the gap is more useful to the tender than leaving it out.",
        builders:
          "A common format protects careful pricing. When every tender answers the same lines, a well-disclosed quote stops being punished for the things it was honest about.",
        brokers:
          "Scope certainty at contract signing is the best predictor of whether a facility draws down to plan.",
      },
    },
    partnerCorner: {
      partnerSlug: "de-lune-construction",
      headline:
        "Meet Fletcher Thompson and de Lune Construction, where the drawing is protected all the way to handover.",
      deck: "Construction as the continuation of architecture.",
      principal: "Fletcher Thompson",
      principalRole: "Founder and Director",
      portrait: "/build-brief/issue-004/fletcher-thompson.jpg",
      portraitCaption: "Fletcher Thompson, Founder and Director",
      showLogo: true,
      stats: [
        { value: "5.0", label: "Google rating", star: true },
        { value: "15 yrs", label: "Complex architectural builds" },
        { value: "Dual", label: "Residential and commercial registration" },
      ],
      why: "Fletcher Thompson sits between two worlds, and that is why we introduce him. A degree in architecture on one side, registration as both a residential and commercial builder on the other. His practice runs on the belief that construction is the continuation of architecture, with fifteen years behind it. For an owner taking on an architecturally ambitious home, this is a builder who speaks the architect's language fluently and builds it faithfully.",
      practice:
        "A Hawthorn building company specialising in complex architectural builds across Melbourne, working with clients, architects and consultants from concept to completion. Its portfolio spans the Malvern and Nicholson residences alongside commercial work including Programa HQ and Curve Cycling Melbourne.",
      welcome:
        "A builder who reads drawings the way an architect wrote them is exactly the practice this platform exists to put in front of the right projects.",
    },
    faq: [
      {
        q: "How much does it cost to build a house in Australia in 2026?",
        a: "Across the 2025-26 financial year the average approval value for a new private house in Australia was $517,430, up 5.0% on the $492,931 average in 2024-25. The June 2026 figure alone was $529,790. This is the cost of building work declared when a building permit is issued and it excludes land. Declared values at permit stage tend to sit low, because variations, upgrades and site costs land later, so the real average is almost certainly higher.",
      },
      {
        q: "Did Australian inflation fall in June 2026?",
        a: "Yes. Annual CPI inflation eased to 3.8% in the twelve months to June 2026, down from 4.0% in the year to May, and the CPI fell 0.1% in the month itself. The trimmed mean, the Reserve Bank's preferred measure of underlying inflation, held at 3.6% and remains above the 2 to 3 per cent target band.",
      },
      {
        q: "Will the RBA raise rates in August 2026?",
        a: "Financial markets cut the probability of a rise at the 10 to 11 August 2026 meeting to close to zero after the June quarter inflation figures, and all four major banks expect no change. The cash rate stands at 4.35%. Underlying inflation above the target band means the direction of the next move is still unsettled.",
      },
      {
        q: "When does the Guide to Standards and Tolerances 2026 edition apply?",
        a: "The 2026 edition applies to contracts entered into and building work commenced on or after 1 August 2026. It does not apply retrospectively, so contracts entered into or work commenced before that date continue under the previous edition. An Applicability of the Guide section within the document sets out when this edition applies.",
      },
      {
        q: "Is the Guide to Standards and Tolerances legislation?",
        a: "No. The Guide is a reference tool and is neither legislation nor technical advice. Where legislation, regulations, the National Construction Code or Australian Standards prescribe specific requirements, those requirements take precedence. The Guide provides recognised benchmarks for assessing the quality of domestic building work and should be considered together with the circumstances of the work, the contract documents and any applicable legislative requirements. Victoria's Building and Plumbing Commission uses it as a recognised reference when responding to enquiries and supporting the resolution of domestic building disputes.",
      },
      {
        q: "What did the Productivity Commission say about housing regulation?",
        a: "In its interim report released on 27 July 2026, the Productivity Commission found that regulation has become a handbrake on new housing supply. It accepts that rules are necessary for safety, quality and liveability, but argues that too much or poorly designed regulation slows and narrows housing. It identifies land-use controls as the reform with the greatest potential effect on supply. The report is an interim report and makes no recommendations. Submissions close on 30 September 2026 and the final report is due in March 2027.",
      },
      {
        q: "How many homes were approved in Australia in 2025-26?",
        a: "205,249 dwellings were approved across the 2025-26 financial year, up 9.2% and the highest total since 2020-21, with multi-unit approvals at their strongest level since 2017-18. On Master Builders Australia's assessment, the country still finished 47,750 homes short of what was needed, a second consecutive year behind the National Housing Accord pace.",
      },
      {
        q: "Why are builder quotes so hard to compare?",
        a: "Because there is no common format. One quote may carry an allowance for an item, another may price it firm, and a third may be silent on it, so three honest quotes can describe three different scopes of work. When BuilderHQ tested real Australian project document sets, the same areas were left unsettled in every package regardless of how many documents the project had: site preliminaries, painting, landscaping and the connection of services. Those are the gaps each builder fills with private judgement, and they are the differences an owner cannot see until they surface later as a variation.",
      },
    ],
    overToYou: {
      question: "What would you most like The Build Brief to help you understand?",
      body: "Reply with a line. The topics readers ask about most shape where we take future editions.",
    },
    share:
      "The average new Australian house was declared at $517,430 before land last financial year, and Victoria’s revised workmanship benchmark applies from 1 August. This week's Build Brief.",
    subscribeLine: "Five minutes, every Friday.",
    sourceGroups: [
      {
        heading: "Build cost and approvals",
        links: [
          {
            label: "ABS, Building Approvals, Australia, June 2026",
            href: "https://www.abs.gov.au/statistics/industry/building-and-construction/building-approvals-australia/latest-release",
          },
          {
            label: "ABS media release, Dwelling approvals rise in June",
            href: "https://www.abs.gov.au/media-centre/media-releases/dwelling-approvals-rise-june-0",
          },
        ],
      },
      {
        heading: "Inflation and rates",
        links: [
          {
            label: "ABS, Consumer Price Index, Australia, June 2026",
            href: "https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release",
          },
          {
            label: "ABS media release, CPI rose 3.8% in the year to June 2026",
            href: "https://www.abs.gov.au/media-centre/media-releases/cpi-rose-38-year-june-2026",
          },
          {
            label:
              "The Conversation, Australian inflation has eased a little, an August interest rate rise now looks unlikely",
            href: "https://theconversation.com/australian-inflation-has-eased-a-little-an-august-interest-rate-rise-now-looks-unlikely-288399",
          },
          {
            label: "Canstar, Will inflation dip be enough to stop an RBA hike?",
            href: "https://www.canstar.com.au/news/will-inflation-dip-be-enough-to-stop-rba-hike/",
          },
        ],
      },
      {
        heading: "Workmanship standards",
        links: [
          {
            label:
              "Building and Plumbing Commission, Guide to Standards and Tolerances 2026",
            href: "https://www.bpc.vic.gov.au/resource-hub/guides/guide-to-standards-and-tolerances-2026",
          },
          {
            label: "Building and Plumbing Commission, the previous edition",
            href: "https://www.bpc.vic.gov.au/resource-hub/guides/guide-to-standards-and-tolerances-2015-under-review-2024",
          },
        ],
      },
      {
        heading: "Housing supply regulation",
        links: [
          {
            label: "Productivity Commission, Housing supply regulation interim report",
            href: "https://www.pc.gov.au/inquiries-and-research/housing-supply/interim/",
          },
          {
            label: "Make a submission, closes 30 September 2026",
            href: "https://www.pc.gov.au/inquiries-and-research/housing-supply/make-submission/",
          },
          {
            label: "HIA, Productivity Commission push for bold housing reform",
            href: "https://hia.com.au/our-industry/newsroom/planning-and-environment/2026/07/productivity-commission-push-for-bold-housing-reform",
          },
        ],
      },
    ],
    creditLine:
      "This edition used data and reporting from the Australian Bureau of Statistics, the Productivity Commission, Victoria's Building and Plumbing Commission, Master Builders Australia and the Housing Industry Association. The Build Brief is compiled by BuilderHQ, Melbourne.",
    sources: [
      "the Australian Bureau of Statistics",
      "the Productivity Commission",
      "the Building and Plumbing Commission",
      "Master Builders Australia",
      "the Housing Industry Association",
    ],
  },
  {
    slug: "issue-006",
    number: 6,
    date: "2026-08-14",
    displayDate: "Friday, 14 August 2026",
    title:
      "Almost 70% of apartments approved since 2020 have never started, and Victoria rewrote the building contract.",
    standfirst:
      "A Reuters analysis found almost 70% of apartments approved across Australia since 2020 have never started construction. The Reserve Bank held the cash rate and forecast home building to shrink. Sydney has a 20 year plan built on feasible capacity. And Victoria's new building contract rules start 1 December.",
    seoTitle:
      "The Build Brief 006: 62% of Melbourne Apartments Never Started | BuilderHQ",
    seoDescription:
      "Almost two thirds of Melbourne apartments approved since 2020 have never broken ground. The Reserve Bank held rates but expects home building to shrink. And Sydney has a new 20 year plan.",
    keywords: [
      "apartment approvals not started australia",
      "how long to build an apartment australia",
      "rba august 2026 hold",
      "dwelling investment forecast",
      "sydney plan 800000 homes",
      "domestic building contracts amendment act victoria",
      "stalled apartment projects melbourne",
      "feasible housing capacity",
      "building contract changes december 2026",
      "victoria progress payments",
      "the build brief podcast",
      "apartment build time 33 months",
      "national housing accord progress",
      "developer contracts victoria",
      "building contract variations process",
      "residential construction news australia",
    ],
    ogImage: "/build-brief/og-issue-006.jpg",
    note: {
      eyebrow: "This week from the BuilderHQ team",
      heading: "Approved is not the same as built. This week we found out by how much.",
      paragraphs: [
        "A Reuters analysis on Wednesday put a number on something the industry has felt for years. Almost 70% of apartments approved across Australia since 2020 have never started construction. In Melbourne it is 62%.",
        "Not cancelled. Not refused. Approved, and then nothing.",
        "The same analysis found an apartment now takes 33 months to build, up from 21 a decade ago. A house takes 11.5 months, up from 8.6.",
        "On Tuesday the Reserve Bank held the cash rate at 4.35%. It also published new forecasts showing home building going backwards over the next two years. The Board discussed raising rates. It did not discuss cutting them.",
        "Then on Thursday, New South Wales released a 20 year plan for Sydney with one idea worth borrowing. Councils will have to keep 30 years of housing capacity that is feasible, not just zoned. Given how many approved projects never get built, that word is doing a lot of work.",
        "One thread runs through all three. Getting a project approved is no longer the hard part. [Last week's edition](/build-brief/issue-005) counted the projects lost between signature and slab. This week is about the ones lost before anyone signs at all.",
      ],
      signoff: "The BuilderHQ Team",
    },
    signalsIntro: "Three signals. For everyone in the build.",
    signals: [
      {
        n: "01",
        kicker: "The Number",
        headline: "Almost two thirds of Melbourne's approved apartments have never",
        headlineAccent: "broken ground.",
        stat: {
          value: "62%",
          label: "Melbourne apartments approved since 2020 that have not started construction",
          sub: "national figure close to 70%",
        },
        chart: {
          kind: "bars",
          title: "Approved since 2020, never started",
          desc: "The share of apartments approved since 2020 that have not started construction: Gold Coast 83%, Sydney 64%, Melbourne 62%. The national figure is close to 70%.",
          valueHeading: "Share not started",
          max: 100,
          bars: [
            { label: "Gold Coast", value: 83, display: "83%" },
            { label: "Sydney", value: 64, display: "64%" },
            { label: "Melbourne", value: 62, display: "62%", accent: true },
          ],
        },
        body: [
          "Reuters published an analysis on Wednesday using data from consultancy Urbis. It found that almost 70% of apartments approved across Australia since 2020 have never started construction. The Gold Coast is worst at 83%, then Sydney at 64% and Melbourne at 62%.",
          "Urbis housing sector lead Mark Dawson puts it down to feasibility. Higher costs for materials, labour and finance have made a lot of approved projects unviable to start.",
          "Build times have stretched too. Master Builders Australia says an apartment now takes 33 months to finish, up from 21 months a decade ago. A house takes 11.5 months, up from 8.6.",
          "Two years into the National Housing Accord, completions are running 27% below the roughly 60,000 homes a quarter needed to hit the target. The Housing Industry Association expects Australia to finish about 15% short by 2029.",
          "The pattern is the same everywhere. Approval is the easy part now. The distance between a permit and a finished home is where the target is being lost. That distance is also where cost certainty matters most, which is why we built a way to [get a preliminary estimate](/estimate_request_landing_page) before the planning money is spent, and to [compare tenders side by side](/) when it is time to build.",
        ],
        source:
          "Reuters, 12 August 2026, using data from Urbis, Master Builders Australia and the Housing Industry Association",
        weekend: "A permit is permission. It is not a home.",
        takes: {
          owners:
            "Cost is what stops projects, not approval. Test the build cost before you spend on the planning path.",
          designers:
            "A scheme that cannot be built does not get past documentation. Early cost input protects the project.",
          builders:
            "A long approvals pipeline is not a live pipeline. Check a project is funded and ready before you hold capacity for it.",
          brokers:
            "Longer builds mean longer facilities. A 33 month apartment carries interest a 21 month one did not.",
        },
      },
      {
        n: "02",
        kicker: "Market Mood",
        headline: "Rates held. The Bank's own forecast has home building",
        headlineAccent: "going backwards.",
        stat: {
          value: "4.35%",
          label: "cash rate, held for a second meeting in a row",
          sub: "dwelling investment forecast to turn negative by late 2027",
        },
        chart: {
          kind: "diverging",
          title: "The Bank's own home building forecast",
          desc: "The Reserve Bank forecasts dwelling investment growth of 3.6% in June 2026, minus 0.7% by December 2027 and minus 0.8% by June 2028.",
          valueHeading: "Dwelling investment growth forecast",
          zeroLabel: "no growth",
          bars: [
            { label: "June 2026", value: 3.6, display: "+3.6%", accent: true },
            { label: "December 2027", value: -0.7, display: "-0.7%" },
            { label: "June 2028", value: -0.8, display: "-0.8%" },
          ],
          footnote:
            "Reserve Bank forecast, August 2026 Statement on Monetary Policy.",
        },
        body: [
          "The Reserve Bank held the cash rate at 4.35% on Tuesday. The decision was unanimous and everyone expected it. The forecasts released with it are the part worth reading.",
          "The Bank expects dwelling investment growth to fall from 3.6% in June 2026 to minus 0.7% by December 2027 and minus 0.8% by June 2028. That is the Reserve Bank forecasting that home building will shrink.",
          "Governor Michele Bullock also explained why. When prices for established homes fall while build costs stay high, building something new stops stacking up. That is the same problem behind the number in our first signal.",
          "At the press conference Bullock confirmed the Board discussed raising rates at this meeting, having not discussed it at the last one. A cut was not on the table. The arguments for a rise were that inflation is still too high, and that a longer Middle East conflict raises the risk of businesses building cost increases into their prices.",
          "The Bank does not expect inflation back near the middle of its target band until late 2027. The next decision is in late September.",
        ],
        source:
          "Reserve Bank of Australia, Monetary Policy Decision and Statement on Monetary Policy, 11 August 2026; Governor's media conference, 11 August 2026",
        weekend: "A hold is not relief. It is a pause with the door open.",
        takes: {
          owners:
            "Borrowing costs stay where they are for now. The Bank has not ruled out another rise.",
          designers:
            "Clients who paused on rate uncertainty may come back. The projects that stalled on cost will not.",
          builders:
            "Price validity periods still matter. The Board discussed a rise this month.",
          brokers:
            "The Bank's own horizon for inflation near target is late 2027. Test facilities against that, not against a cut.",
        },
      },
      {
        n: "03",
        kicker: "The Plan",
        headline: "Sydney's new plan asks councils for capacity that is",
        headlineAccent: "feasible, not just zoned.",
        stat: {
          value: "30",
          label: "years of feasible housing capacity councils must hold in their planning controls",
          sub: "800,000 homes needed by 2046",
        },
        chart: {
          kind: "compare",
          title: "Zoned capacity and feasible capacity are different tests",
          desc: "Zoned capacity counts what planning rules allow and ignores build cost, finance and viability, producing approvals that never start. Feasible capacity counts what the market can deliver, and is the test New South Wales is now applying.",
          rowLabels: ["What it counts", "What it ignores", "Result"],
          left: {
            heading: "Zoned capacity",
            cells: [
              "What planning rules allow",
              "Build cost, finance, viability",
              "Approvals that never start",
            ],
          },
          right: {
            heading: "Feasible capacity",
            cells: [
              "What the market can deliver",
              "Nothing on that list",
              "The test NSW is now applying",
            ],
          },
        },
        body: [
          "New South Wales finalised its 20 year Sydney Plan on Thursday. Sydney grows from 5.3 million people to 6.6 million by 2046, which means at least 800,000 more homes and 950,000 more jobs. Housing goes east, close to jobs and transport. Jobs go west, around the new airport and the Aerotropolis.",
          "One part is worth borrowing regardless of which state you build in. Councils will have to keep at least 30 years of feasible housing capacity in their planning controls at any time, as a rolling obligation.",
          "The word feasible is the point. The stated aim is to move away from planning for just enough capacity and toward capacity that matches what the market can actually deliver. Zoning land for housing is not the same as land where housing is worth building.",
          "Read that beside [our first signal](#market-watch). Australia does not have a shortage of approved apartments. It has a shortage of approved apartments anyone can afford to start. A capacity test that includes feasibility is at least aimed at the right problem.",
          "Whether it works is a separate question, and one for 2046 rather than this year. But it is the first plan we have seen that measures capacity by whether a project stacks up, rather than by whether it is allowed.",
        ],
        source:
          "NSW Government, The Sydney Plan, 13 August 2026; NSW Department of Planning, Feasible Housing Capacity Policy",
        weekend: "Zoned is not the same as worth building.",
        takes: {
          owners:
            "A site being zoned for something does not mean the numbers work. Run the feasibility first.",
          designers:
            "Capacity policy is starting to account for cost. Buildability is becoming a planning question, not just a design one.",
          builders:
            "More land held ready means less waiting on rezoning when demand returns.",
          brokers:
            "A longer pipeline of ready land makes development lending easier to plan around.",
        },
      },
    ],
    feature: {
      kicker: "The Feature",
      headline: "Victoria rewrote the building contract. It starts",
      headlineAccent: "1 December.",
      standfirst:
        "The Domestic Building Contracts Amendment Act changes deposits, progress payments, variations and who the Act applies to. It only binds contracts signed after it starts, which makes the next three months the window to get ready.",
      paragraphs: [
        "Victoria's building reforms have come in three waves. First resort Home Warranty and ten year rectification orders started on 1 July. The Building and Plumbing Administration and Enforcement Act was assented in May, though it does not commence until proclamation and no later than 1 December 2027. The third wave changes the paperwork on every job. [The reforms we covered in July](/build-brief/issue-002) were about who regulates the industry. This one is about the contract itself.",
        "The Domestic Building Contracts Amendment Act starts on 1 December 2026 unless it is proclaimed earlier. It applies only to contracts signed after that date, so existing contracts carry on under the current rules. Industry reaction to this package has been warmer than to the first one.",
      ],
      sections: [
        {
          heading: "A new category for developer contracts",
          paragraphs: [
            "The Act adds a definition of \"developer\". It means someone who contracts for building work on two or more homes intended for sale.",
            "When a builder contracts with a developer rather than a homeowner, only part of the Act applies. The list of things a contract must contain drops from 21 items to four. Several consumer protections fall away, including deposit limits and the restrictions on cost plus contracts and cost escalation clauses. Implied warranties, registration requirements and the duty to get foundations information all stay.",
            "The reasoning is that a developer building homes to sell is a commercial party and does not need protections designed for someone building a home to live in. The practical effect is that two contracts for identical work will sit under different rules depending on who signs.",
          ],
        },
        {
          heading: "One process for variations",
          paragraphs: [
            "The Act replaces the current split between builder variations and owner variations with a single process for changes to plans and specifications.",
            "This is the change most likely to cut disputes. The current split is a common source of argument about who owed whom notice. One process, applied the same way every time, is worth building into your templates now rather than in November. It is also the logic behind [our Perspective on procurement](/build-brief/perspectives/construction-procurement-standard): one process, applied the same way every time, is what makes work comparable.",
          ],
        },
        {
          heading: "Deposits and progress payments move to regulations",
          paragraphs: [
            "Limits on deposits and progress payments come out of the Act and into regulations, so they can be updated without going back to Parliament. Progress payment stages and limits will be set by regulation.",
            "One provision matters for anyone watching offsite construction. Progress payment limits will be able to change where part of the work uses a modern method of construction, such as modular or prefabrication. That answers the mismatch we wrote about in [Issue 003](/build-brief/issue-003), where most of a prefabricated home is built before it reaches the site while payment schedules still assume on-site stages.",
          ],
        },
        {
          heading: "What has not changed",
          paragraphs: [
            "An owner can still end the contract if the price rises 15% or more, or if the build time blows out by 50% or more. Increases from prime cost items, provisional sums and owner requested variations do not count toward those thresholds.",
          ],
        },
        {
          heading: "A note for design practices",
          paragraphs: [
            "Under the amendments, preparing plans and specifications is excluded from the definition of domestic building work for the purposes of the Act. Where an architect or building designer does that work, it sits outside the Act.",
            "For everyone contracting in Victoria after 1 December, the steps are the same. Review your contract templates, your variation process and your progress claim schedule, and check which set of rules your next job falls under. The [HIA's explainer on the changes](https://hia.com.au/resources-and-advice/dealing-with-contracts/key-changes-to-domestic-building-contracts-explained) and [Planning Victoria's building reform page](https://www.planning.vic.gov.au/guides-and-resources/building-policy/building-reform) are the places to start.",
          ],
        },
      ],
      factBox: {
        title: "The dates",
        rows: [
          { k: "Act starts", v: "1 December 2026, unless proclaimed earlier" },
          { k: "Applies to", v: "Contracts signed after it starts" },
          { k: "Developer contracts", v: "Required contents drop from 21 items to 4" },
          { k: "Variations", v: "One process replaces the builder and owner split" },
          { k: "Deposits and progress payments", v: "Limits move into regulations" },
          { k: "Owner termination rights", v: "Unchanged at +15% price or +50% time" },
        ],
      },
      pullQuote:
        "Two contracts for identical work will sit under different rules depending on who signs.",
      source:
        "Domestic Building Contracts Amendment Act; analysis by Norton Rose Fulbright, HIA, the Architects Registration Board of Victoria and Planning Victoria. General information only, correct at the date of publication. Get advice for your own situation.",
      takes: {
        owners:
          "If you sign after 1 December you sign under the new rules. Check which category your contract falls into.",
        designers:
          "Preparing plans and specifications sits outside the Act's definition of building work. Worth understanding what that means for your engagement.",
        builders:
          "Templates, variation processes and progress claims all need a review before December.",
        brokers:
          "Progress payment rules move into regulation and will flex for offsite construction. Drawdown schedules should follow.",
      },
    },
    podcast: {
      kicker: "Coming soon",
      headline: "The Build Brief is becoming a",
      headlineAccent: "podcast.",
      standfirst:
        "Conversations shaping residential construction. The first episode lands in the coming weeks.",
      image: {
        src: "/build-brief/issue-006/podcast-recording.webp",
        alt: "Recording the first episode of The Build Brief podcast.",
      },
      paragraphs: [
        "We have started recording. The Build Brief podcast is the next part of this publication, and it does what the written editions do: takes one part of residential construction and looks at it properly.",
        "Episode one is with **Dominic Bagnato**. He is a registered architect, a licensed builder and a property developer, which is a combination almost nobody has, and he has spent more than 30 years in the industry. He co-founded Bagnato Architects in Melbourne in 2007. To 64,000 people online he is [The Invisible Architect](https://www.instagram.com/theinvisiblearchitect/), where he teaches buyers, investors and developers how to find value in property.",
        "Most of the conversation is about pricing. Why three builders can price the same house and come back hundreds of thousands of dollars apart. Whether the cheapest quote is ever the cheapest job. What usually turns into a variation later. And whether the current process rewards the builder who reads every document, or the one who stays vague.",
        "Dominic has sat in all three seats, so he can answer those questions from the architect's side, the builder's side and the developer's side. That is the reason we asked him first.",
        "The episode drops in the coming weeks. Subscribers to The Build Brief will hear about it first.",
      ],
      cta: {
        label: "Get it when it lands",
        href: "mailto:info@builderhq.com.au?subject=Subscribe%20to%20The%20Build%20Brief",
      },
    },
    partnerCorner: {
      partnerSlug: "quorum-studios",
      headline:
        "Meet Quorum Studios, the Brisbane practice that stays from first sketch to final site visit.",
      principal: "Manny and Vanessa Pedro",
      principalRole: "Founders, Quorum Studios",
      showLogo: true,
      logo: "/partners/quorum-studios/logo.png",
      deck: "Design that stays with the build.",
      stats: [
        { value: "5.0", label: "Google rating, 18 reviews", star: true },
        { value: "2023", label: "Studio founded in Brisbane" },
        { value: "6279", label: "Board of Architects Queensland registration" },
      ],
      why: "This edition is about the distance between approval and a finished home, and that distance is where a design practice earns its keep. Quorum Studios works the way that problem needs. Manny Pedro is a registered architect who leads the design; Vanessa Pedro directs the business and brings the interiors eye that runs alongside it. Every project opens with a single question about how a client wants to live, and the studio stays with it from the first sketch to the final site visit rather than stepping away once documentation is issued.",
      practice:
        "A Brisbane architecture studio founded in 2023, working on residential projects from luxury new homes through to traditional character dwellings. Beside its bespoke commissions it offers a range of pre-designed house plans, which puts the same thinking within reach at a lower entry point. Recent work includes a home at Coorparoo, the Villa Palma residence and a pavilion on the Gold Coast.",
      welcome:
        "In a week where feasibility is the whole story, a practice that stays with a project all the way to site is exactly who this platform exists to put in front of owners early.",
    },
    overToYou: {
      question: "What would you most like The Build Brief to help you understand?",
      body: "Reply with a line. The topics readers ask about most shape where we take future editions.",
    },
    faq: [
      {
        q: "How many approved apartments in Australia have never started construction?",
        a: "A Reuters analysis published on 12 August 2026, using data from consultancy Urbis, found almost 70% of apartments approved across Australia since 2020 have never started construction. The Gold Coast is highest at 83%, then Sydney at 64% and Melbourne at 62%. The figures cover apartments approved since 2020, not all dwellings.",
      },
      {
        q: "Why do approved apartment projects not get built?",
        a: "Urbis housing sector lead Mark Dawson attributes it to feasibility. Higher costs for materials, labour and finance have made many approved projects unviable to start. The approval is granted, but the numbers no longer stack up by the time construction would begin.",
      },
      {
        q: "How long does it take to build an apartment in Australia?",
        a: "Master Builders Australia says an apartment now takes 33 months to finish, up from 21 months a decade ago. A house takes 11.5 months, up from 8.6 months over the same period.",
      },
      {
        q: "Is Australia on track for the National Housing Accord target?",
        a: "Two years in, completions are running 27% below the roughly 60,000 homes a quarter needed to hit the target. The Housing Industry Association expects Australia to finish about 15% short by 2029.",
      },
      {
        q: "What did the Reserve Bank decide in August 2026?",
        a: "The Board held the cash rate at 4.35% on 11 August 2026, the second hold in a row, and the decision was unanimous. Governor Michele Bullock confirmed the Board discussed raising rates at this meeting and did not discuss a cut. The Bank does not expect inflation back near the middle of its target band until late 2027. The next decision is in late September.",
      },
      {
        q: "What is the Reserve Bank's forecast for home building?",
        a: "The August 2026 Statement on Monetary Policy forecasts dwelling investment growth falling from 3.6% in June 2026 to minus 0.7% by December 2027 and minus 0.8% by June 2028. That is the Reserve Bank forecasting that home building will shrink over the next two years.",
      },
      {
        q: "What is the Sydney Plan?",
        a: "New South Wales finalised its 20 year Sydney Plan on 13 August 2026. It plans for Sydney growing from 5.3 million people to 6.6 million by 2046, which means at least 800,000 more homes and 950,000 more jobs, with housing concentrated east close to jobs and transport, and jobs growing west around the new airport and the Aerotropolis.",
      },
      {
        q: "What is feasible housing capacity?",
        a: "Under the Sydney Plan, councils with a five year housing target will have to keep at least 30 years of housing capacity in their planning controls that is feasible, not just zoned, as a rolling obligation. The aim is to count capacity by what the market can actually deliver rather than what planning rules allow. It is a New South Wales policy and does not apply in other states.",
      },
      {
        q: "When do Victoria's new building contract rules start?",
        a: "The Domestic Building Contracts Amendment Act starts on 1 December 2026 unless it is proclaimed earlier. It applies only to contracts signed after it starts, so existing contracts carry on under the current rules.",
      },
      {
        q: "What counts as a developer under Victoria's new building contract rules?",
        a: "The Act defines a developer as someone who contracts for building work on two or more homes intended for sale. When a builder contracts with a developer rather than a homeowner, only part of the Act applies: the required contract contents drop from 21 items to four, and several consumer protections fall away, including deposit limits and restrictions on cost plus contracts. Implied warranties, registration requirements and the duty to get foundations information all stay.",
      },
      {
        q: "How do variations change under the Victorian amendments?",
        a: "The Act replaces the current split between builder variations and owner variations with a single process for changes to plans and specifications, applied the same way every time. The current split is a common source of disputes about who owed whom notice.",
      },
      {
        q: "Can an owner still end a building contract if the price rises?",
        a: "Yes. An owner can still end the contract if the price rises 15% or more, or if the build time blows out by 50% or more. Increases from prime cost items, provisional sums and owner requested variations do not count toward those thresholds.",
      },
      {
        q: "Who is the first guest on The Build Brief podcast?",
        a: "Dominic Bagnato, a registered architect, licensed builder and property developer with more than 30 years in the industry. He co-founded Bagnato Architects in Melbourne in 2007, and online he is The Invisible Architect, with an audience of 64,000. The first episode is about pricing: why three builders can price the same house and come back far apart, and whether the cheapest quote is ever the cheapest job.",
      },
    ],
    share:
      "Almost 70% of apartments approved since 2020 have never started. The RBA expects home building to shrink. And Victoria rewrote the building contract. This week's Build Brief.",
    subscribeLine: "Five minutes, every Friday.",
    furtherReading: [
      { label: "Issue 005: projects are being lost after the contract is signed", href: "/build-brief/issue-005" },
      { label: "Issue 004: what a new house costs before it is built", href: "/build-brief/issue-004" },
      { label: "Issue 003: the cost base restarts and the failure rate turns", href: "/build-brief/issue-003" },
      {
        label: "Perspective: Australian construction has a procurement problem",
        href: "/build-brief/perspectives/construction-procurement-standard",
      },
    ],
    sourceGroups: [
      {
        heading: "Stalled approvals and build times",
        links: [
          {
            label: "Reuters, Australia promised 1.2 million new homes, but builders are at their limits",
            href: "https://www.investing.com/news/economy-news/analysisaustralia-promised-12-million-new-homes-but-builders-are-at-their-limits-4853559",
          },
        ],
      },
      {
        heading: "The Reserve Bank",
        links: [
          {
            label: "RBA, Statement by the Monetary Policy Board, 11 August 2026",
            href: "https://www.rba.gov.au/media-releases/2026/mr-26-19.html",
          },
          {
            label: "RBA, Media Conference: Monetary Policy Decision, 11 August 2026",
            href: "https://www.rba.gov.au/speeches/2026/mc-gov-2026-08-11.html",
          },
          {
            label: "Domain, RBA interest rates decision August 2026",
            href: "https://www.domain.com.au/news/rba-august-2026-1541698/",
          },
        ],
      },
      {
        heading: "The Sydney Plan",
        links: [
          {
            label: "NSW Government, Minns Labor Government finalises 20-year Sydney Plan",
            href: "https://www.nsw.gov.au/ministerial-releases/twenty-year-sydney-plan-finalised",
          },
          {
            label: "NSW Department of Planning, The Sydney Plan, frequently asked questions",
            href: "https://www.planning.nsw.gov.au/plans-in-nsw/the-sydney-plan/frequently-asked-questions",
          },
          {
            label: "Elite Agent, The Sydney Plan: 800,000 new homes",
            href: "https://eliteagent.com/the-sydney-plan-800-000-new-homes-jobs-blueprint/",
          },
        ],
      },
      {
        heading: "Victoria's Domestic Building Contracts Amendment Act",
        links: [
          {
            label: "Norton Rose Fulbright, Welcome domestic building reforms for Victoria",
            href: "https://www.nortonrosefulbright.com/en/knowledge/publications/aed79307/welcome-domestic-building-reforms-for-victoria",
          },
          {
            label: "ARBV, How the overhaul of Victoria's building regulation laws may impact architects",
            href: "https://www.arbv.vic.gov.au/how-overhaul-victorias-building-regulation-laws-may-impact-architects-and-their-work",
          },
          {
            label: "HIA, Key changes to domestic building contracts explained",
            href: "https://hia.com.au/resources-and-advice/dealing-with-contracts/key-changes-to-domestic-building-contracts-explained",
          },
          {
            label: "Planning Victoria, Building reform",
            href: "https://www.planning.vic.gov.au/guides-and-resources/building-policy/building-reform",
          },
        ],
      },
    ],
    creditLine:
      "This edition used data and reporting from Reuters, Urbis, Master Builders Australia, the Housing Industry Association, the Reserve Bank of Australia, the New South Wales Government and Planning Victoria. The Build Brief is compiled by BuilderHQ, Melbourne.",
    sources: [
      "Reuters",
      "Urbis",
      "Master Builders Australia",
      "the Housing Industry Association",
      "the Reserve Bank of Australia",
      "the New South Wales Government",
      "Planning Victoria",
    ],
  },
  {
    slug: "issue-005",
    number: 5,
    date: "2026-08-07",
    displayDate: "Friday, 7 August 2026",
    title:
      "New home contract cancellations jumped 50%, and the SMSF borrowing ban starts Monday.",
    standfirst:
      "Cancellations of new home contracts rose 50% in June while sales for the year were up 18.4%. From Monday, self-managed super funds can no longer borrow to buy residential property. Home values fell 0.7% in July. And from July 2027, negative gearing follows new builds only.",
    seoTitle:
      "The Build Brief 005: Projects Are Being Lost After the Contract Is Signed | BuilderHQ",
    seoDescription:
      "New home contract cancellations jumped 50% in June, and the SMSF borrowing ban starts Monday 10 August. National home values fell 0.7% in July. From July 2027 negative gearing follows new builds, and a one for one knockdown rebuild does not qualify.",
    keywords: [
      "new home contract cancellations australia",
      "smsf borrowing ban 10 august 2026",
      "smsf limited recourse borrowing residential property",
      "cotality home value index july 2026",
      "australian home values falling 2026",
      "on completion valuation construction loan",
      "negative gearing new builds 2027",
      "what qualifies as a new build australia",
      "knockdown rebuild negative gearing",
      "capital gains tax changes 2027 australia",
      "hia new home sales june 2026",
      "apprentice retention australia",
      "apprenticeship commencements declining",
      "construction labour shortage australia",
      "new home commencements forecast australia",
      "residential construction news australia",
      "building contract finance approval",
      "compare builder quotes australia",
    ],
    ogImage: "/build-brief/og-issue-005.jpg",
    note: {
      eyebrow: "This week from the BuilderHQ team",
      heading: "Demand is not the problem. Conversion is.",
      paragraphs: [
        "Three sets of numbers landed this week. Each one marks a different point where a home that someone wants does not get built.",
        "The first is finance. New home contract cancellations jumped 50% in June, which the Housing Industry Association puts down to tighter borrowing capacity and conditional finance being withdrawn. Sales across the 2025-26 financial year were still up 18.4%. People want to build. More of those projects are failing between the signature and the slab.",
        "The second is valuation. National home values fell 0.7% in July, the largest monthly fall since December 2022, and the decline spread beyond Sydney and Melbourne for the first time. A cheaper site sounds like good news until you remember that construction lenders assess what the finished home will be worth, not what the land cost.",
        "The third is people. New research covering more than 12,000 apprentices found that three in four have never considered leaving. The ones who do are not short of commitment. They are short of support.",
        "One date before Monday. From 10 August, self-managed super funds can no longer borrow to buy residential property, and builders are holding thousands of signed contracts that depend on it. Details in the first signal. [Last week's edition](/build-brief/issue-004) covered what a new house now costs to build.",
      ],
      signoff: "The BuilderHQ Team",
    },
    signalsIntro: "Three signals. For everyone in the build.",
    signals: [
      {
        n: "01",
        kicker: "Demand Watch",
        headline: "Projects are being lost after the contract is",
        headlineAccent: "signed.",
        stat: {
          value: "+50%",
          label: "jump in new home contract cancellations, June 2026",
          sub: "SMSF borrowing ban starts Monday 10 August",
        },
        chart: {
          kind: "figures",
          title: "Demand is still there. Conversion is weakening.",
          desc: "New home sales across the 2025-26 financial year were up 18.4%, and June quarter sales were 4.6% higher than the same quarter a year earlier, while cancellations of new home sales contracts rose 50% in June compared with May.",
          valueHeading: "Change",
          figures: [
            { label: "New home sales, 2025-26 financial year", value: 18.4, display: "+18.4%" },
            { label: "Sales, June quarter, year on year", value: 4.6, display: "+4.6%" },
            {
              label: "Contract cancellations, June on May",
              value: 50,
              display: "+50%",
              accent: true,
            },
          ],
          footnote:
            "Two measures of appetite, one measure of completion. The gap between them is the story.",
        },
        body: [
          "The Housing Industry Association's latest New Home Sales report found cancellations of new home sales contracts jumped 50% in June compared with May. The HIA puts the increase down to higher borrowing costs limiting borrowing capacity, and to conditional finance being withdrawn.",
          "Demand has not disappeared. Sales in the June quarter were still 4.6% higher than the same period a year earlier, and sales across the full 2025-26 financial year were up 18.4%. The monthly picture varied by state. New South Wales recorded the largest fall at 12.5%, Victoria was down 9.2% and Queensland down 3.0%, while Western Australia rose 8.1% and South Australia held steady.",
          "That tension is the story. People still want to build. Fewer of those projects are surviving the trip from signed contract to site. More than 80% of builders now expect new home commencements to fall by at least 5%, and half expect declines of more than 10%.",
        ],
        callout: {
          kicker: "Before Monday",
          title: "The SMSF borrowing deadline",
          paragraphs: [
            "From Monday 10 August, self-managed super funds can no longer enter new limited recourse borrowing arrangements to buy residential property. Contracts exchanged before Monday remain valid even if settlement falls afterwards. Existing arrangements are grandfathered, including the right to refinance, and commercial and business real property borrowing is unaffected. A fund can still buy residential property outright without borrowing.",
            "The HIA surveyed Australia's largest detached home builders, together representing more than 40% of national detached housing construction. On the HIA's own estimate those builders hold 3,613 signed contracts backed by these arrangements that have not yet started on site, and expect 2,415 of them, close to 67%, to be cancelled. The HIA puts the combined effect at a 3.5% to 5% reduction in detached housing commencements nationally, and notes the figure covers detached housing only, so the total may be larger. These are expected cancellations reported by builders, not cancellations that have already occurred.",
            "If any contract in your pipeline depends on SMSF borrowing and has not commenced, today is the day to open that file.",
          ],
        },
        source:
          "HIA New Home Sales report, June 2026; HIA survey on SMSF limited recourse borrowing arrangements, July 2026",
        takes: {
          owners:
            "A signed building contract is not the end of feasibility. Check that the final contract, variations, finance approval and valuation still agree before committing cash, and [test the numbers early](/estimate_request_landing_page).",
          designers:
            "Late design changes can move a project outside the finance assumptions that got it approved. Cost control after planning matters as much as cost control before it.",
          builders:
            "A full sales pipeline is not the same as a secure construction pipeline. Finance readiness is worth understanding before labour and programme are committed.",
          brokers:
            "Conditional approval needs to survive the final contract price. Recheck the facility whenever scope, build cost or client contribution changes.",
        },
      },
      {
        n: "02",
        kicker: "Value Watch",
        headline: "A cheaper site does not automatically mean an easier",
        headlineAccent: "build.",
        stat: {
          value: "-0.7%",
          label: "national home values, July 2026",
          sub: "largest monthly fall since December 2022",
        },
        chart: {
          kind: "diverging",
          title: "July pushed the downturn wider",
          desc: "National dwelling values fell 0.7% in July 2026, Sydney fell 1.4% and Melbourne fell 1.2%. All three are monthly changes measured against no change.",
          valueHeading: "Monthly change, July 2026",
          zeroLabel: "no change",
          bars: [
            { label: "Australia", value: -0.7, display: "-0.7%", accent: true },
            { label: "Sydney", value: -1.4, display: "-1.4%" },
            { label: "Melbourne", value: -1.2, display: "-1.2%" },
          ],
          footnote:
            "Annual national growth is still positive at 5.3%. Over the three months to July, upper quartile values fell 3.2% while the lower price tier rose 0.3%.",
        },
        body: [
          "Cotality's national Home Value Index fell 0.7% in July, accelerating from June's 0.4% decline and recording the largest national monthly fall since December 2022. Annual growth slowed to 5.3%. Sydney fell 1.4% for the month and Melbourne 1.2%, while previously stronger mid-sized markets lost momentum, with Brisbane down 0.6% and Adelaide down 0.2%. The combined regional index fell 0.2%, its first decline since January 2023.",
          "[Our second edition](/build-brief/issue-002) picked up the first behavioural signal in this story, when auction activity and clearance rates weakened. This is the next stage: softer demand now showing up in values.",
          "The correction is concentrated at the expensive end. Over the three months to July, upper quartile values fell 3.2% nationally while the lower price tier rose 0.3%.",
          "For residential construction, falling prices are neither automatically good nor automatically bad. A buyer may acquire a site more cheaply. But the finished property may also value lower, and construction lenders assess what the proposed home is expected to be worth once complete rather than what the land cost. Lenders describe this differently, but the principle holds across the market: the loan is sized against the completed asset. That is why a cheaper site can still produce a project that is harder to finance.",
        ],
        source: "Cotality Home Value Index, July 2026 (released 3 August 2026)",
        takes: {
          owners:
            "Use the negotiating opportunity, but rerun the project's completed value before assuming a cheaper purchase improves feasibility. [A preliminary estimate](/estimate_request_landing_page) is the cheapest place to test it.",
          designers:
            "A project should work against both the client's construction budget and a defensible end value. In a moving market those are different tests.",
          builders:
            "Clients can face finance pressure even when your contract price has not changed. A softer valuation can still delay or resize the job.",
          brokers:
            "The on-completion valuation deserves as much attention as serviceability. A market movement can change the equity position without changing the drawings.",
        },
      },
      {
        n: "03",
        kicker: "Workforce",
        headline: "Most apprentices want to stay. The workplace decides whether they",
        headlineAccent: "do.",
        stat: {
          value: "76%",
          label: "of current apprentices had not considered leaving",
          sub: "supportive workplaces cut that risk by 28%",
        },
        chart: {
          kind: "relation",
          title: "Retention is an experience problem, not a commitment problem",
          desc: "Around 76% of current Australian apprentices had not considered leaving. Apprentices who felt cared for and supported at work were 28% less likely to consider leaving.",
          valueHeading: "Finding",
          headline: {
            display: "76%",
            label: "of current apprentices had not considered leaving their apprenticeship",
          },
          driver: {
            condition: "Apprentices who felt cared for and supported at work were",
            effect: "28% less likely to consider leaving",
          },
          steps: ["Clear expectations", "Regular check-ins", "Structured mentoring"],
        },
        body: [
          "Apprenticeship Support Australia released its National First Year Experience Report on Tuesday, launched in Sydney by the Minister for Skills and Training. It draws on the experiences of more than 12,000 current and former apprentices and trainees, and it lands at a time when apprenticeship and traineeship commencements are still falling nationally.",
          "Its most useful finding challenges a common assumption. Around 76% of current Australian apprentices said they had not considered leaving. Attrition is not mainly a commitment problem.",
          "Where the risk changes is the early workplace experience, and the first twelve months carry the greatest risk. Apprentices who felt cared for and supported at work were 28% less likely to consider leaving. Those experiencing sadness, anxiety or worry were 65% more likely to consider leaving. Cost of living pressure is widespread, with 55% reporting they were quite or extremely affected, rising to 58% among apprentices living with disability and 60% among First Nations apprentices. Only 49% said school had given them good information about all career pathways before they started.",
          "Organisation size shapes the experience in both directions. Apprentices in smaller workplaces often benefit from closer supervision, but retention risk rises where an employer lacks the time, systems or mentoring capacity to notice a problem early.",
          "The Brief has covered the construction labour shortage before. This week's research gives it a second half. Recruitment is only part of the answer. Retention is capacity too, and the [builders we introduce](/partners/builders) tend to be the ones who hold a team together.",
        ],
        source:
          "Apprenticeship Support Australia, National First Year Experience Report, released 4 August 2026; reported by Build Australia",
        takes: {
          owners:
            "A builder with a stable team has an operational advantage. Workforce continuity affects sequencing, workmanship and programme.",
          designers:
            "Clear, buildable documentation helps site teams at every experience level. Complexity that exists only on paper still has to be taught and executed.",
          builders:
            "Mentoring, clarity and supervision are how future capacity gets built. The research points to small, practical actions rather than large programmes.",
          brokers:
            "Workforce stability affects programme reliability, which affects progress claims, facility duration and holding costs.",
        },
      },
    ],
    feature: {
      kicker: "The Feature",
      headline:
        "From July 2027, negative gearing follows new builds. A one for one knockdown rebuild",
      headlineAccent: "is not one.",
      standfirst:
        "The tax treatment of residential investment changes on 1 July 2027, and the definition of a new build is narrower than the phrase suggests. If a project completes after that date, the structure matters now.",
      paragraphs: [
        "The Government's tax package was announced in the Budget on 12 May 2026 and is now law. Two measures change how residential investment is taxed from 1 July 2027, and both turn on a single question: does the project add to the housing stock?",
      ],
      sections: [
        {
          heading: "What changes",
          paragraphs: [
            "**Negative gearing narrows to new builds.** From 1 July 2027, an investor who buys an established residential property after 7:30pm on 12 May 2026 can no longer offset rental losses against salary or other income. Those losses are quarantined instead: they can be offset against residential rental income or against future capital gains from residential property, and carried forward to later years.",
            "**Properties held before the cutoff are grandfathered.** Anything owned at 7:30pm on 12 May 2026, including contracts exchanged but not yet settled, continues under the existing rules until it is sold. The test is the purchase date, not the settlement date.",
            "**There is an interim window.** Established properties bought after the cutoff can still be negatively geared until 30 June 2027. The restriction applies from 1 July 2027.",
            "**Capital gains tax changes too.** The 50% CGT discount is replaced by cost base indexation with a minimum 30% tax rate on gains, applying to gains that accrue from 1 July 2027. Investors in eligible new builds can choose either the existing 50% discount or the new arrangement.",
          ],
        },
        {
          heading: "What counts as a new build",
          paragraphs: [
            "This is the part that decides how projects get structured, and the line is drawn around net new dwellings rather than new construction.",
            "**Generally eligible:** a dwelling built on previously vacant land; a development that demolishes an existing property and replaces it with a greater number of dwellings; off the plan apartments; house and land packages; qualifying duplex developments; and newly built properties that have not previously been sold or occupied.",
            "**Generally not eligible:** a knockdown rebuild that replaces one dwelling with one dwelling; substantial renovations; and granny flat additions to an existing established property.",
            "One further limit matters for anyone building to sell. The new build treatment is available to the first investor purchaser only. A subsequent buyer of the same property does not inherit it.",
            "Separate exemptions have been flagged for build to rent developments and for private investors participating in government housing programs, along with properties held in superannuation funds and widely held trusts. Detail on the scope of those exemptions remains limited.",
          ],
        },
        {
          heading: "Why this matters before 2027",
          paragraphs: [
            "Residential projects take time. A townhouse development that starts documentation now may not reach a first investor buyer until well after July 2027, which means the tax treatment of the finished product is being decided at design stage today.",
            "The practical consequence is that dwelling yield has acquired a tax dimension it did not have before. One house replaced by two townhouses sits on one side of the line. One house replaced by one larger house sits on the other. That does not make the second project wrong, and plenty of owner occupier work is unaffected entirely. It does mean the question is worth asking early, particularly on infill sites where the difference between one dwelling and two is a planning decision rather than a construction one. If an investor buyer is the exit, [test the numbers before the design locks](/estimate_request_landing_page).",
            "None of this is advice about any particular project. The framework is law, the finer definition of an eligible new build is still being settled through the legislative and consultation process, and the answer for any given site depends on facts that a qualified adviser needs to look at. General information only, current at the date of publication. Seek advice specific to your circumstances.",
          ],
        },
      ],
      factBox: {
        title: "The dates",
        rows: [
          { k: "Grandfathering cutoff", v: "7:30pm, 12 May 2026, by purchase date" },
          { k: "Interim window ends", v: "30 June 2027" },
          { k: "New rules apply from", v: "1 July 2027" },
          { k: "Negative gearing", v: "New builds only" },
          { k: "CGT discount", v: "50% replaced by indexation, minimum 30% rate" },
          { k: "New build treatment", v: "First investor purchaser only" },
        ],
      },
      pullQuote:
        "The tax treatment of the finished product is being decided at design stage today.",
      source:
        "ATO, Tax reform: boosting home ownership, reforming negative gearing and capital gains tax; Budget 2026-27 tax reform explainer; Pitcher Partners; William Buck; Goodwin Chivas; Duo Tax",
      takes: {
        owners:
          "If a project completes after July 2027 and an investor buyer is the exit, dwelling yield now carries a tax consequence. Get advice before the design locks.",
        designers:
          "On infill sites, the difference between one dwelling and two has moved from a planning question to a planning and tax question.",
        builders:
          "Knockdown rebuild and renovation work is not disadvantaged for owner occupiers. It is the investor exit that changes.",
        brokers:
          "Two tax regimes will run side by side from July 2027, depending on purchase date and dwelling type. Client records need to carry the date.",
      },
    },
    bps: {
      kicker: "The BuilderHQ Procurement Standard",
      headline: "A contract is only as strong as the scope it was signed",
      headlineAccent: "on.",
      standfirst:
        "Market Watch 01 counts projects lost between signature and site. Finance explains most of them. Scope explains some, and scope is the part we can fix.",
      paragraphs: [
        "When three builders price the same house, they are rarely pricing the same scope. Each quote is honest. None is comparable. The owner signs the lowest number, and the difference surfaces later as a variation, at the point in a project where the budget has the least room left in it.",
      ],
      comparison: {
        title: "Same drawings, same house, three quotes",
        line: "Landscaping to the rear yard",
        quotes: [
          {
            who: "Builder A",
            treatment: "Included as documented",
            note: "Prices the work shown on the landscape plan.",
          },
          {
            who: "Builder B",
            treatment: "$18,000 allowance",
            note: "Carries a figure, to be adjusted against actual cost.",
          },
          {
            who: "Builder C",
            treatment: "Not mentioned",
            note: "Silent. The owner reads that as included.",
          },
        ],
        verdict:
          "Builder C looks cheapest and is not. Nobody has done anything wrong. The three quotes describe three different houses, and nothing in the paperwork tells the owner that.",
        answersTitle: "Under the Standard, every builder answers the same line, one of four ways",
        answers: [
          "Included as documented",
          "Allowance, at a stated figure",
          "Excluded",
          "Not applicable",
        ],
      },
      definition: {
        heading: "What the Standard does",
        paragraphs: [
          "The documents are read against a fixed schedule of the work a home requires, and every gap is settled with the client before pricing opens, so all three builders carry the same figure rather than each guessing privately.",
          "Fair in both directions. A builder who prices carefully should not lose to a cheaper quote that is quieter about what it leaves out. An owner should not need to be a quantity surveyor to see the difference. [Our Perspective on procurement](/build-brief/perspectives/construction-procurement-standard) sets out the argument in full.",
        ],
      },
      pullQuote: "Builder C looks cheapest and is not.",
    },
    partnerCorner: {
      partnerSlug: "jason-pogorelec",
      headline:
        "Meet Jason Pogorelec of Inovayt, a broker who plans the finance past the settlement.",
      principal: "Jason Pogorelec",
      principalRole: "Senior Finance Broker",
      portrait: "/build-brief/issue-005/jason-pogorelec.jpg",
      portraitCaption: "Jason Pogorelec, Senior Finance Broker",
      showLogo: true,
      logo: "/build-brief/issue-005/inovayt.png",
      deck: "Strategy that looks past a single settlement.",
      stats: [
        { value: "5.0", label: "Google rating, Inovayt", star: true },
        { value: "15+ yrs", label: "In finance broking" },
        { value: "9", label: "Industry honours since 2011" },
      ],
      why: "This edition is about projects lost between the signed contract and the slab, and finance decides most of them. Jason Pogorelec has spent more than fifteen years in broking, all of it with one firm, and works the way that problem needs: analytical, organised, and built around a client's next decade rather than a single approval. He structures lending across home, investment, commercial and self-managed super, so that a construction loan taken today does not narrow the options tomorrow.",
      practice:
        "A senior finance broker with Inovayt in West Melbourne, working across construction loans, investment lending and self-managed super fund finance. Nine industry honours since 2011, including AFG's Top 20 Champion Broker list for Victoria in 2019 and 2020, and a finalist placing for Best Residential Broker at the 2022 Better Business Awards.",
      welcome:
        "In a week where finance is what decides whether a project starts, a broker who plans past the approval is exactly who this platform exists to put in front of owners early.",
    },
    overToYou: {
      question: "What would you most like The Build Brief to help you understand?",
      body: "Reply with a line. The topics readers ask about most shape where we take future editions.",
    },
    faq: [
      {
        q: "Why are new home contract cancellations rising in Australia?",
        a: "Cancellations of new home sales contracts jumped 50% in June 2026 compared with May. The Housing Industry Association attributes the increase to higher borrowing costs limiting borrowing capacity, and to conditional finance being withdrawn. Demand itself has not fallen away: sales in the June quarter were 4.6% higher than the same quarter a year earlier, and sales across the 2025-26 financial year were up 18.4%.",
      },
      {
        q: "When does the SMSF borrowing ban start?",
        a: "From Monday 10 August 2026, self-managed super funds can no longer enter new limited recourse borrowing arrangements to buy residential property. Contracts exchanged before that date remain valid even if settlement occurs afterwards.",
      },
      {
        q: "Can an SMSF still buy residential property after 10 August 2026?",
        a: "Yes, but not with new borrowing. A fund can still buy residential property outright. Existing limited recourse borrowing arrangements are grandfathered and can still be refinanced, and borrowing for commercial and business real property is unaffected. The change applies to new residential borrowing arrangements only.",
      },
      {
        q: "How many building contracts are affected by the SMSF borrowing ban?",
        a: "The Housing Industry Association surveyed Australia's largest detached home builders, together representing more than 40% of national detached housing construction. On the HIA's estimate those builders hold 3,613 signed contracts backed by these arrangements that have not yet started on site, and expect 2,415 of them, close to 67%, to be cancelled. The HIA puts the effect at a 3.5% to 5% reduction in detached housing commencements nationally, and notes the figure covers detached housing only. These are expected cancellations reported by builders, not cancellations that have already happened.",
      },
      {
        q: "Did Australian home values fall in July 2026?",
        a: "Yes. Cotality's national Home Value Index fell 0.7% in July 2026, accelerating from a 0.4% decline in June and recording the largest national monthly fall since December 2022. Sydney fell 1.4% and Melbourne 1.2%. The combined regional index fell 0.2%, its first decline since January 2023. Annual national growth slowed to 5.3%.",
      },
      {
        q: "Does a cheaper site make a construction loan easier to get?",
        a: "Not necessarily. Construction lenders assess what the proposed home is expected to be worth once complete, rather than what the land cost. If values are falling, the completed property may also value lower, which can change the equity position without anything changing in the drawings or the contract price.",
      },
      {
        q: "What qualifies as a new build for negative gearing from 1 July 2027?",
        a: "The line is drawn around net new dwellings rather than new construction. Generally eligible: a dwelling built on previously vacant land, a development that replaces an existing property with a greater number of dwellings, off the plan apartments, house and land packages, qualifying duplex developments, and newly built properties not previously sold or occupied. Generally not eligible: a knockdown rebuild that replaces one dwelling with one dwelling, substantial renovations, and granny flat additions to an existing established property. The treatment is available to the first investor purchaser only. The framework is law, but the finer definition is still being settled, so specific advice is needed for any particular project.",
      },
      {
        q: "Is a knockdown rebuild negatively gearable after 2027?",
        a: "A knockdown rebuild that replaces one dwelling with one dwelling is generally not treated as a new build, so from 1 July 2027 an investor buying it would not be able to offset rental losses against other income. Replacing one dwelling with a greater number of dwellings generally is treated as a new build. Owner occupier work is unaffected: the change applies to the tax treatment of residential investment.",
      },
      {
        q: "Why do most apprentices leave, and what keeps them?",
        a: "Around 76% of current Australian apprentices said they had not considered leaving, so attrition is not mainly a commitment problem. Apprentices who felt cared for and supported at work were 28% less likely to consider leaving, while those experiencing sadness, anxiety or worry were 65% more likely to. Cost of living pressure was widespread, with 55% reporting they were quite or extremely affected. The findings come from Apprenticeship Support Australia's National First Year Experience Report, drawing on more than 12,000 current and former apprentices and trainees.",
      },
      {
        q: "Why are three builder quotes for the same house so hard to compare?",
        a: "Because there is no common format for what a quote has to answer. One builder may price an item as documented, another may carry an allowance, and a third may not mention it at all, so three honest quotes can describe three different scopes of work. The cheapest quote is often the one that is quietest about what it leaves out, and the difference usually surfaces later as a variation.",
      },
    ],
    share:
      "New home contract cancellations jumped 50% in June, and the SMSF borrowing ban starts Monday. This week's Build Brief.",
    subscribeLine: "Five minutes, every Friday.",
    furtherReading: [
      { label: "Issue 004: what a new house costs before it is built", href: "/build-brief/issue-004" },
      { label: "Issue 003: the cost base restarts and the failure rate turns", href: "/build-brief/issue-003" },
      { label: "Issue 002: Victoria's new building rules and the labour squeeze", href: "/build-brief/issue-002" },
      {
        label: "Perspective: Australian construction has a procurement problem",
        href: "/build-brief/perspectives/construction-procurement-standard",
      },
    ],
    sourceGroups: [
      {
        heading: "Cancellations and the SMSF deadline",
        links: [
          {
            label: "HIA, New Home Sales report",
            href: "https://hia.com.au/our-industry/economics/data-forecasts/resource/new-home-sales-report",
          },
          {
            label: "HIA, Housing supply set to fall as thousands of new home contracts face cancellation",
            href: "https://hia.com.au/our-industry/newsroom/economic-research-and-forecasting/2026/07/housing-supply-set-to-fall-as-thousands-of-new-home-contracts-face-cancellation",
          },
          {
            label: "Broker Daily, SMSF borrowing ban puts thousands of building contracts at risk",
            href: "https://www.brokerdaily.au/property/21794-smsf-borrowing-ban-puts-thousands-of-building-contracts-at-risk",
          },
        ],
      },
      {
        heading: "Home values",
        links: [
          {
            label: "Cotality, Australia's housing market downturn widens",
            href: "https://www.cotality.com/au/insights/articles/australias-housing-market-downturn-widens",
          },
          {
            label: "Reuters, Australia's home price retreat gathers pace in July",
            href: "https://www.investing.com/news/economic-indicators/australias-home-price-retreat-gathers-pace-in-july-cotality-data-shows-4829700",
          },
        ],
      },
      {
        heading: "Apprentice retention",
        links: [
          {
            label: "Build Australia, New report finds most apprentices plan to stay",
            href: "https://www.buildaustralia.com.au/news_article/new-report-finds-most-apprentices-plan-to-stay/",
          },
          {
            label: "Mirage News, Research uncovers factors keeping apprentices in training",
            href: "https://www.miragenews.com/research-uncovers-factors-keeping-apprentices-1720680/",
          },
        ],
      },
      {
        heading: "Negative gearing and capital gains tax",
        links: [
          {
            label: "ATO, Tax reform: boosting home ownership, reforming negative gearing and capital gains tax",
            href: "https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/tax-reform-boosting-home-ownership-reforming-negative-gearing-and-capital-gains-tax",
          },
          {
            label: "Budget 2026-27, tax reform explainer",
            href: "https://budget.gov.au/content/04-tax-reform.htm",
          },
          {
            label: "Goodwin Chivas, Negative gearing limited to new builds from 1 July 2027",
            href: "https://www.goodwinchivas.com.au/reading-room/negative-gearing-limited-to-new-builds",
          },
          {
            label: "Duo Tax, What qualifies as a new build after the 2026 Federal Budget changes?",
            href: "https://duotax.com.au/insights/what-qualifies-as-a-new-build/",
          },
        ],
      },
    ],
    creditLine:
      "This edition used data and reporting from the Housing Industry Association, Cotality, Apprenticeship Support Australia, the Australian Taxation Office, the Commonwealth Treasury and Build Australia. The Build Brief is compiled by BuilderHQ, Melbourne.",
    sources: [
      "the Housing Industry Association",
      "Cotality",
      "Apprenticeship Support Australia",
      "the Australian Taxation Office",
      "the Commonwealth Treasury",
      "Build Australia",
    ],
  },
  {
    slug: "issue-007",
    number: 7,
    date: "2026-08-21",
    displayDate: "Friday, 21 August 2026",
    title:
      "Victoria is rewriting when the money moves, and every reform date now sits on one timeline.",
    standfirst:
      "Draft regulations on deposits and progress payments are open for consultation. A Royal Commission has been appointed into major public construction. New home sales fell for a third month. And every Victorian building reform date, checked against the legislation register and set out in order.",
    seoTitle:
      "The Build Brief 007: Victoria Rewrites Deposits and Progress Payments | BuilderHQ",
    seoDescription:
      "Victoria has released draft regulations changing when money moves through a build. A Royal Commission has been appointed. New home sales fell 3.7% in July. And every Victorian building reform date on one checked timeline.",
    keywords: [
      "victoria deposits progress payments regulations",
      "domestic building contract victoria 2026",
      "victorian building reforms timeline",
      "construction royal commission victoria",
      "new home sales australia july 2026",
      "cost escalation clause victoria",
      "cooling off period building contract",
      "progress payment stages victoria",
      "domestic building contracts amendment act",
      "fairer payments on jobsites act",
      "minimum financial requirements victoria builders",
      "developer bond scheme victoria",
      "security of payment victoria 2026",
      "builderhq hia mba",
      "modern methods of construction progress payments",
      "victorian building reform dates",
    ],
    ogImage: "/build-brief/og-issue-007.jpg",
    association: {
      kicker: "In association with",
      headline: "BuilderHQ is proud to be associated with",
      headlineAccent: "HIA and Master Builders.",
      logos: [
        { src: "/build-brief/issue-007/hia.png", alt: "Housing Industry Association", height: 76 },
        { src: "/build-brief/issue-007/master-builders.png", alt: "Master Builders Australia", height: 40 },
      ],
      paragraphs: [
        "BuilderHQ is a member of two of Australia's leading building industry organisations, the Housing Industry Association and Master Builders.",
        "For us, membership is about staying connected to the organisations, standards, research and conversations helping shape Australian construction. That matters as we build a new way to tender and evaluate construction projects.",
        "Our platform has been developed around a simple principle: better procurement should support a stronger, more professional construction industry. Being part of the broader HIA and Master Builders communities keeps BuilderHQ connected to the industry we are building for.",
        "Their research and market intelligence also regularly inform The Build Brief, alongside data and insights from across the Australian construction sector.",
      ],
      closing: "Built for the industry. Connected to the industry.",
    },
    note: {
      eyebrow: "This week from the BuilderHQ team",
      heading: "Victoria is rewriting when the money moves.",
      paragraphs: [
        "Most building reform is about what gets built. This week's is about when you get paid.",
        "Victoria released draft regulations covering deposits and progress payments, with a Regulatory Impact Statement, open for consultation now. It is the detail behind the contract changes [we wrote about last week](/build-brief/issue-006), and it is the part that touches every job in the state.",
        "On Thursday the Premier appointed a Royal Commission into misconduct in major public construction. We set out what it covers, and what it does not, in the second signal. And new home sales fell for a third month running.",
        "The Feature is the whole Victorian reform timeline, checked line by line against the legislation register. Two dates are worth reading twice: a law many are still waiting for has been in force since April, and a set of requirements that reads like a 2028 problem started this July.",
      ],
      signoff: "The BuilderHQ Team",
    },
    signalsIntro: "Three signals. For everyone in the build.",
    signals: [
      {
        n: "01",
        kicker: "The Money",
        headline: "Victoria is redesigning when money moves through",
        headlineAccent: "a build.",
        stat: {
          value: "5%",
          label: "cap on cost escalation, and only on contracts of $1 million or more",
          sub: "draft regulations open for consultation now",
        },
        chart: {
          kind: "strip",
          title: "Where money moves through a build",
          desc: "A traditional domestic building contract releases money at deposit, base, frame, lock-up, fixing and completion. From 1 December 2026 those limits move from the Act into regulations, and can vary where part of the work is built offsite.",
          stages: [
            { label: "Deposit", accent: true },
            { label: "Base" },
            { label: "Frame" },
            { label: "Lock-up" },
            { label: "Fixing" },
            { label: "Completion", accent: true },
          ],
          callout: {
            from: 1,
            to: 4,
            label: "Written for a house built on site",
            sub: "these four stages can vary where a modern method of construction is used",
          },
          legend: { accent: "Money changes hands", context: "Work stages" },
        },
        rowsTitle: "What changes on 1 December 2026",
        rows: [
          { label: "Deposit and progress payment limits", value: "Set by regulation" },
          { label: "Offsite construction", value: "Limits can vary", accent: true },
          { label: "Cost escalation clauses", value: "$1m+, capped at 5%" },
          { label: "Cooling off", value: "Five days, always" },
          { label: "Variations", value: "One process" },
        ],
        body: [
          "The Victorian government released draft regulations and a Regulatory Impact Statement this week covering deposits and progress payments on domestic building contracts. Consultation is open. These are proposals, not settled limits.",
          "Under the Domestic Building Contracts Amendment Act, deposit and progress payment limits move out of the Act and into regulations, where they can be updated without returning to Parliament. One provision looks forward: progress payment limits will be able to vary where part of the work uses a modern method of construction, such as modular or offsite prefabrication. Traditional stages assume value is created on site. When most of a home is built in a factory, base, frame and lock-up stop describing anything useful.",
          "Three other changes commence with it on 1 December. A cost escalation clause is only permitted where the contract price is $1 million or more, and the increase cannot exceed 5% of the contract price. The five day cooling off period applies whether or not the owner obtained legal advice. And builder initiated and owner initiated variations become a single process.",
          "One more thing is changing that is easy to miss. An owner can already end a contract if the price rises 15% or the build time extends by half. Today that right is limited to increases arising for unforeseeable reasons. The amendment removes that limitation, so the thresholds stay the same while the right behind them gets materially wider.",
          "All of it applies to contracts signed after commencement. Existing contracts continue as they are.",
        ],
        source:
          "Victorian Government, draft regulations and Regulatory Impact Statement on deposits and progress payments; Domestic Building Contracts Amendment Act 2025 (Act No. 36 of 2025), verified against the authorised text on the Victorian legislation register",
        takes: {
          owners:
            "Your deposit and payment schedule will be set by rules being written right now, and consultation is open. [Test the build cost early](/estimate_request_landing_page) so the schedule has something real to sit against.",
          designers:
            "If you administer contracts, the payment schedule you are used to changes on 1 December.",
          builders:
            "Cash flow. Read the draft, and respond to the consultation if the proposed limits do not work for how you build.",
          brokers:
            "Drawdown schedules follow progress payment stages. Both are moving at once.",
        },
      },
      {
        n: "02",
        kicker: "The Inquiry",
        headline: "Victoria has appointed a Royal Commission into major public",
        headlineAccent: "construction.",
        stat: {
          value: "20 Aug",
          label: "Royal Commission appointed, Terms of Reference released",
          sub: "final report due by 20 August 2027",
        },
        chart: {
          kind: "compare",
          title: "What the Commission reaches, and what it does not",
          desc: "The Terms of Reference confine the inquiry to major public and civil infrastructure projects commissioned by the State of Victoria. Residential building sits outside that definition.",
          rowLabels: ["The projects", "The conduct", "Who it reaches"],
          left: {
            heading: "In scope",
            cells: [
              "State commissioned major public and civil infrastructure",
              "Intimidation, coercion, criminal influence",
              "Parties to those projects",
            ],
          },
          right: {
            heading: "Not in scope",
            cells: [
              "Residential building",
              "Domestic building contracts",
              "Residential builders",
            ],
          },
          footnote:
            "Lawful action under industrial relations and occupational health and safety law is expressly excluded.",
        },
        body: [
          "Premier Ben Carroll appointed a Royal Commission on Thursday and released its Terms of Reference. It will investigate crime and misconduct in the state's construction industry, including intimidation, coercion and criminal influence, and it can compel evidence.",
          "The scope matters more than the headline. The Terms of Reference define the subject matter as major public and civil infrastructure construction projects commissioned by the State of Victoria. This is not an inquiry into residential builders, and for anyone building or renovating a home in Victoria, nothing changes today. Lawful action under industrial relations and occupational health and safety law is expressly outside the scope.",
          "What could change is what follows. The Commission will consider what regulatory and legislative changes are needed, and the government has signalled legislation to strengthen the powers of Victoria's anti-corruption body, IBAC.",
          "Victorian Chamber of Commerce and Industry chief executive Sally Curtain said that those in the industry who are honest and hardworking deserve a system that protects them, not one that enables intimidation, coercion or criminal gain.",
          "A final report is due by 20 August 2027, with an interim report at the Commissioner's discretion. Hearing dates have not been announced.",
        ],
        source:
          "Victorian Government, Royal Commission into the Integrity of Major Public and Civil Infrastructure Construction Projects in Victoria, Terms of Reference, 20 August 2026; Victorian Chamber of Commerce and Industry statement, 20 August 2026",
        takes: {
          owners: "Nothing changes on a residential project today.",
          designers:
            "No immediate effect on documentation, procurement or contract administration.",
          builders:
            "The scope is misconduct on major public projects. Findings may reach regulation more broadly.",
          brokers: "No immediate effect on lending. A medium term watch item.",
        },
      },
      {
        n: "03",
        kicker: "Demand",
        headline: "New home sales have now fallen for",
        headlineAccent: "three months straight.",
        stat: {
          value: "-3.7%",
          label: "new home sales, July 2026",
          sub: "third consecutive monthly fall",
        },
        chart: {
          kind: "figures",
          title: "The quarter is down. The year is still up.",
          desc: "New home sales fell 3.7% in July 2026, the third consecutive monthly decline. Sales in the three months to July were 13.5% lower than the previous quarter, while the trailing twelve months remained 17.1% higher than the year before.",
          valueHeading: "Change",
          figures: [
            { label: "July, month on month", value: -3.7, display: "-3.7%", accent: true },
            { label: "Three months to July, on the previous quarter", value: -13.5, display: "-13.5%" },
            { label: "Twelve months to July, on the year before", value: 17.1, display: "+17.1%" },
          ],
          footnote:
            "Momentum is leaving the market. The market is not disappearing.",
        },
        body: [
          "The Housing Industry Association's July survey recorded a 3.7% fall in new home sales, the third consecutive monthly decline, which HIA senior economist Thomas Devitt attributed to higher interest rates and policy uncertainty weighing on consumer confidence.",
          "The three month picture is the sharper one. Sales in the three months to July were 13.5% lower than the previous quarter, while the trailing twelve months still sat 17.1% higher than the year before. New South Wales was the only state to record a monthly increase, at 2.1%. Queensland fell hardest at 10.9%, then South Australia at 7.6% and Victoria at 2.0%. Over the full year Victoria leads the country, 27.6% ahead.",
          "Read it beside the first signal. Fewer sales, and a payment structure being rewritten at the same time. Which is why the consultation above is worth ten minutes of a builder's Friday.",
        ],
        source:
          "Housing Industry Association, New Home Sales report, 21 August 2026 (survey of large volume builders in the five largest states)",
        takes: {
          owners:
            "Builders have more capacity than they did six months ago. That is a negotiating position.",
          designers:
            "Clients are taking longer to commit. Stage the fee proposal so a pause does not stall the job.",
          builders:
            "Three months is a trend, not a blip. Worth reviewing pipeline conversion rather than enquiry count.",
          brokers:
            "Softer demand usually means more pre-approvals that never convert. Follow up earlier.",
        },
      },
    ],
    feature: {
      kicker: "The Feature",
      headline: "Everything changing in Victorian building, on",
      headlineAccent: "one timeline.",
      standfirst:
        "Every date here is checked against the Victorian legislation register. Two of them are easy to misread, and both are the kind of mistake that puts a job on the wrong side of a rule.",
      paragraphs: [
        "No state has changed its building rules more in the past two years than Victoria. The problem is not the changes. It is keeping track of which one starts when, and which of them touches the job you are quoting this week.",
        "Two dates first, because they are the ones most likely to catch a job out.",
      ],
      sections: [
        {
          heading: "Two dates worth reading twice",
          paragraphs: [
            "**The Fairer Payments on Jobsites Act is not coming. It arrived in April.** The Building Legislation Amendment (Fairer Payments on Jobsites and Other Matters) Act 2025 is Act No. 43 of 2025. Its security of payment reforms were proclaimed early and commenced **15 April 2026**. The 1 September 2026 date in section 2(3) is the statutory backstop, not the commencement date. It is worth knowing how these clauses read: a commencement section names a date things start by, and anything proclaimed earlier starts earlier. What falls to 1 September is the registration of building surveyors and building inspectors, plus two adjudication provisions. If you are a subcontractor waiting for claimable variations and excluded amounts to be abolished, they already have been.",
            "**Minimum financial requirements are not a 2028 problem.** They commenced **1 July 2026**. New applicants comply immediately. Existing builders phase in by size, from reporting years starting 1 November 2027 for the largest, 1 March 2028 for the middle tier, and 1 July 2028 for the smallest. 1 July 2028 is the last tier, not the start.",
          ],
        },
        {
          heading: "In effect now",
          paragraphs: [
            "**1 July 2025 · Building and Plumbing Commission.** The regulator now operating as the BPC. Worth knowing that the Victorian Building Authority has not been abolished: the BPC currently operates as the VBA trading as the Building and Plumbing Commission.",
            "**15 April 2026 · Fairer Payments on Jobsites, security of payment.** Claimable variations and excluded amounts repealed, which removes the narrowest limits in the country. Performance security claims can now go to adjudication. Notice based time bars can be declared unfair where compliance is not reasonably possible or would be unreasonably onerous. The adjudication review mechanism is abolished.",
            "**19 May 2026 · Cladding Safety Victoria Repeal Act.** Assented 19 May 2026. Cladding Safety Victoria's functions wound up.",
            "**1 July 2026 · Home warranty replaces Domestic Building Insurance.** For contracts signed on or after 1 July, on work over $20,000 in buildings of three storeys or less. Cover rose from $300,000 to $400,000. The difference that matters: under the old scheme an owner could claim only if the builder died, disappeared or became insolvent. Now an owner can claim where work is incomplete, defective or non-compliant and the builder will not or cannot fix it. Major defects six years, others two.",
            "**1 July 2026 · Rectification orders.** The BPC can direct a builder or developer to fix defective, non-compliant or incomplete work up to ten years after completion. Retrospective, so it reaches homes finished before 1 July.",
            "**1 July 2026 · Minimum financial requirements, and the developer bond scheme.** Both commenced. The bond obligation itself is triggered by permit date, which is where 1 July 2027 comes in below.",
          ],
        },
        {
          heading: "Coming",
          paragraphs: [
            "**1 September 2026 · The rest of Fairer Payments on Jobsites.** Eleven days. Registration of building surveyors and building inspectors, information statements from relevant building surveyors, and two adjudication provisions, unless proclaimed sooner.",
            "**1 December 2026 · Domestic Building Contracts Amendment Act.** Unless proclaimed earlier, and applying only to contracts signed after it starts. A new developer category, where a builder contracting with a developer sees contract content requirements drop from 21 items to four and several consumer protections fall away. One variation process. Deposit and progress payment limits move into regulations, which are out for consultation now. Progress payment limits can vary for modern methods of construction. Cost escalation clauses only where the contract price is $1 million or more, capped at 5%. Five day cooling off, legal advice or not. And the 15% price and 50% time termination right loses its unforeseeable reasons limitation.",
            "**1 July 2027 · Developer bond obligation.** Applies to apartment buildings of four storeys and above where the building permit is issued on or after that date. Bond of 2% of total build cost. Decennial insurance is legislated as an alternative instrument.",
            "**By 1 December 2027 · Building and Plumbing Administration and Enforcement Act.** Act No. 17 of 2026, passed the Assembly 2 April 2026 and the Council 12 May 2026, assented 19 May 2026. It commences by proclamation and no later than 1 December 2027. Anyone quoting a firmer date than that is guessing.",
          ],
        },
        {
          heading: "Running alongside",
          paragraphs: [
            "**Royal Commission into the Integrity of Major Public and Civil Infrastructure Construction Projects in Victoria.** Appointed 20 August 2026. Final report due by 20 August 2027. Findings may lead to further regulatory change.",
            "General information only, correct at the date of publication. Get advice for your own situation. This edition also corrects a date in [our earlier coverage](/build-brief/issue-006): the Building and Plumbing Administration and Enforcement Act was assented in May, not commenced.",
          ],
        },
      ],
      factBox: {
        title: "The dates that decide which rules apply to you",
        rows: [
          { k: "Your contract date", v: "Old or new contract rules, and which warranty scheme" },
          { k: "15 April 2026", v: "Security of payment reforms, already in force" },
          { k: "1 September 2026", v: "Surveyor and inspector registration" },
          { k: "1 December 2026", v: "Contracts, variations, deposits, escalation, cooling off" },
          { k: "Your permit date, if a developer", v: "The bond applies by permit date, not contract date" },
          { k: "1 Nov 2027 to 1 Jul 2028", v: "Financial requirements phase in by builder size" },
        ],
      },
      pullQuote:
        "A permit issued on 30 June 2027 and one issued on 2 July 2027 are treated differently.",
      source:
        "Victorian legislation register (authorised Acts and Government Gazette S 189), Planning Victoria, Building and Plumbing Commission, Housing Industry Association",
      takes: {
        owners:
          "Your contract date decides almost everything. Know it, and know which side of 1 December it falls.",
        designers:
          "If you administer contracts, two of the dates above are already behind you.",
        builders:
          "Check the financial requirements tier you sit in. That one is in force now, not in 2028.",
        brokers:
          "Two contract regimes will run side by side from December, split by signing date.",
      },
    },
    bps: {
      kicker: "The BuilderHQ Procurement Standard",
      headline: "The rules decide when money moves. The scope decides",
      headlineAccent: "how much.",
      standfirst:
        "Market Watch 01 is about the schedule a payment follows. This is about the number that schedule is calculated from, and why it moves after signing.",
      paragraphs: [
        "Victoria is being careful about when money changes hands. A deposit cap, six payment stages, a five per cent limit on escalation. All of it applies to a contract price that was set before anyone checked whether three builders were pricing the same house.",
        "A variation is not usually a builder changing their mind. It is a line nobody settled before pricing opened, surfacing at the point where a budget has the least room left in it. The payment schedule is now tightly regulated. The number it draws down against is not.",
      ],
      comparison: {
        title: "Same drawings, same house, three quotes",
        line: "Site preliminaries",
        quotes: [
          {
            who: "Builder A",
            treatment: "Included as documented",
            note: "Prices the work shown, and carries the risk.",
          },
          {
            who: "Builder B",
            treatment: "$26,000 allowance",
            note: "Carries a figure, adjusted against actual cost.",
          },
          {
            who: "Builder C",
            treatment: "Not mentioned",
            note: "Silent. The owner reads that as included.",
          },
        ],
        verdict:
          "Builder C looks cheapest and is not. Nobody has done anything wrong. A five per cent cap on escalation does nothing about a gap that was never priced in the first place.",
        answersTitle: "Under the Standard, every builder answers the same line, one of four ways",
        answers: [
          "Included as documented",
          "Allowance, at a stated figure",
          "Excluded",
          "Not applicable",
        ],
      },
      definition: {
        heading: "What the Standard does",
        paragraphs: [
          "The documents are read against a fixed schedule of the work a home requires, and every gap is settled with the client before pricing opens, so all three builders carry the same figure rather than each guessing privately.",
          "Regulation is fixing the timing. This is the part regulation does not reach. [Our Perspective on procurement](/build-brief/perspectives/construction-procurement-standard) sets out the argument in full.",
        ],
      },
      pullQuote:
        "A cap on escalation does nothing about a gap that was never priced.",
    },
    partnerCorner: {
      partnerSlug: "house-design-solutions",
      headline: "Meet House Design Solutions, and a Tudor house that got a modern back half.",
      principal: "Paul A. Mete",
      principalRole: "Building Designer and director",
      showLogo: true,
      logo: "/partners/house-design-solutions/logo.png",
      deck: "Business at the front, party out the back.",
      stats: [
        { value: "5.0", label: "Google rating", star: true },
        { value: "30 yrs", label: "Melbourne house design" },
        { value: "Albert Park", label: "Studio, serving all Melbourne" },
      ],
      why: "Paul A. Mete has been designing Melbourne houses for thirty years, and House Design Solutions is deliberately small: the person you talk to is the person drawing your house. The practice works across new homes, extensions and unit development, with feasibility advice at the front of it, which is why owners tend to arrive before they have decided what to do with a site rather than after.",
      practice:
        "A building design practice in Albert Park working across all of Melbourne, and a member of Design Matters National, having been with its predecessor the Building Designers Association of Victoria for more than twenty five years.",
      welcome:
        "A practice that tells an owner what a site is worth doing before it draws anything is exactly the kind we want in front of people planning a build.",
      project: {
        kicker: "The project",
        name: "The Mullet House, at the foothills of the Dandenong Ranges",
        deck: "A rear house extension does not have to be a slave to the original architecture of the dwelling.",
        paragraphs: [
          "The clients had a large, ageing Tudor style home on acreage, and were daunted by how to extend something so loud and proud in its styling. Most people would conclude that any addition is obliged to follow suit and buy the trimmings to match. House Design Solutions argued the opposite.",
          "The practice calls it a mullet design: business at the front, party out the back. The formal Tudor rooms stay as they are, and the rear becomes a modern, light filled, open extension. The whole bet is placed on the transition point rather than on mimicry. In the practice's own words, mimicking heritage just because you feel compelled is generally a bad idea, as it does not really serve the old or the new.",
          "That transition is where the design work is: timber lined walls and grassed areas meeting the old brickwork, with colour drawn from the original carried into the new so the two halves read as one house. The practice also advised that changes back in the existing dwelling should reference the extension, knitting old and new both ways rather than only forwards. The brief asked for a private poolside oasis, and got one.",
        ],
        hero: {
          src: "/build-brief/issue-007/mullet-rear.jpg",
          alt: "The modern rear extension of the Mullet House, by House Design Solutions.",
        },
        gallery: [
          {
            src: "/build-brief/issue-007/mullet-transition.jpg",
            alt: "The transition point where timber lined walls and lawn meet the original brickwork.",
          },
          {
            src: "/build-brief/issue-007/mullet-pool.jpg",
            alt: "The view from the new living space out to the pool.",
          },
        ],
        credit: "Images supplied by House Design Solutions.",
        facts: [
          { k: "Location", v: "Foothills of the Dandenong Ranges, VIC" },
          { k: "Type", v: "Rear extension to an existing Tudor style home" },
          { k: "Status", v: "Complete" },
          { k: "Practice", v: "House Design Solutions" },
        ],
        link: {
          label: "See the project on House Design Solutions",
          href: "https://www.housedesignsolutions.com.au/projects/mullet-house-foothills-dandenong-ranges/",
        },
      },
    },
    overToYou: {
      question: "What would you most like The Build Brief to help you understand?",
      body: "Reply with a line. The topics readers ask about most shape where we take future editions.",
    },
    faq: [
      {
        q: "When do Victoria's new deposit and progress payment rules start?",
        a: "The Domestic Building Contracts Amendment Act commences on 1 December 2026 unless proclaimed earlier, and applies only to contracts signed after it starts. The specific deposit and progress payment limits move out of the Act and into regulations. Those draft regulations were released this week with a Regulatory Impact Statement and are open for consultation, so the limits themselves are proposals rather than settled figures.",
      },
      {
        q: "When did the Fairer Payments on Jobsites Act commence in Victoria?",
        a: "Its main security of payment reforms commenced on 15 April 2026, proclaimed early in Victoria Government Gazette S 189. The Act is No. 43 of 2025 and received assent on 13 November 2025. The 1 September 2026 date in section 2(3) is the statutory backstop rather than the commencement date, and what falls to it is the registration of building surveyors and building inspectors, information statements from relevant building surveyors, and two adjudication provisions.",
      },
      {
        q: "Can a Victorian building contract have a cost escalation clause?",
        a: "From 1 December 2026, only where the contract price is $1 million or more, and the increase cannot exceed 5% of the contract price. A contract priced at exactly $1 million is permitted to carry one. This sits in the Domestic Building Contracts Amendment Act rather than in the new draft regulations.",
      },
      {
        q: "Can an owner still cancel if the price or the build time blows out?",
        a: "Yes, and the right is getting wider. An owner can end the contract if the price rises 15% or the build time extends by half, excluding prime cost items, provisional sums and owner requested variations. Today that right is limited to increases arising for unforeseeable reasons. The amendment removes that limitation, so the thresholds stay the same while the right behind them broadens.",
      },
      {
        q: "When do Victoria's minimum financial requirements for builders apply?",
        a: "They commenced on 1 July 2026. New applicants must comply immediately. Builders already registered phase in by size, from reporting years starting on or after 1 November 2027 for those with net tangible assets above $1.5 million, 1 March 2028 for $50,001 to $1.5 million, and 1 July 2028 for $1 to $50,000. 1 July 2028 is the last tier, not the start of the scheme.",
      },
      {
        q: "What does the Victorian Royal Commission into construction cover?",
        a: "The Royal Commission into the Integrity of Major Public and Civil Infrastructure Construction Projects in Victoria was appointed on 20 August 2026. Its Terms of Reference define the subject matter as major public and civil infrastructure construction projects commissioned by the State of Victoria, so residential building sits outside it. It can compel evidence. Lawful action under industrial relations and occupational health and safety law is expressly excluded. A final report is due by 20 August 2027.",
      },
      {
        q: "Did new home sales fall in Australia in July 2026?",
        a: "Yes. The Housing Industry Association recorded a 3.7% fall in July 2026, the third consecutive monthly decline. Sales in the three months to July were 13.5% lower than the previous quarter, while the trailing twelve months remained 17.1% higher than the year before. New South Wales was the only state to record a monthly increase, at 2.1%.",
      },
      {
        q: "When does the Victorian developer bond scheme apply?",
        a: "The scheme commenced on 1 July 2026, but the bond obligation is triggered by permit date: a bond is required for apartment buildings of four storeys and above where the building permit is issued on or after 1 July 2027. The bond is 2% of total build cost, and decennial insurance is legislated as an alternative instrument.",
      },
      {
        q: "Why do three builders quote different prices for the same house?",
        a: "Because there is no common format for what a quote has to answer. One builder may price an item as documented, another may carry an allowance, and a third may not mention it at all, so three honest quotes can describe three different scopes of work. Regulation of deposits and progress payments governs when money moves, not what the contract price was calculated from.",
      },
    ],
    share:
      "Victoria has released draft regulations on deposits and progress payments, and every Victorian reform date now sits on one checked timeline. This week's Build Brief.",
    subscribeLine: "Five minutes, every Friday.",
    furtherReading: [
      { label: "Issue 006: the apartments that never started", href: "/build-brief/issue-006" },
      { label: "Issue 005: demand is fine, conversion is the problem", href: "/build-brief/issue-005" },
      { label: "Issue 004: what a new house costs before it is built", href: "/build-brief/issue-004" },
      {
        label: "Perspective: Australian construction has a procurement problem",
        href: "/build-brief/perspectives/construction-procurement-standard",
      },
    ],
    sourceGroups: [
      {
        heading: "Deposits and progress payments",
        links: [
          {
            label: "HIA, Proposed new deposit and progress payment requirements for home building contracts",
            href: "https://hia.com.au/our-industry/newsroom/workplace-relations-and-legal/2026/08/proposed-new-deposit-and-progress-payment-requirements-for-home-building-contracts",
          },
          {
            label: "Victorian Government, Notice of Preparation of Regulatory Impact Statement",
            href: "https://www.vic.gov.au/notice-preparation-regulatory-impact-statement-24",
          },
          {
            label: "Domestic Building Contracts Amendment Act 2025, authorised text",
            href: "https://www.legislation.vic.gov.au/as-made/acts/domestic-building-contracts-amendment-act-2025",
          },
        ],
      },
      {
        heading: "The Royal Commission",
        links: [
          {
            label: "Victorian Government, Royal Commission into the Integrity of Major Public and Civil Infrastructure Construction Projects",
            href: "https://www.vic.gov.au/royal-commission-integrity-major-construction-projects",
          },
          {
            label: "Build Australia, Victoria targets construction sector misconduct with Royal Commission",
            href: "https://www.buildaustralia.com.au/news_article/victoria-targets-construction-sector-misconduct-with-royal-commission/",
          },
        ],
      },
      {
        heading: "New home sales",
        links: [
          {
            label: "HIA, New home sales decline for the third consecutive month",
            href: "https://hia.com.au/our-industry/newsroom/economic-research-and-forecasting/2026/08/new-home-sales-decline-for-the-third-consecutive-month",
          },
        ],
      },
      {
        heading: "The Victorian timeline",
        links: [
          {
            label: "Building Legislation Amendment (Fairer Payments on Jobsites and Other Matters) Act 2025",
            href: "https://www.legislation.vic.gov.au/as-made/acts/building-legislation-amendment-fairer-payments-jobsites-and-other-matters-act-2025",
          },
          {
            label: "Planning Victoria, Building reform",
            href: "https://www.planning.vic.gov.au/guides-and-resources/building-policy/building-reform",
          },
          {
            label: "Building and Plumbing Commission",
            href: "https://www.bpc.vic.gov.au/",
          },
        ],
      },
    ],
    creditLine:
      "This edition used data and reporting from the Victorian Government, the Victorian legislation register, the Housing Industry Association, Planning Victoria and Build Australia. The Build Brief is compiled by BuilderHQ, Melbourne.",
    sources: [
      "the Victorian Government",
      "the Victorian legislation register",
      "the Housing Industry Association",
      "Planning Victoria",
      "Build Australia",
    ],
  },
];

/** Issues newest-first for the hub and feeds. */
export function briefIssues(): BriefIssue[] {
  return [...BRIEF_ISSUES].sort((a, b) => b.date.localeCompare(a.date));
}

export function latestIssue(): BriefIssue {
  const [first] = briefIssues();
  if (!first) throw new Error("The Build Brief has no issues");
  return first;
}

export function getIssue(slug: string): BriefIssue | undefined {
  return BRIEF_ISSUES.find((i) => i.slug === slug);
}

/** Zero-padded issue number, e.g. "001". */
export function issueNo(issue: BriefIssue): string {
  return String(issue.number).padStart(3, "0");
}

/** The four audience lenses, in publication order, with their site routes. */
export const BRIEF_AUDIENCES: Array<{
  key: keyof BriefTakes;
  label: string;
  href: string;
}> = [
  { key: "owners", label: "Homeowners & developers", href: "/" },
  { key: "designers", label: "Architects & designers", href: "/for/architects" },
  { key: "builders", label: "Builders", href: "/for/builders" },
  { key: "brokers", label: "Finance brokers", href: "/for/finance-brokers" },
];

/* ── Perspectives ─────────────────────────────────────────────────────
 * Signed essays from the desk of BuilderHQ — opinion, not the weekly
 * briefing. They live beside the editions on the hub, unnumbered and
 * bylined, and render at /build-brief/perspectives/[slug].
 */

export type PerspectiveBlock =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "quote"; text: string }
  | {
      kind: "table";
      head: [string, string];
      rows: Array<{ term: string; body: string }>;
    };

export type BriefPerspective = {
  slug: string;
  /** Small caps tag row, e.g. "Opinion · Residential construction". */
  tag: string;
  /** The eyebrow above the masthead and on the hub card. Defaults to
   *  "A Founder Perspective"; editorial pieces set their own. */
  kicker?: string;
  /** Headline, minus the accent tail. */
  title: string;
  /** Trailing words of the headline, rendered in the accent colour. */
  titleAccent: string;
  /** Italic serif deck under the headline. */
  standfirst: string;
  /** The bold lede paragraph. */
  lede: string;
  author: {
    name: string;
    role: string;
    portrait?: string;
    /** schema.org author type — a named person, or the masthead itself
     *  for editorial pieces. Defaults to Person. */
    schemaType?: "Person" | "Organization";
    /** jobTitle for a Person author (e.g. "Founder"). */
    jobTitle?: string;
  };
  dateISO: string;
  displayDate: string;
  readingMins: number;
  blocks: PerspectiveBlock[];
  /** Label on the closing aside; defaults to "About the author". */
  aboutLabel?: string;
  aboutAuthor: string;
  /** Per-piece search keywords (SEO/AEO/GEO). Falls back to a general
   *  set when omitted. */
  keywords?: string[];
};

export const BRIEF_PERSPECTIVES: BriefPerspective[] = [
  {
    slug: "construction-procurement-standard",
    tag: "Opinion · Construction procurement",
    kicker: "A BuilderHQ Perspective",
    title: "Australian construction doesn't have a building problem.",
    titleAccent: "It has a procurement problem.",
    standfirst:
      "Design, engineering and delivery have all been modernised. The way Australians choose, compare and appoint a builder has not.",
    lede: "Australia's residential construction industry has spent decades improving how homes are designed and built. Architectural standards have risen, construction methods have advanced, and digital tools now touch almost every stage of a project. Yet the moment that decides who builds your home, and on what terms, has barely changed.",
    author: {
      name: "The BuilderHQ Editorial Team",
      role: "Opinion, BuilderHQ",
      schemaType: "Organization",
    },
    dateISO: "2026-07-23",
    displayDate: "23 July 2026",
    readingMins: 5,
    blocks: [
      {
        kind: "p",
        text: "Every year, Australians commit billions of dollars to building and renovating homes. For most people it is the single largest financial decision they will ever make. And still, there is no common framework for how a residential building tender is prepared, disclosed and compared.",
      },
      {
        kind: "p",
        text: "Builders present proposals in different formats. They make different assumptions, carry different allowances, and disclose their commercial terms in different ways. Owners and their architects are then left to compare documents that were never designed to line up, rather than to compare the builders behind them.",
      },
      { kind: "h2", text: "Procurement is more than getting a price" },
      {
        kind: "p",
        text: "It is easy to treat procurement as a quote-collection exercise. It is not. Procurement is how you identify risk, test assumptions and assess capability before signing a contract that is difficult and expensive to unwind.",
      },
      {
        kind: "p",
        text: "Programme commitments, exclusions, provisional sums, prime cost items and commercial qualifications all shape what a build actually costs and how it actually runs. These are the details that decide whether a project finishes on budget. Yet they are the details most often buried, inconsistent or missing at the very moment quotes are compared side by side.",
      },
      {
        kind: "quote",
        text: "Two builders can quote the same project and mean entirely different things. The price looks comparable. The offer behind it rarely is.",
      },
      { kind: "h2", text: "Australia has standardised everything except procurement" },
      {
        kind: "p",
        text: "We have well-established standards for design, engineering, compliance, safety and construction. A builder cannot pour a slab, frame a wall or connect a service without meeting a defined benchmark. Procurement, the stage that governs the largest commitment an owner makes, has no equivalent.",
      },
      {
        kind: "p",
        text: "The absence of a common procurement language is not a small inconvenience. It is why objective comparison is harder than it should be, why the lowest headline number so often wins attention it has not earned, and why disputes so frequently begin with the same four words: I thought that was included.",
      },
      {
        kind: "h2",
        text: "A standard for how tenders are presented, not how builders price",
      },
      {
        kind: "p",
        text: "BuilderHQ believes the industry would benefit from a consistent procurement framework. The proposed BuilderHQ Procurement Standard, or BPS, is a structured framework that standardises how procurement information is presented. It does not tell builders what to charge or how to build.",
      },
      {
        kind: "p",
        text: "Under BPS, a builder completes a structured submission that covers the same ground, in the same order, every time:",
      },
      {
        kind: "table",
        head: ["The submission covers", "Why it matters"],
        rows: [
          {
            term: "Eligibility and capability",
            body: "Licensing, insurance and the capacity to take the project on, established before price enters the conversation.",
          },
          {
            term: "Commercial disclosures",
            body: "The price, its basis, how long it holds and the terms that shape it, stated plainly rather than left to interpretation.",
          },
          {
            term: "Inclusions and exclusions",
            body: "A clear schedule of what the price covers and what it does not, so scope gaps surface before contract rather than during construction.",
          },
          {
            term: "Allowances",
            body: "Provisional sums and prime cost items itemised, so an owner can see how much of a price is firm and how much can still move.",
          },
          {
            term: "Programme",
            body: "Start date, build duration and the commitments behind them, so 'ready in March' is never confused with 'on site in March'.",
          },
          {
            term: "Documentation and commentary",
            body: "The builder's own context, recommendations and evidence, presented alongside the numbers rather than lost around them.",
          },
        ],
      },
      {
        kind: "p",
        text: "The result is a set of tenders an owner, architect or lender can read on a genuine like-for-like basis, and a builder whose diligence is finally visible instead of buried in a PDF.",
      },
      { kind: "h2", text: "Not another contract, and not another regulator" },
      {
        kind: "p",
        text: "BPS is not a replacement for HIA or Master Builders contracts, and it is not a new layer of regulation. It sits before contract execution, complementing the standards the industry already relies on by improving the quality and transparency of what is disclosed during procurement.",
      },
      {
        kind: "p",
        text: "A better-presented tender does not remove the need for professional judgement. It gives that judgement something consistent to work with.",
      },
      {
        kind: "quote",
        text: "Better information at the start of a project is the cheapest risk reduction available to anyone building a home.",
      },
      { kind: "h2", text: "An invitation, not a finished answer" },
      {
        kind: "p",
        text: "Meaningful reform is collaborative. BuilderHQ welcomes input from builders, architects, designers, lenders, insurers and consumer advocates, and from industry bodies including the Housing Industry Association, Master Builders Australia and state building authorities.",
      },
      {
        kind: "p",
        text: "Residential construction has continually evolved to raise quality, safety and professionalism. Procurement should evolve with it. The BuilderHQ Procurement Standard is offered not as a finished standard, but as the start of an industry conversation about how better procurement leads to better outcomes, for owners and builders alike.",
      },
    ],
    aboutLabel: "Editorial note",
    aboutAuthor:
      "BuilderHQ is developing the BuilderHQ Procurement Standard (BPS) as a structured framework for industry consultation. Builders, architects, designers, lenders, insurers and industry bodies interested in shaping future versions of the proposed framework are invited to register their interest.",
    keywords: [
      "construction procurement",
      "residential construction procurement",
      "construction procurement Australia",
      "how to compare builder quotes",
      "comparing builder quotes",
      "building tender process",
      "builder tender comparison",
      "provisional sums and prime cost items",
      "fixed price building contract",
      "HIA and MBA contracts",
      "BuilderHQ Procurement Standard",
      "building procurement standard",
      "how to choose a builder australia",
      "builderhq",
    ],
  },
  {
    slug: "choosing-a-builder-word-of-mouth",
    tag: "Opinion · Residential construction",
    title: "Why choosing a builder still comes down to",
    titleAccent: "word of mouth",
    standfirst:
      "And why Australia's construction industry needs a better procurement model.",
    lede: "Residential construction has digitised design, approvals and project delivery. Yet one of its most important decisions, selecting the right builder, is still too often made through informal networks, incomplete comparisons and limited market visibility.",
    author: {
      name: "Moe Akbulut",
      role: "Founder, BuilderHQ",
      schemaType: "Person",
      jobTitle: "Founder",
    },
    dateISO: "2026-07-14",
    displayDate: "14 July 2026",
    readingMins: 6,
    blocks: [
      {
        kind: "p",
        text: "For most Australians, building a home will be one of the largest and most consequential financial commitments they ever make. Yet the process used to select the builder responsible for delivering it has changed remarkably little.",
      },
      {
        kind: "p",
        text: "Homeowners still begin with recommendations from friends, Google searches, social media groups, display villages, or whichever builder happens to respond first. Architects and designers often draw on trusted relationships. Builders rely heavily on referrals and repeat networks to secure work.",
      },
      {
        kind: "p",
        text: "These channels are not inherently flawed. Reputation, experience and professional relationships will always matter in construction. But for a decision carrying substantial financial, contractual and emotional risk, the industry should ask a more difficult question: are they enough?",
      },
      { kind: "h2", text: "An industry built on trust, but not enough transparency" },
      {
        kind: "p",
        text: "Residential construction has become more complex. Homes are more highly specified, regulatory requirements continue to evolve, project costs are significant, and clients expect greater certainty before committing.",
      },
      {
        kind: "p",
        text: "Despite that complexity, there is still no widely adopted procurement framework that allows a homeowner to assess suitable builders against consistent criteria such as relevant experience, project type, geographic coverage, availability, financial capacity, delivery model and current workload.",
      },
      {
        kind: "p",
        text: "Instead, many owners create a shortlist from a small personal network and proceed without knowing which other builders may have been capable, available or better suited to the project. The issue is not that word of mouth produces poor builders. The issue is that it produces a narrow market view.",
      },
      {
        kind: "quote",
        text: "For a decision involving hundreds of thousands of dollars, and often millions, a narrow market view is no longer good enough.",
      },
      { kind: "h2", text: "Imagine if property were sold the same way" },
      {
        kind: "p",
        text: "When Australians decide to sell a home, they do not privately approach one or two buyers recommended by a friend and hope the market has been tested. They list the property, present structured information, and create visibility among qualified participants.",
      },
      {
        kind: "p",
        text: "Residential building projects are different. Many remain effectively invisible to the wider builder market. Capable builders may never know a suitable project exists. Homeowners may never discover them. Architects can spend significant time making individual introductions and coordinating tender participation manually.",
      },
      {
        kind: "p",
        text: "The result is not always a bad outcome. But it can reduce competition, limit choice, and make it harder to establish whether the selected builder represents the right fit and fair market value.",
      },
      { kind: "h2", text: "The real objective is not more quotes" },
      {
        kind: "p",
        text: "A better procurement model should not be measured by how many builders are asked to price a project. Sending incomplete documentation to a large group can waste time, dilute accountability, and burden builders with low-probability tendering costs.",
      },
      {
        kind: "p",
        text: "The objective should be better matching: a smaller number of appropriately qualified builders, selected because the project aligns with their experience, operating area, construction type, capacity and commercial appetite.",
      },
      {
        kind: "p",
        text: "That distinction matters. A specialist renovation builder may be well suited to a complex extension but not a multi-unit development. A high-end custom builder may deliver exceptional work but be commercially unsuitable for a straightforward project. A builder with the right portfolio may still be the wrong choice if its programme is already stretched.",
      },
      {
        kind: "p",
        text: "Procurement should identify these differences before the tender, not after the contract is signed.",
      },
      { kind: "h2", text: "What a better model should provide" },
      {
        kind: "table",
        head: ["Principle", "What it means"],
        rows: [
          {
            term: "Structured project information",
            body: "Builders should receive a consistent brief: available documentation, project status, location, budget expectations and procurement timeframe.",
          },
          {
            term: "Fit-based participation",
            body: "Tender invitations should reflect relevant capability and genuine availability, rather than broad lead distribution.",
          },
          {
            term: "Comparable submissions",
            body: "Owners and consultants should be able to assess inclusions, exclusions, programme, methodology and commercial terms on a more consistent basis.",
          },
          {
            term: "Transparent decision-making",
            body: "Price should remain important, but it should be considered alongside experience, capacity, communication, risk and project alignment.",
          },
        ],
      },
      { kind: "h2", text: "Better procurement benefits every participant" },
      {
        kind: "p",
        text: "For homeowners, the benefit is greater confidence that the market has been considered properly, and that the selected builder is suited to the project, not simply the most familiar name.",
      },
      {
        kind: "p",
        text: "For builders, it means access to opportunities that match their capability and pipeline, rather than paying for or pricing unsuitable leads with little prospect of conversion.",
      },
      {
        kind: "p",
        text: "For architects and building designers, it can reduce the administrative burden of sourcing participants, issuing information repeatedly, and managing an inconsistent tender process.",
      },
      {
        kind: "p",
        text: "For developers, lenders and consultants, earlier market engagement can produce more useful feedback on buildability, programme and cost before key decisions become difficult to reverse.",
      },
      {
        kind: "p",
        text: "Better matching at the beginning cannot remove every risk from construction. It can, however, reduce avoidable misalignment, one of the most common causes of friction once a project is underway.",
      },
      {
        kind: "quote",
        text: "The future of builder selection is not less trust. It is trust supported by better information, broader visibility and a more disciplined process.",
      },
      { kind: "h2", text: "Technology should support judgement, not replace it" },
      {
        kind: "p",
        text: "Construction is a relationship-driven industry, and it should remain one. A digital procurement model should not reduce builder selection to a price ranking or an automated score.",
      },
      {
        kind: "p",
        text: "The best outcomes still depend on professional judgement, clear communication, thorough due diligence, and trust between the client, design team and builder. Technology can strengthen that process by improving access to information, organising comparisons, and widening visibility among suitable participants.",
      },
      {
        kind: "p",
        text: "In other words, the goal is not to remove relationships from procurement. It is to ensure relationships are supported by a more complete and transparent decision-making process.",
      },
      { kind: "h2", text: "The next evolution of residential construction" },
      {
        kind: "p",
        text: "Australian construction has already transformed how homes are designed, documented, approved and managed. Procurement is the next logical area for change.",
      },
      {
        kind: "p",
        text: "Consumers now expect transparency and comparison when making major financial decisions. Residential construction should not be exempt simply because the industry has traditionally operated through informal networks.",
      },
      {
        kind: "p",
        text: "Choosing the right builder will always involve judgement. But that judgement should be informed by a genuine view of the market, structured information, and a clear understanding of project fit.",
      },
      {
        kind: "p",
        text: "Australia has transformed how property is bought and sold. It is time to apply the same expectation of visibility and informed choice to how homes are built.",
      },
    ],
    aboutAuthor:
      "Moe Akbulut is the founder of BuilderHQ, and a residential builder and developer. BuilderHQ is an Australian platform focused on improving how homeowners, architects, designers and builders connect and manage the early procurement process.",
  },
];

export function briefPerspectives(): BriefPerspective[] {
  return [...BRIEF_PERSPECTIVES].sort((a, b) =>
    b.dateISO.localeCompare(a.dateISO),
  );
}

export function getPerspective(slug: string): BriefPerspective | undefined {
  return BRIEF_PERSPECTIVES.find((p) => p.slug === slug);
}
