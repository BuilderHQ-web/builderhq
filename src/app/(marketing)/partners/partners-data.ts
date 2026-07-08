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
  /** Optional; omitted where the practice doesn't publish a year. */
  year?: string;
  /** Optional project image; normalised by the work-strip treatment. */
  image?: string;
}

export interface PartnerStat {
  label: string;
  value: string;
  /** Show a gold star after the value (used for a rating). */
  star?: boolean;
  /** Small line beneath the value, e.g. "8 reviews". */
  sub?: string;
}

export interface Partner {
  slug: string;
  kind: PartnerKind;
  /** Still being onboarded: hidden from the public directory and public
   *  /partners/[slug] route, but reachable via /partners/preview/[slug]
   *  for the partner to review their draft before it goes live. */
  draft?: boolean;
  name: string;
  /** Overrides the default kind label ("Architecture practice" /
   *  "Finance partner") where a partner needs a more accurate title,
   *  e.g. a building designer who is not a registered architect. */
  roleLabel?: string;
  /** Two-letter mark for the monogram tile when no portrait is supplied. */
  monogram: string;
  /** Optional portrait (principal or representative). Any lighting or
   *  background: the avatar treatment normalises it. */
  portrait?: string;
  /** Optional brand logo. Rendered clean (contained on a white tile, no
   *  grayscale/duotone) since a logo is not a photo. Takes precedence over
   *  portrait for the avatar. */
  logo?: string;
  /** The logo is light-on-dark (its own dark background): render it
   *  full-bleed on a dark tile instead of contained on white. */
  logoDark?: boolean;
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
    /** Optional; omitted where we don't have a verified founding year. */
    established?: string;
    /** Optional headline experience stat, e.g. "30+ yrs". */
    experience?: string;
    basedIn: string;
    serves: string;
    focus: string;
  };
  /** Optional signature stat unique to the partner ("Homes designed",
   *  "Projects tendered", etc). Shown in the hero band when set — the
   *  thing that distinguishes them specifically. */
  signature?: { label: string; value: string };
  /** Optional hand-authored headline stats. When set, these replace the
   *  auto-built figure band verbatim — full control for partners whose
   *  story is not a set of round numbers. */
  stats?: PartnerStat[];
  website?: string;
  /** Instagram profile. A compact icon beside the website button, or the
   *  full link when the partner has no website. */
  instagram?: string;
  /** LinkedIn page, shown as a compact icon beside the other links. */
  linkedin?: string;
  /** Where the selected-work images link to (e.g. the practice's gallery). */
  galleryUrl?: string;
  /** Architects: selected work, text-first (images optional). */
  work?: PartnerWork[];
  /** Render the work grid with elegant image placeholders while we wait on
   *  the partner's photos (so the layout previews complete, not empty). */
  workImagesPending?: boolean;
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

  /* ── Real, in review (draft) ────────────────────────────────────── */
  {
    slug: "house-design-solutions",
    kind: "architect",
    draft: true,
    roleLabel: "Building design practice",
    name: "House Design Solutions",
    monogram: "HD",
    logo: "/partners/house-design-solutions/logo.png",
    principal: "Paul A. Mete",
    suburb: "Albert Park",
    state: "VIC",
    tagline:
      "New homes, extensions and unit developments across Melbourne, designed to be built, not just drawn.",
    disciplines: ["New homes", "Extensions", "Unit developments"],
    google: { rating: 5.0, reviews: 31 },
    signature: { label: "Melbourne homes designed", value: "150+" },
    why: "Paul has spent decades designing homes across Melbourne, and it shows in how buildable his drawings are. He works the way we like: architectural thinking paired with the practicalities of construction, no sales staff, and a real focus on getting the right builder alongside the client early. He is exactly the sort of designer we are glad to introduce.",
    about:
      "House Design Solutions is Paul Mete's Albert Park practice, designing new homes, extensions and unit developments across Melbourne since 1987. A member of Design Matters, Paul works without sales staff, pairing architectural design with the realities of building so his homes are as sensible to construct as they are to live in.",
    facts: {
      established: "1987",
      experience: "30+ yrs",
      basedIn: "Albert Park, VIC",
      serves: "Melbourne and regional Victoria",
      focus: "Homes, extensions and developments",
    },
    website: "https://www.housedesignsolutions.com.au",
    galleryUrl: "https://www.housedesignsolutions.com.au/gallery/",
    work: [
      {
        title: "Templestowe",
        suburb: "Templestowe",
        type: "Duplex unit development",
        image: "/partners/house-design-solutions/templestowe.jpg",
      },
      {
        title: "Burwood",
        suburb: "Burwood",
        type: "Modern family home",
        image: "/partners/house-design-solutions/burwood.jpg",
      },
      {
        title: "Malvern",
        suburb: "Malvern",
        type: "Family home",
        year: "1980s",
        image: "/partners/house-design-solutions/malvern.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "summerhill-building-designers",
    kind: "architect",
    draft: true,
    roleLabel: "Building design practice",
    name: "Summerhill Building Designers",
    monogram: "SB",
    logo: "/partners/summerhill-building-designers/logo.png",
    logoDark: true,
    principal: "Robert",
    suburb: "Melbourne",
    state: "VIC",
    tagline:
      "Custom homes, multi-unit developments and extensions across Melbourne, with the planning and permits handled end to end.",
    disciplines: ["Custom homes", "Multi-unit developments", "Extensions"],
    google: { rating: 4.5, reviews: 8 },
    stats: [
      { label: "Google rating", value: "4.5", star: true, sub: "8 reviews" },
      { label: "Residential", value: "100%" },
      { label: "Planning & permits", value: "Handled" },
    ],
    why: "Robert and the Summerhill team take on the part of a project many owners find most daunting: the planning permits, the building requirements and the documentation that decide whether a design can actually be built. They handle it calmly and thoroughly, so clients reach construction with a resolved design and their approvals in order. That groundwork is what keeps a build on track, and the reason we are glad to introduce them.",
    about:
      "Summerhill Building Designers is a specialist residential design practice working across Melbourne. Led by Robert, the studio designs custom homes, multi-unit developments and extensions, and carries the planning and permit process from first sketch to approved documentation, so clients are not left to navigate council requirements and building regulations on their own. The focus is straightforward: considered, buildable design delivered without the usual stress.",
    facts: {
      basedIn: "Melbourne, VIC",
      serves: "Greater Melbourne",
      focus: "Homes, units and extensions",
    },
    instagram: "https://www.instagram.com/summerhillbuildingdesigners/",
    work: [
      {
        title: "Avondale Heights",
        suburb: "Avondale Heights",
        type: "Custom home",
        image: "/partners/summerhill-building-designers/avondale-heights.jpg",
      },
      {
        title: "Coburg",
        suburb: "Coburg",
        type: "Kitchen and living",
        image: "/partners/summerhill-building-designers/coburg.jpg",
      },
      {
        title: "Kensington",
        suburb: "Kensington",
        type: "Townhouse development",
        image: "/partners/summerhill-building-designers/kensington.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "xpress-building-design",
    kind: "architect",
    draft: true,
    roleLabel: "Building design practice",
    name: "Xpress Building Design",
    monogram: "XB",
    logo: "/partners/xpress-building-design/logo.png",
    suburb: "St Albans",
    state: "VIC",
    tagline:
      "Multi-unit and custom home specialists, carrying Melbourne projects from concept through town planning to working drawings.",
    disciplines: ["Custom homes", "Multi-unit developments", "Town planning"],
    google: { rating: 5.0, reviews: 142 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "142 reviews" },
      { label: "Projects designed", value: "12,000+" },
      { label: "Experience", value: "20+ yrs" },
    ],
    why: "Few practices know Melbourne's councils like Xpress. Twenty years and more than twelve thousand projects have made them specialists at taking multi-unit and custom designs through town planning cleanly, with documentation builders can actually price and build from. Owners bring them ambitious sites; they come away with approved, buildable drawings and a process that stayed calm the whole way.",
    about:
      "Xpress Building Design is a St Albans practice designing custom homes, dual occupancies and multi-unit developments across Melbourne and Victoria. A Registered Building Practitioner and member of the Building Designers Association of Victoria, the team handles the full arc in house: concept design, town planning, 3D renders and working drawings, with permit experience across more than seventeen Melbourne councils.",
    facts: {
      basedIn: "St Albans, VIC",
      serves: "Melbourne and Victoria",
      focus: "Custom homes and multi-unit developments",
    },
    website: "https://xpressbuildingdesign.com.au",
    instagram: "https://www.instagram.com/xpressbuildingdesign/",
    linkedin: "https://www.linkedin.com/company/xpress-building-design/",
    galleryUrl: "https://xpressbuildingdesign.com.au/projects/",
    work: [
      {
        title: "Box Hill",
        suburb: "Box Hill",
        type: "Custom home",
        image: "/partners/xpress-building-design/box-hill.jpg",
      },
      {
        title: "Keilor East",
        suburb: "Keilor East",
        type: "Dual occupancy",
        image: "/partners/xpress-building-design/keilor-east.jpg",
      },
      {
        title: "Reservoir",
        suburb: "Reservoir",
        type: "Multi-unit development",
        image: "/partners/xpress-building-design/reservoir.jpg",
      },
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
