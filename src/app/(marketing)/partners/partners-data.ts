/**
 * Preferred Partner register — typed content layer.
 *
 * The network is concierge-run: every partner is personally invited and
 * onboarded by hand, so at this stage the register lives as reviewed,
 * versioned content rather than a database table. When volume justifies
 * it, this shape lifts straight into a `partners` module (the fields map
 * 1:1 onto columns) without touching the pages.
 *
 * ⚠️ SAMPLE CONTENT — every entry below is illustrative, for design and
 * review only. Names, quotes, ratings and imagery must be replaced with
 * real, consented data (approved by the partner, ratings pulled from
 * Google or verified) before this ships. Publishing invented practices,
 * or unverified ratings, would breach the exact trust this page builds.
 *
 * Imagery note: `portrait` and `work[].image` can be any source photo.
 * The <PartnerAvatar> / work treatment normalises them (grayscale + a
 * role-hued duotone + a fixed frame) so mismatched inputs still read as
 * one controlled system. Leave a field undefined and the elegant
 * monogram / text fallback renders instead — the page never looks broken.
 *
 * Copy rules as everywhere: no em dashes, curly apostrophes, measured and
 * warm. Selective without sounding exclusionary: we vouch for people, we
 * do not audition them.
 */

export type PartnerKind = "architect" | "finance";

export interface PartnerWork {
  title: string;
  suburb: string;
  type: string;
  year: string;
  /** Optional project image; normalised by the work-strip treatment. */
  image?: string;
}

export interface Partner {
  slug: string;
  kind: PartnerKind;
  /** Still being onboarded: hidden from the public directory and public
   *  /partners/[slug] route, but reachable via /partners/preview/[slug]
   *  for the partner to review their draft before it goes live. */
  draft?: boolean;
  name: string;
  /** Two-letter mark for the monogram tile when no portrait is supplied. */
  monogram: string;
  /** Optional portrait (principal or representative). Any lighting or
   *  background: the avatar treatment normalises it. */
  portrait?: string;
  /** The person the portrait shows, credited quietly for trust. */
  principal?: string;
  suburb: string;
  state: string;
  /** The one-line "known for" that carries the roster row. */
  tagline: string;
  /** Short discipline tags, 2–3, shown as the row's meta line. */
  disciplines: string[];
  /** Optional verified Google rating, shown as a confident stat. */
  google?: { rating: number; reviews: number };
  /** The curatorial note: why we introduce them, in our voice. This is
   *  the thing no directory can write. Warm and specific, never superior. */
  why: string;
  /** One short paragraph about the practice, in plainer terms. */
  about: string;
  facts: {
    established: string;
    basedIn: string;
    serves: string;
    focus: string;
  };
  website?: string;
  /** Architects: selected work, text-first (images optional). */
  work?: PartnerWork[];
  /** Finance partners: where they actually help. */
  services?: string[];
  /** Year they joined the network. */
  joined: string;
}

