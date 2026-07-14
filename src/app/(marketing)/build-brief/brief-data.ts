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
  stat: { value: string; label: string; sub?: string };
  /** Small comparison rows rendered as a native chart-style list. */
  rows?: Array<{ label: string; value: string; accent?: boolean }>;
  rowsTitle?: string;
  body: string;
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
  seoDescription: string;
  keywords: string[];
  ogImage: string;
  note: {
    heading: string;
    paragraphs: string[];
    signoff: string;
  };
  signals: BriefSignal[];
  feature: {
    kicker: string;
    headline: string;
    paragraphs: string[];
    quoteDoc: {
      docTitle: string;
      docSubtitle: string;
      rows: BriefQuoteDocRow[];
      total: { label: string; amount: string };
      footnotes: string[];
      annotations: Array<{ n: string; term: string; def: string }>;
    };
    takes: BriefTakes;
  };
  project: {
    kicker: string;
    name: string;
    studio: string;
    recognition: string;
    body: string;
    pullQuote: string;
    credit: string;
    /** Outbound link to the original coverage — we do not republish
     *  third-party photography. */
    link?: { label: string; href: string };
    takes: BriefTakes;
  };
  voices: {
    kicker: string;
    headline: string;
    quote: string;
    attribution: string;
    role: string;
    body: string;
    takes: BriefTakes;
  };
  partnerCorner: {
    /** Live partner slug — the section pulls name, logo and profile
     *  link from the register. */
    partnerSlug: string;
    headline: string;
    principal: string;
    principalRole: string;
    principalQuote: string;
    portrait?: string;
    why: string;
    practice: string;
    welcome: string;
  };
  overToYou: {
    question: string;
    body: string;
  };
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
        body: "About 12,000 starts below the quarterly pace the 1.2 million-home target implies. The demand is strong; the opportunity is in turning it into homes.",
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
        body: "Detached homes are leading, while apartments and townhouses have more ground to make up. Both matter for supply near infrastructure.",
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
        body: "Costs are climbing while new lending has cooled, so it pays to plan feasibility early. New lending eased 6.2% last quarter.",
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
      body: "This year's Victorian Architecture Award winner treats landscape as part of the architecture, not a finishing layer. Privacy, outlook and light are resolved by the garden from the first sketch.",
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
      body: "HIA's Tom Devitt notes Australia needs about 240,000 homes a year, and started 197,340 in the year to March. The encouraging part is where the leverage sits: much of the gap is decided before a site even begins, in design, approval, finance and contracts.",
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
  /** Headline, minus the accent tail. */
  title: string;
  /** Trailing words of the headline, rendered in the accent colour. */
  titleAccent: string;
  /** Italic serif deck under the headline. */
  standfirst: string;
  /** The bold lede paragraph. */
  lede: string;
  author: { name: string; role: string; portrait: string };
  dateISO: string;
  displayDate: string;
  readingMins: number;
  blocks: PerspectiveBlock[];
  aboutAuthor: string;
};

export const BRIEF_PERSPECTIVES: BriefPerspective[] = [
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
      portrait: "/build-brief/perspectives/moe-akbulut.jpg",
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
