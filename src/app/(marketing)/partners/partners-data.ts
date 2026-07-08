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
 * review only. Replace with real, consented partners (their own words
 * approved, per the network promise) before this page ships to
 * production. Publishing invented practices would breach the exact trust
 * this page exists to build.
 *
 * Copy rules as everywhere: no em dashes, curly apostrophes, measured
 * institutional voice.
 */

export type PartnerKind = "architect" | "finance";

export interface PartnerWork {
  title: string;
  suburb: string;
  type: string;
  year: string;
}

export interface Partner {
  slug: string;
  kind: PartnerKind;
  name: string;
  /** Two-letter mark for the monogram tile (until real logos arrive). */
  monogram: string;
  suburb: string;
  state: string;
  /** The one-line "known for" that carries the roster row. */
  tagline: string;
  /** Short discipline tags, 2–3, shown as the row's meta line. */
  disciplines: string[];
  /** The curatorial note: why BuilderHQ invited them. 2–3 sentences,
   *  written by us, in our voice. This is what no directory has. */
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
  /** Architects: selected work, text-first (photography can attach later). */
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
    suburb: "Brunswick",
    state: "VIC",
    tagline:
      "Considered new builds and rear extensions that make narrow Melbourne blocks live large.",
    disciplines: ["New builds", "Extensions"],
    why: "We invited Fold after walking through two of their finished projects with the owners who commissioned them. The documentation is meticulous, the builders they work with speak well of them, and their clients would hire them again tomorrow. That combination is rarer than it should be.",
    about:
      "Fold is a four-person studio in Brunswick working almost entirely in residential. Their drawings are known among builders for being priced without a single request for information, which keeps tenders tight and honest.",
    facts: {
      established: "2016",
      basedIn: "Brunswick, VIC",
      serves: "Melbourne inner north and west",
      focus: "New builds and rear extensions",
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
    suburb: "Carlton North",
    state: "VIC",
    tagline:
      "Heritage terraces and period homes, renovated with restraint and respect for what is already there.",
    disciplines: ["Renovations", "Heritage"],
    why: "Heritage work punishes shortcuts, and Harlow & Maye take none. Their council approval record across Yarra and Merri-bek is exceptional, and every builder we spoke with described their contract documentation as the standard others should meet.",
    about:
      "A partnership of two registered architects working on Victorian and Edwardian housing stock across the inner north. Most of their work arrives by referral from past clients, which says more than any award.",
    facts: {
      established: "2012",
      basedIn: "Carlton North, VIC",
      serves: "Melbourne inner suburbs",
      focus: "Heritage renovation and restoration",
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
    suburb: "Kingston",
    state: "ACT",
    tagline:
      "Courtyard homes and considered multi-dwelling projects across Canberra's established suburbs.",
    disciplines: ["Multi-dwelling", "New builds"],
    why: "Canberra's planning environment rewards architects who know it deeply, and Studio Ellara do. Their dual-occupancy work balances yield with genuine liveability, and the builders who price their projects tell us the drawings answer questions before they are asked.",
    about:
      "Studio Ellara is a Kingston-based practice focused on infill housing done properly: courtyard homes, dual occupancies and small multi-dwelling projects that sit quietly in their streets.",
    facts: {
      established: "2018",
      basedIn: "Kingston, ACT",
      serves: "Canberra and Queanbeyan",
      focus: "Multi-dwelling and courtyard homes",
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
    suburb: "Hawthorn",
    state: "VIC",
    tagline:
      "Construction finance specialists who structure the loan around the build, not the other way round.",
    disciplines: ["Construction loans", "Owner-builder finance"],
    why: "Construction lending is its own discipline, and Keystone treat it that way. They understand progress payments, land-and-build structures and what happens when a build runs long, and their clients told us they explain every step before it arrives.",
    about:
      "Keystone is a Hawthorn brokerage working almost entirely in residential construction finance: new builds, knock-down rebuilds and major renovations, from first homes to multi-dwelling projects.",
    facts: {
      established: "2014",
      basedIn: "Hawthorn, VIC",
      serves: "Victoria",
      focus: "Construction and renovation finance",
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
    suburb: "Belconnen",
    state: "ACT",
    tagline:
      "Plain-spoken lending advice for Canberra families planning their first build or their next one.",
    disciplines: ["Construction loans", "First-build finance"],
    why: "Marlow earned their invitation the slow way: client after client describing the same experience of straight answers, realistic numbers and a broker who picked up the phone mid-build. That is exactly who we want beside a homeowner at the start.",
    about:
      "A small Belconnen team led by its founding broker, working with owner-occupiers across the ACT on construction loans, borrowing capacity and the sequencing of land, build and settlement.",
    facts: {
      established: "2019",
      basedIn: "Belconnen, ACT",
      serves: "ACT and surrounds",
      focus: "Owner-occupier construction finance",
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

export const ARCHITECT_PARTNERS = PARTNERS.filter((p) => p.kind === "architect");
export const FINANCE_PARTNERS = PARTNERS.filter((p) => p.kind === "finance");

export function getPartner(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug);
}