export const PARTNERS: Partner[] = [
  /* ── Architecture practices ─────────────────────────────────────── */
  {
    slug: "fold-architecture",
    kind: "architect",
    name: "Fold Architecture",
    monogram: "FA",
    principal: "Nina Kraus",
    suburb: "Brunswick",
    state: "VIC",
    tagline:
      "Considered new builds and rear extensions that make narrow Melbourne blocks live large.",
    disciplines: ["New builds", "Extensions"],
    google: { rating: 4.9, reviews: 38 },
    why: "We got to know Fold through two of their finished homes, walking each one with the owners who commissioned it. What stayed with us was the care in the detail and how warmly their clients spoke about the whole process. They are exactly the kind of practice we are glad to introduce.",
    about:
      "Fold is a four-person studio in Brunswick working almost entirely in residential. Their drawings are known among builders for being priced without a single request for information, which keeps tenders tight and honest.",
    facts: {
      established: "2016",
      basedIn: "Brunswick, VIC",
      serves: "Melbourne inner north and west",
      focus: "New builds and extensions",
    },
    website: "https://example.com",
    work: [
      { title: "Corten Courtyard House", suburb: "Coburg", type: "New build", year: "2025" },
      { title: "Laneway Extension", suburb: "Brunswick East", type: "Extension", year: "2024" },
      { title: "Twin Gable House", suburb: "Pascoe Vale", type: "New build", year: "2023" },
    ],
    joined: "2026",
  },
  {
    slug: "harlow-maye",
    kind: "architect",
    name: "Harlow & Maye",
    monogram: "HM",
    principal: "James Harlow",
    suburb: "Carlton North",
    state: "VIC",
    tagline:
      "Heritage terraces and period homes, renovated with restraint and respect for what is already there.",
    disciplines: ["Renovations", "Heritage"],
    google: { rating: 5.0, reviews: 26 },
    why: "Heritage work rewards patience, and Harlow & Maye bring it in spades. Their approvals across the inner north are handled with real craft, and the builders who price their projects tell us the documentation is a pleasure to work from. We are proud to have them in the network.",
    about:
      "A partnership of two registered architects working on Victorian and Edwardian housing stock across the inner north. Most of their work arrives by referral from past clients, which tells you plenty.",
    facts: {
      established: "2012",
      basedIn: "Carlton North, VIC",
      serves: "Melbourne inner suburbs",
      focus: "Heritage renovation",
    },
    website: "https://example.com",
    work: [
      { title: "Rathdowne Street Terrace", suburb: "Carlton North", type: "Renovation", year: "2025" },
      { title: "Double-fronted Victorian", suburb: "Fitzroy North", type: "Renovation", year: "2024" },
      { title: "Edwardian Return Verandah", suburb: "Northcote", type: "Restoration", year: "2024" },
    ],
    joined: "2026",
  },
  {
    slug: "studio-ellara",
    kind: "architect",
    name: "Studio Ellara",
    monogram: "SE",
    principal: "Priya Anand",
    suburb: "Kingston",
    state: "ACT",
    tagline:
      "Courtyard homes and considered multi-dwelling projects across Canberra's established suburbs.",
    disciplines: ["Multi-dwelling", "New builds"],
    google: { rating: 4.8, reviews: 19 },
    why: "Studio Ellara know Canberra's streets and its planning rules intimately, and it shows in how naturally their infill homes sit where they are built. Their clients and their builders both speak highly of them, which is the surest sign we look for.",
    about:
      "Studio Ellara is a Kingston-based practice focused on infill housing done properly: courtyard homes, dual occupancies and small multi-dwelling projects that sit quietly in their streets.",
    facts: {
      established: "2018",
      basedIn: "Kingston, ACT",
      serves: "Canberra and Queanbeyan",
      focus: "Multi-dwelling homes",
    },
    website: "https://example.com",
    work: [
      { title: "Griffith Dual Occupancy", suburb: "Griffith", type: "Multi-dwelling", year: "2025" },
      { title: "Garden Courtyard House", suburb: "Narrabundah", type: "New build", year: "2024" },
      { title: "Deakin Pair", suburb: "Deakin", type: "Multi-dwelling", year: "2023" },
    ],
    joined: "2026",
  },

  /* ── Finance partners ───────────────────────────────────────────── */
  {
    slug: "keystone-lending",
    kind: "finance",
    name: "Keystone Lending Group",
    monogram: "KL",
    principal: "Daniel Rossi",
    suburb: "Hawthorn",
    state: "VIC",
    tagline:
      "Construction finance specialists who structure the loan around the build, not the other way round.",
    disciplines: ["Construction loans", "Owner-builder finance"],
    google: { rating: 4.9, reviews: 84 },
    why: "Construction finance has its own rhythm, and Keystone guide people through it with real generosity, explaining each step before it arrives. Their clients told us they felt looked after from the first call, and that is who we want beside a homeowner starting a build.",
    about:
      "Keystone is a Hawthorn brokerage working almost entirely in residential construction finance: new builds, knock-down rebuilds and major renovations, from first homes to multi-dwelling projects.",
    facts: {
      established: "2014",
      basedIn: "Hawthorn, VIC",
      serves: "Victoria",
      focus: "Construction finance",
    },
    website: "https://example.com",
    services: [
      "Construction loans with staged drawdowns",
      "Land and build packages",
      "Renovation and extension finance",
      "Refinancing to fund a build",
    ],
    joined: "2026",
  },
  {
    slug: "marlow-finance",
    kind: "finance",
    name: "Marlow Finance Co",
    monogram: "MF",
    principal: "Sarah Marlow",
    suburb: "Belconnen",
    state: "ACT",
    tagline:
      "Plain-spoken lending advice for Canberra families planning their first build or their next one.",
    disciplines: ["Construction loans", "First-build finance"],
    google: { rating: 5.0, reviews: 41 },
    why: "Marlow earned their place the best possible way: through clients who kept describing the same experience of straight answers, realistic numbers and a broker who stayed reachable through the whole build. We were glad to make the call and invite them in.",
    about:
      "A small Belconnen team led by its founding broker, working with owner-occupiers across the ACT on construction loans, borrowing capacity and the sequencing of land, build and settlement.",
    facts: {
      established: "2019",
      basedIn: "Belconnen, ACT",
      serves: "ACT and surrounds",
      focus: "Owner-occupier finance",
    },
    website: "https://example.com",
    services: [
      "First-build borrowing strategy",
      "Construction loans and progress payments",
      "Bridging and settlement sequencing",
      "Pre-approval before you tender",
    ],
    joined: "2026",
  },
];

// Public listings exclude drafts (partners still under review).
export const ARCHITECT_PARTNERS = PARTNERS.filter(
  (p) => p.kind === "architect" && !p.draft,
);
export const FINANCE_PARTNERS = PARTNERS.filter(
  (p) => p.kind === "finance" && !p.draft,
);

export function getPartner(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug);
}
