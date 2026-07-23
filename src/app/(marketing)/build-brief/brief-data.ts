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
  voices: {
    kicker: string;
    headline: string;
    quote: string;
    attribution: string;
    role: string;
    body: string[];
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
        text: "Meaningful reform is collaborative. BuilderHQ welcomes input from builders, architects, designers, lenders, insurers and consumer advocates, and from industry bodies including the Housing Industry Association, Master Builders Australia, the Australian Institute of Architects and state building authorities.",
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
