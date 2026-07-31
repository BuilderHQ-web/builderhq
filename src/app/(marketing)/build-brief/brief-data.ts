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
  source: string;
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
    /** Closing block: what the Standard is, plainly. */
    definition?: { heading: string; paragraphs: string[] };
    pullQuote?: string;
    source?: string;
    takes?: BriefTakes;
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
      "The average new house is declared at $517,430 before land, and the industry raises its own bar.",
    standfirst:
      "The average new Australian house was declared at $517,430 of building work at permit stage last financial year, before land. Inflation eased enough to take an August rate rise off the table. And the scaffolding industry set a standard above the legal floor.",
    seoTitle:
      "The Build Brief 004: What a New House Costs Before It Is Built | BuilderHQ",
    seoDescription:
      "The average new Australian house was declared at $517,430 of building work at permit stage in 2025-26, up 5.0%, before land. Inflation eased to 3.8% and an August rate rise moved off the table. The scaffolding industry recommended fortnightly inspections against a 30-day legal minimum. Plus the Productivity Commission on housing regulation.",
    keywords: [
      "cost to build a house australia 2026",
      "average build cost new house australia",
      "average house approval value australia",
      "how much does it cost to build a house in australia",
      "cpi june 2026 australia",
      "rba august 2026 rate decision",
      "trimmed mean inflation australia",
      "new dwelling prices australia",
      "scaffolding inspection requirements australia",
      "scaffold inspection 14 days",
      "scaffolding association australia guidelines",
      "productivity commission housing supply regulation",
      "upzoning australia",
      "building approvals 2025-26",
      "housing approvals australia financial year",
      "builderhq procurement standard",
      "comparing builder quotes australia",
    ],
    ogImage: "/build-brief/og-issue-004.jpg",
    note: {
      eyebrow: "This week from the BuilderHQ team",
      heading:
        "The industry raised its own bar. A federal review asked government to lower theirs.",
      paragraphs: [
        "Three numbers landed this week. Between them they describe what it now costs to build a house, what money costs while you do it, and the standard the industry has decided to hold itself to.",
        "The Australian Bureau of Statistics closed out the financial year on Thursday. The average new house was declared at $517,430 of building work at permit stage, before land, up 5.0% on the year. On Wednesday, inflation eased enough that a rate rise on 11 August moved close to off the table. And the scaffolding industry published national guidance recommending inspections every fourteen days, against a legal minimum of thirty.",
        "Set that last one beside Monday's news. The Productivity Commission released its interim report on housing supply regulation and found that regulation has become a handbrake on new homes.",
        "Both things are true at once, and the pairing is worth noticing. An industry association tightened a standard on itself, voluntarily, because a scaffold is a temporary structure that changes as trades and weather move around it. In the same week, a federal review argued that the rules governing where and what you can build are slowing homes from being built at all.",
        "Good regulation and too much regulation are not the same conversation. This edition covers both. If The Build Brief is new to you, [last week's edition](/build-brief/issue-003) covered the construction cost restart and the turn in insolvencies.",
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
          "Inside Thursday's approvals release sits a figure that rarely makes headlines and tells you more than most. Across 2025-26, the average approval value for a new private house was $517,430, up 5.0% on the $492,931 average the year before. June alone averaged $529,790.",
          "It helps to know exactly what that number is. When a building permit is issued, the cost of the building work is declared, and the ABS collects that declaration from every permit in the country. So this is the cost of construction at the point of approval. It excludes land. It is not an index and not a forecast.",
          "Two qualifications matter. Declared values at permit stage tend to sit low, because variations, upgrades and site costs land later, so the real average is almost certainly higher. And because the method does not change from year to year, the 5.0% movement is the more reliable signal.",
          "Wednesday's inflation data points the same way from a different direction. New dwelling prices rose 5.8% over the year to June, up from 5.6% to May, with the ABS noting that project home builders have been passing through higher labour and materials costs. Two independent measures, both near 5%, both edging up.",
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
          "Annual inflation eased to 3.8% in the year to June, down from 4.0% to May. The CPI fell 0.1% in the month itself, helped by automotive fuel dropping 10.9% as oil markets steadied.",
          "The market moved immediately. Financial markets cut the probability of a rise at the 10 to 11 August meeting to close to zero, and Westpac shifted to a hold, leaving all four major banks expecting no change. The cash rate stays at 4.35%.",
          "The caution sits in the second line on the chart. The trimmed mean, the measure the Reserve Bank watches most closely, held at 3.6% and remains above the 2 to 3 per cent target band. Underlying price pressure has not eased in the way the headline suggests.",
          "Housing was again the largest contributor to annual inflation at 6.8%, driven mainly by electricity, up 22.4% after Commonwealth and state rebates expired. For anyone building or holding a construction facility, a hold is welcome. It is not the same as relief.",
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
        kicker: "Site Standard",
        headline: "An industry set its own bar above",
        headlineAccent: "the legal floor.",
        stat: {
          value: "14 days",
          label: "recommended interval between scaffold inspections",
          sub: "legal minimum is 30 days",
        },
        chart: {
          kind: "strip",
          title: "The scaffold lifecycle under the new guidance",
          desc: "The guidance covers scaffolding from planning and design through erection, handover, use and dismantling. Inspections are recommended at least every fourteen days, and again after any alteration or severe weather, against a legal minimum of thirty days for scaffolds with a fall risk over four metres.",
          stages: [
            { label: "Plan" },
            { label: "Design" },
            { label: "Erect" },
            { label: "Handover" },
            { label: "Inspect every 14 days", accent: true },
            { label: "Reinspect after alteration or weather", accent: true },
            { label: "Dismantle" },
          ],
          callout: {
            from: 4,
            to: 5,
            label: "Recommended: every 14 days",
            sub: "Legal minimum: every 30 days",
          },
          legend: {
            accent: "Inspection points",
            context: "Lifecycle stages",
          },
        },
        body: [
          "The Scaffolding Association Australia has released national best practice guidance covering the full lifecycle of scaffolding work, from planning and design through erection, use, inspection, alteration and dismantling. It is offered as a common reference for scaffold contractors, builders, principal contractors, engineers, designers, supervisors and safety professionals, and it is free to download.",
          "The most practical change is the inspection interval. Current requirements generally call for scaffolds with a fall risk of more than four metres to be inspected at least every thirty days. The new guidance recommends at least every fourteen days, in addition to inspections before first use, after any alteration, and after severe weather or any other event capable of affecting structural integrity.",
          "The guidance also expands on scaffold design and documentation, an area the industry has long flagged as needing clearer national direction, covering design responsibilities, engineering requirements and design risk categories. It is the first stage of a wider technical programme.",
          "One point to be clear about. This is not law. The guidelines complement work health and safety legislation, codes of practice and Australian Standards rather than replacing them, and model WHS laws are adopted jurisdiction by jurisdiction, so requirements vary. What has happened is that an industry body has voluntarily set a bar above the legal floor, for a temporary structure that changes as trades, materials and weather move around it.",
        ],
        source:
          "Scaffolding Association Australia, Australian Best Practice Guidelines for Scaffolding, reported by Build Australia, 30 July 2026; Safe Work Australia, Guide to Scaffold Inspection and Maintenance",
        takes: {
          owners:
            "Ask who accepted the scaffold at handover, who controls alterations, and where the inspection records are kept.",
          designers:
            "Facade geometry, boundary conditions, roof form and access decisions all affect the complexity and price of temporary works.",
          builders:
            "A useful prompt to review the scaffold register, the alteration procedure and the post-weather inspection process, so a scaffold never quietly becomes a shared structure nobody manages.",
          brokers:
            "Safety incidents, shutdowns and access problems become programme problems, and programme problems become drawdown problems.",
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
        "The Productivity Commission released the interim report of its housing supply regulation inquiry on Monday, and its central finding is direct: regulation has become a handbrake on new housing supply.",
        "The framing deserves care, because the Commission is not arguing against regulation. It accepts that rules are necessary for the safety, quality and liveability of new housing. Its argument is that too much regulation, or poorly designed regulation, stops homes being built, makes projects slower and more expensive, and narrows the range of housing available.",
        "The affordability figure sets the context. It now takes the average household around eleven years to save a 20% deposit on a typical home, up from eight years in 2005.",
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
            "**Land-use controls.** The Commission finds that relaxing these would have the greatest effect on housing supply of any reform direction it examined. It raises broad-based upzoning in cities, including allowing three-storey development on most residential land, reducing minimum lot sizes, enabling more mixed residential and commercial areas, and allowing more mid-rise and high-rise apartments in high-demand, well-serviced locations. Commissioner Alison Roberts put the everyday version plainly: the rules that stop someone adding a granny flat in the garden, or replacing a single home with townhouses, sit at the core of the problem.",
            "**Infrastructure coordination.** Roads, utilities and sewerage connections are usually needed before homes can be built, particularly in greenfield areas. Where housing plans and infrastructure plans are not aligned, land that has been rezoned for housing can sit unused for years. The report calls for infrastructure plans to show how they will be funded and sequenced alongside land release, and for greater consistency between levels of government, councils and utility providers.",
            "**Approval processes.** Approvals often involve multiple decision-makers across different levels of government, referral agencies and infrastructure providers, and poor coordination between them can add months or years to a project. The Commission heard from one developer that preparing reports and waiting for approvals had added more than three years to the timeline of a 1,600 lot development in Melbourne's growth corridor. The report points to fast-track pathways for simple developments, state-led assessment where appropriate, coordination bodies with power to resolve disputes, better technology, and transparent reporting of approval outcomes.",
          ],
        },
        {
          heading: "What it is, and what it is not",
          paragraphs: [
            "This is an interim report and it makes no recommendations. It sets out reform directions and asks for evidence. Submissions are open until Wednesday 30 September 2026, and the final report is due to government in March 2027.",
            "The Housing Industry Association has welcomed it, noting that planning systems, approval delays and infrastructure constraints are among the most significant barriers to increasing housing supply across Australia.",
            "Read it beside this week's other numbers and a pattern appears. Thursday's approvals release closed out the financial year at 205,249 dwellings, up 9.2% and the highest total since 2020-21, with multi-unit approvals at their strongest since 2017-18. On Master Builders Australia's assessment, the country still finished 47,750 homes short of what was needed, a second consecutive year behind the National Housing Accord pace.",
            "So permission is running at a five-year high and delivery is still behind. Building costs rose 5% over the year, underlying inflation sits above target, and the path from approval to completed home is where the system loses years.",
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
        "Every week this publication reports what building costs. It is the number owners ask about first and the one the market measures most carefully. But a national average cannot tell an owner whether the three quotes on their kitchen table describe the same house.",
        "Usually they do not. One carries an allowance for joinery, one prices it firm, one is silent. One excludes the driveway in a line on page nine. One assumes a soil classification the report does not support. Each quote is honest. None of them is comparable, and the differences are not visible until they surface later as a variation.",
        "That is not a failure of builders. It is a failure of format. Australian residential tendering has no common structure, so every builder is asked to invent one, and the person least equipped to reconcile them is the homeowner reading them.",
        "We wanted to know how wide the problem really is, so we measured it. We put real Australian document sets through our analysis, packages from actual projects, spanning everything from a single architectural set to twelve documents including structural, civil, geotechnical, energy, survey and joinery. We then checked which parts of a build the documents actually settle.",
        "The pattern was consistent, and it was not about how many documents a project had. In every package we tested, the same areas were left open: site preliminaries, painting, landscaping, and the connection of services. These are not exotic items. They are ordinary trades on every job, and they are the ones most often absent from the drawings a builder is asked to price from.",
        "That is the gap a builder fills with judgement, and judgement is exactly what an owner cannot compare across three quotes.",
      ],
      principles: [
        {
          n: "01",
          title: "One scope, read from the documents",
          body: "Before a project goes to builders, the documents are read against a fixed schedule of the work a home requires. Every line is either evidenced in the drawings, with the page it came from, or recorded as a gap. Nothing is assumed and nothing is measured off a drawing.",
        },
        {
          n: "02",
          title: "The gaps are settled before pricing, not after",
          body: "Where the documents are silent, the question is asked once, of the client, before the round opens. An allowance is set and every builder carries the same figure. The alternative is that each builder guesses privately and the difference appears as a variation.",
        },
        {
          n: "03",
          title: "Every tender answers the same lines",
          body: "Builders price against the same schedule, stating for each line whether it is included as documented, carried as an allowance at a stated figure, excluded, or not applicable to the project. A quote stops being a document to interpret and becomes a set of answers to the same questions.",
        },
        {
          n: "04",
          title: "The comparison shows its working",
          body: "Where builders disagree on a line, that disagreement is visible rather than buried. Every figure in the analysis carries the disclosure it came from, so an owner or architect can defend any part of it, and a builder can read their own evaluation without being ambushed by it.",
        },
      ],
      definition: {
        heading: "What the Standard is",
        paragraphs: [
          "The BuilderHQ Procurement Standard is a common format for residential tendering: one scope of works read from the project's own documents, one set of questions every builder answers, and one comparison that shows its working.",
          "It is built to be fair in both directions. A builder who prices carefully and discloses honestly should not lose to a cheaper quote that is quieter about what it leaves out. An owner should not need to be a quantity surveyor to see the difference.",
          "We are building it now, tested against real Australian project documents. It has not been released. We will say more in the coming weeks, and [our Perspective on procurement](/build-brief/perspectives/construction-procurement-standard) sets out the argument in full.",
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
      why: "Fletcher Thompson sits between two worlds, and that is exactly why we introduce him. A degree in architecture on one side, registration as both a residential and a commercial builder on the other: design vision and precise execution in the same pair of hands. His practice runs on the belief that construction is the continuation of architecture, protecting the architect's intent through rigorous on-site delivery, with fifteen years behind it. The current book says plenty, from the completed Malvern Residence to commercial work for Programa and Curve Cycling Melbourne. For an owner taking on an architecturally ambitious home, this is a builder who speaks the architect's language fluently and builds it faithfully.",
      practice:
        "de Lune Construction is a Hawthorn based building company founded and led by Fletcher Thompson. The team specialises in complex architectural builds across Melbourne, working closely with clients, architects and consultants from concept to completion, with an approach built on clear communication, detailed planning and inventive problem solving. Its portfolio spans residential projects including the Malvern and Nicholson residences alongside commercial work such as Programa HQ and Curve Cycling Melbourne.",
      welcome:
        "We are glad to have de Lune Construction in the BuilderHQ network. A builder who reads drawings the way an architect wrote them is exactly the kind of practice this platform exists to put in front of the right projects.",
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
        q: "How often should scaffolding be inspected in Australia?",
        a: "Current requirements generally call for scaffolds with a fall risk of more than four metres to be inspected at least every thirty days. In July 2026 the Scaffolding Association Australia published national best practice guidance recommending inspections at least every fourteen days, in addition to inspections before first use, after any alteration, and after severe weather. The guidance is industry best practice rather than law, and it complements work health and safety legislation, codes of practice and Australian Standards rather than replacing them.",
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
      "The average new Australian house was declared at $517,430 before land last financial year, and the scaffolding industry set a standard above the law. This week's Build Brief.",
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
        heading: "Scaffolding standards",
        links: [
          {
            label:
              "Build Australia, Australian Best Practice Guidelines for Scaffolding now available",
            href: "https://www.buildaustralia.com.au/news_article/australian-best-practice-guidelines-for-scaffolding-now-available/",
          },
          {
            label: "Scaffolding Association Australia",
            href: "https://scaffolding-association.au/",
          },
          {
            label: "Safe Work Australia, Guide to Scaffold Inspection and Maintenance",
            href: "https://www.safeworkaustralia.gov.au/system/files/documents/1703/guide-scaffold-inspection-maintenance.pdf",
          },
          {
            label: "WorkSafe Victoria, Scaffolding industry standard",
            href: "https://www.worksafe.vic.gov.au/resources/scaffolding-industry-standard",
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
      "This edition used data and reporting from the Australian Bureau of Statistics, the Productivity Commission, the Scaffolding Association Australia, Safe Work Australia, Master Builders Australia, the Housing Industry Association and Build Australia. The Build Brief is compiled by BuilderHQ, Melbourne.",
    sources: [
      "the Australian Bureau of Statistics",
      "the Productivity Commission",
      "the Scaffolding Association Australia",
      "Safe Work Australia",
      "Master Builders Australia",
      "the Housing Industry Association",
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
        text: "BuilderHQ believes the industry would benefit from a consistent procurement framework. The proposed BuilderHQ Procurement Standard, or BPS, is an open framework that standardises how procurement information is presented. It does not tell builders what to charge or how to build.",
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
      "BuilderHQ is developing the BuilderHQ Procurement Standard (BPS) as an open framework for industry consultation. Builders, architects, designers, lenders, insurers and industry bodies interested in shaping future versions of the proposed framework are invited to register their interest.",
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
