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
  /** The institution an individual partner works with (e.g. a bank staff
   *  lending specialist). Rendered as a credential strip under the
   *  identity band — the affiliation is the credibility. `logo` shows the
   *  institution's own brand mark in place of the generic bank icon. */
  institution?: { name: string; role?: string; note?: string; logo?: string };
  /** Overrides the about-section label ("The practice" / "The business"),
   *  e.g. "About Ayse" for an individual. */
  aboutLabel?: string;
  /** Overrides the services-section label ("Where they help"). */
  servicesLabel?: string;
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
  /** Industry recognition, rendered as a gold plaque strip under the
   *  identity band. Lead with the biggest honour; keep to three. */
  awards?: { label: string; sub?: string }[];
  website?: string;
  /** Instagram profile. A compact icon beside the website button, or the
   *  full link when the partner has no website. */
  instagram?: string;
  /** Facebook page, shown as a compact icon beside the other links. */
  facebook?: string;
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
  {
    slug: "evoka-studio",
    kind: "architect",
    draft: true,
    roleLabel: "Building design practice",
    name: "Evoka Studio",
    monogram: "ES",
    logo: "/partners/evoka-studio/logo.png",
    logoDark: true,
    principal: "Anthony Camuglia",
    suburb: "Niddrie",
    state: "VIC",
    tagline:
      "New homes, renovations and townhouse developments across Melbourne, carried from feasibility to construction documentation with care.",
    disciplines: ["New builds", "Renovations", "Townhouse developments"],
    google: { rating: 4.9, reviews: 17 },
    stats: [
      { label: "Google rating", value: "4.9", star: true, sub: "17 reviews" },
      { label: "Experience", value: "10+ yrs" },
      { label: "Concept to documentation", value: "In house" },
    ],
    why: "Anthony brings ten years of residential design and delivery to every Evoka project, and it shows in where he starts: feasibility first, so owners know what a site can carry before the design begins. From there the studio keeps concept, town planning, interiors and documentation under one roof, and the result is drawings that price cleanly and build the way they were drawn.",
    about:
      "Evoka Studio is a Niddrie practice founded by Anthony Camuglia, designing new homes, renovations and townhouse developments across Melbourne. The studio works end to end, from feasibility analysis and schematic design through town planning, interior design and construction documentation, coordinating the engineers and surveyors a project needs along the way.",
    facts: {
      basedIn: "Niddrie, VIC",
      serves: "Melbourne",
      focus: "New builds, renovations and townhouses",
    },
    website: "https://www.evokastudio.com.au",
    instagram: "https://www.instagram.com/evokastudio/",
    linkedin: "https://www.linkedin.com/company/evoka-studio/",
    galleryUrl: "https://www.evokastudio.com.au/projects",
    work: [
      {
        title: "Pascoe Vale",
        suburb: "Pascoe Vale",
        type: "New home",
        image: "/partners/evoka-studio/pascoe-vale.jpg",
      },
      {
        title: "Richmond",
        suburb: "Richmond",
        type: "Rear extension",
        image: "/partners/evoka-studio/richmond.jpg",
      },
      {
        title: "Lalor",
        suburb: "Lalor",
        type: "Townhouse development",
        image: "/partners/evoka-studio/lalor.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "silverpoint-design-and-planning",
    kind: "architect",
    draft: true,
    roleLabel: "Building design and planning practice",
    name: "Silverpoint Design and Planning",
    monogram: "SP",
    logo: "/partners/silverpoint-design-and-planning/logo.png",
    suburb: "Camberwell",
    state: "VIC",
    tagline:
      "Building design and town planning under one roof, shaping Melbourne projects for council approval from the first sketch.",
    disciplines: ["Building design", "Town planning", "Dual occupancy"],
    google: { rating: 4.9, reviews: 72 },
    stats: [
      { label: "Google rating", value: "4.9", star: true, sub: "72 reviews" },
      { label: "Projects completed", value: "1,800+" },
      { label: "Experience", value: "40+ yrs" },
    ],
    why: "Forty years of design and town planning have taught Silverpoint what Melbourne councils will approve, and they put that knowledge to work before a line is drawn. With design and planning under the one roof, schemes are shaped for approval from the start rather than negotiated after the fact. Accredited with HIA, Master Builders Victoria and the BPC, they are the steady hand we want on a complex site.",
    about:
      "Silverpoint is a Camberwell practice pairing building design with town planning consultancy, working across Melbourne for more than forty years. The team designs new homes, extensions, dual occupancies and multi-unit developments, and carries the planning side end to end: applications, subdivision and council negotiation. With HIA, Master Builders Victoria and BPC accreditation, and more than 1,800 projects completed, few practices know the approval process better.",
    facts: {
      basedIn: "Camberwell, VIC",
      serves: "Melbourne and surrounds",
      focus: "Design, planning and dual occupancy",
    },
    website: "https://www.silverpointdesignandplanning.com.au",
    instagram: "https://www.instagram.com/silverpoint_buildingdesigners/",
    facebook: "https://www.facebook.com/silverpointbuildingdesigners/",
    galleryUrl: "https://www.silverpointdesignandplanning.com.au/case-study/",
    work: [
      {
        title: "Sandringham",
        suburb: "Sandringham",
        type: "New family home",
        image: "/partners/silverpoint-design-and-planning/sandringham.jpg",
      },
      {
        title: "Custom home",
        suburb: "Melbourne",
        type: "Suburban Melbourne",
        image: "/partners/silverpoint-design-and-planning/custom-home.jpg",
      },
      {
        title: "Dual occupancy",
        suburb: "Melbourne",
        type: "Suburban Melbourne",
        image: "/partners/silverpoint-design-and-planning/dual-occupancy.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "sketch-design-and-interiors",
    kind: "architect",
    draft: true,
    roleLabel: "Design and interiors studio",
    name: "SKETCH Design and Interiors",
    monogram: "SK",
    logo: "/partners/sketch-design-and-interiors/logo.png",
    principal: "Darrin Albert and Andrew Brown",
    suburb: "Elsternwick",
    state: "VIC",
    tagline:
      "Homes and interiors designed as one considered whole, from the first sketch to the last finish.",
    disciplines: ["New homes", "Renovations", "Interior design"],
    google: { rating: 4.7, reviews: 58 },
    stats: [
      { label: "Google rating", value: "4.7", star: true, sub: "58 reviews" },
      { label: "Instagram following", value: "109k", sub: "@sketchdesign.au" },
      { label: "Established", value: "2006" },
    ],
    awards: [
      {
        label: "National Building Design of the Year",
        sub: "Design Matters National · 2022",
      },
      {
        label: "Victorian Building Design of the Year",
        sub: "Design Matters National · 2022",
      },
      {
        label: "25+ awards since 2017",
        sub: "Design Matters National, BDAA and Houzz",
      },
    ],
    why: "Few studios in Melbourne carry a record like SKETCH's: National Building Design of the Year in 2022, and a shelf of Design Matters honours before and since. What we notice is why they win. A twenty-two person team keeps design, interiors, town planning and documentation under one roof, clients choose finishes in a dedicated materials room rather than from a brochure, and the drawings that leave the studio are ones builders price with confidence. Serious capability, worn lightly.",
    about:
      "SKETCH is an Elsternwick studio of around twenty-two designers, interior designers and documenters, founded in 2006 and led by co-directors Darrin Albert and Andrew Brown. The practice designs new homes, renovations, additions and multi-residential projects across Melbourne, with interiors and town planning handled in house, and Darrin is a registered building practitioner with the Victorian Building Authority. In 2022, Design Matters National named the studio both Victorian and National Building Design of the Year.",
    facts: {
      established: "2006",
      basedIn: "Elsternwick, VIC",
      serves: "Melbourne",
      focus: "Homes, interiors and multi-residential",
    },
    website: "https://www.sketchdesign.com.au",
    instagram: "https://www.instagram.com/sketchdesign.au/",
    linkedin: "https://www.linkedin.com/company/sketch-building-design/",
    galleryUrl: "https://www.sketchdesign.com.au/gallery",
    work: [
      {
        title: "Elwood",
        suburb: "Elwood",
        type: "New home",
        image: "/partners/sketch-design-and-interiors/elwood.jpg",
      },
      {
        title: "Elsternwick",
        suburb: "Elsternwick",
        type: "Custom home",
        image: "/partners/sketch-design-and-interiors/elsternwick-home.jpg",
      },
      {
        title: "Elsternwick",
        suburb: "Elsternwick",
        type: "Interior design",
        image: "/partners/sketch-design-and-interiors/elsternwick-interior.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "vibe-building-design",
    kind: "architect",
    draft: true,
    roleLabel: "Building design practice",
    name: "Vibe Building Design",
    monogram: "VB",
    logo: "/partners/vibe-building-design/logo.png",
    logoDark: true,
    suburb: "Brunswick East",
    state: "VIC",
    tagline:
      "New homes, extensions and multi-residential projects across Melbourne, with advice that starts before you even buy the site.",
    disciplines: ["New homes", "Extensions", "Multi-residential"],
    google: { rating: 5.0, reviews: 13 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "13 reviews" },
      { label: "Established", value: "2016" },
      { label: "Pre-purchase advice", value: "Included" },
    ],
    why: "Vibe gets involved earlier than most designers. Owners come to them before a contract is signed and leave knowing exactly what a block can carry, then the same team runs concept, town planning and documentation as one continuous process, so the design intent survives all the way to the builder's hands. Nearly a decade of that discipline shows in a perfect five star record, and in owners who reach tender already sure of their drawings.",
    about:
      "Vibe Building Design is a Brunswick East studio founded in 2016, designing new homes, extensions and multi-residential projects across Melbourne. A member of Design Matters National, the team works from pre-purchase property advice through concept design, town planning and construction documentation, so a project carries one design intent from the day the site is bought to the day builders price it.",
    facts: {
      established: "2016",
      basedIn: "Brunswick East, VIC",
      serves: "Melbourne",
      focus: "Homes, extensions and multi-residential",
    },
    website: "https://www.vibebuildingdesign.com.au",
    instagram: "https://www.instagram.com/vibebuildingdesign/",
    linkedin: "https://www.linkedin.com/company/vibe-building-design/",
    galleryUrl: "https://www.vibebuildingdesign.com.au/projects",
    work: [
      {
        title: "Project Collins",
        suburb: "Melbourne",
        type: "Duplex development",
        image: "/partners/vibe-building-design/collins.jpg",
      },
      {
        title: "Project Charteris",
        suburb: "Melbourne",
        type: "Custom home",
        image: "/partners/vibe-building-design/charteris.jpg",
      },
      {
        title: "Project Bruce",
        suburb: "Melbourne",
        type: "Rear extension",
        image: "/partners/vibe-building-design/bruce.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "2bscene-design",
    kind: "architect",
    draft: true,
    roleLabel: "Building design practice",
    name: "2BScene Design",
    monogram: "2B",
    logo: "/partners/2bscene-design/logo.png",
    principal: "Luciano Bologna",
    suburb: "North Melbourne",
    state: "VIC",
    tagline:
      "Bold, expressive homes and multi-residential design from North Melbourne, drawn with an engineer's eye for how things get built.",
    disciplines: ["Custom homes", "Multi-residential", "Commercial"],
    google: { rating: 4.7, reviews: 14 },
    stats: [
      { label: "Google rating", value: "4.7", star: true, sub: "14 reviews" },
      { label: "In practice", value: "20+ yrs" },
      { label: "Awards won", value: "5", sub: "incl. three Building Design Awards" },
    ],
    awards: [
      {
        label: "New House $2 to $3 Million",
        sub: "Building Design Awards · The Brighton House · 2024",
      },
      {
        label: "New House over $3 Million",
        sub: "Building Design Awards · Undulating Cubes · 2020",
      },
      {
        label: "Lord Mayor's Innovation Award",
        sub: "City of Melbourne · 2019 and 2024",
      },
    ],
    why: "Luciano pairs an engineer's understanding of structure with a designer's eye, and it runs through everything 2BScene draws: bold, expressive forms that still resolve into disciplined, buildable documentation. Three Building Design Awards across 2011, 2020 and 2024 say the work keeps holding up, and the studio's small senior team means the director whose name wins the awards is the one across your project.",
    about:
      "2BScene Design is a North Melbourne studio led by director Luciano Bologna, who brings more than twenty five years in building and construction to bespoke family homes, multi-residential developments and commercial projects across Melbourne. In over two decades of practice from its Errol Street studio the firm has won three Building Design Awards for new homes and two City of Melbourne Lord Mayor's small business awards, working to its own simple standard: design led, detail driven.",
    facts: {
      basedIn: "North Melbourne, VIC",
      serves: "Melbourne",
      focus: "Homes, multi-residential and commercial",
    },
    website: "https://www.2bs.net.au",
    instagram: "https://www.instagram.com/2bscene_design/",
    facebook: "https://www.facebook.com/2BSceneDesign/",
    linkedin: "https://www.linkedin.com/company/2bscene-design/",
    galleryUrl: "https://www.2bs.net.au/portfolio",
    work: [
      {
        title: "Brighton",
        suburb: "Brighton",
        type: "Custom home",
        image: "/partners/2bscene-design/brighton.jpg",
      },
      {
        title: "Patterson Lakes",
        suburb: "Patterson Lakes",
        type: "Waterfront home",
        image: "/partners/2bscene-design/patterson-lakes.jpg",
      },
      {
        title: "Beaumaris",
        suburb: "Beaumaris",
        type: "Custom home",
        image: "/partners/2bscene-design/beaumaris.jpg",
      },
    ],
    joined: "2026",
  },

  /* ── Finance partners ───────────────────────────────────────────── */
  /* Real, in review (draft) */
  {
    slug: "ayse-altintas",
    kind: "finance",
    draft: true,
    roleLabel: "Home lending specialist",
    name: "Ayse Altintas",
    monogram: "AA",
    portrait: "/partners/ayse-altintas/portrait.jpg",
    suburb: "Melbourne",
    state: "VIC",
    tagline:
      "Home and construction lending with Commonwealth Bank, made straightforward for people planning a build.",
    disciplines: ["Construction loans", "Pre-approvals", "Refinancing"],
    institution: {
      name: "Commonwealth Bank",
      role: "Mobile Senior Home Lending Specialist",
      note: "Australia’s largest home lender",
      logo: "/partners/ayse-altintas/commbank.png",
    },
    stats: [
      { label: "With Commonwealth Bank", value: "4+ yrs" },
      { label: "In home lending", value: "5+ yrs" },
      { label: "Appointments", value: "Mobile", sub: "she comes to you" },
    ],
    why: "Finance is the part of a build most owners find hardest to read, and Ayse is who we trust to steady it. Five years in home lending, the last four with Commonwealth Bank, have made her fluent in the loans that matter when you build: construction lending, progress payments and pre-approvals that still hold up once real quotes land. As a mobile specialist she comes to you, and she explains each step in plain terms before anyone is asked to decide.",
    aboutLabel: "About Ayse",
    about:
      "Ayse Altintas is a Mobile Senior Home Lending Specialist with Commonwealth Bank, helping people buy, build and refinance across Melbourne. She has spent five years in home lending, the last four with the bank, and she works around you rather than a branch: appointments where and when they suit, and one point of contact from the first conversation through approval, settlement and the progress payments of a build.",
    facts: {
      basedIn: "Melbourne, VIC",
      serves: "Melbourne",
      focus: "Home and construction lending",
    },
    website: "https://www.commbank.com.au/home-loans.html",
    instagram: "https://www.instagram.com/ayse.cba/",
    linkedin: "https://www.linkedin.com/in/ayse-altintas-6a0102210/",
    servicesLabel: "Where Ayse helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "Land and house-and-land purchases",
      "Knockdown rebuild and renovation lending",
      "Refinancing to fund a build",
      "Home equity and next-home moves",
    ],
    joined: "2026",
  },
  {
    slug: "ed-akgun",
    kind: "finance",
    draft: true,
    roleLabel: "Mortgage adviser",
    name: "Ed Akgun",
    monogram: "EA",
    portrait: "/partners/ed-akgun/portrait.jpg",
    suburb: "Mulgrave",
    state: "VIC",
    tagline:
      "Mortgage advice for people buying and building, from a broker who spent a decade inside Australia's biggest bank.",
    disciplines: ["Construction loans", "Refinancing", "Lender comparison"],
    institution: {
      name: "RateOne",
      role: "Mortgage Adviser",
      note: "Australian Credit Licence 422284",
      logo: "/partners/ed-akgun/rateone.png",
    },
    stats: [
      { label: "In lending and banking", value: "13+ yrs" },
      { label: "With Commonwealth Bank", value: "10+ yrs", sub: "before broking" },
      { label: "Lenders on the panel", value: "30+", sub: "via RateOne" },
    ],
    awards: [
      {
        label: "Top 25 Brokerage, six years running",
        sub: "The Adviser · RateOne · 2016 to 2021",
      },
      {
        label: "Better Business Awards, Victoria",
        sub: "The Adviser · RateOne · 2019",
      },
      {
        label: "MFAA Credit Adviser",
        sub: "Dip. Finance and Mortgage Broking",
      },
    ],
    why: "Ed spent ten years inside Commonwealth Bank, moving from mortgage lending through premier banking to senior relationship management, before crossing to broking. That history means he reads a lender's decision the way an insider does, and now he puts it to work for the client across a panel of more than thirty banks. He structures loans around the build ahead, pre-approvals that hold and progress payments that arrive on time. That blend of insider knowledge and client-side independence is exactly what we want beside an owner financing a build.",
    aboutLabel: "About Ed",
    about:
      "Ed Akgun is a mortgage adviser with RateOne, a full service broking firm named a Top 25 Brokerage by The Adviser six years running, with more than ten thousand clients across its Mulgrave and Airport West offices. Ed holds a Diploma of Finance and Mortgage Broking and is an MFAA accredited credit adviser. He came to broking after a decade with Commonwealth Bank, and works across purchases, refinancing and construction lending for clients throughout Melbourne, with RateOne's financial planning arm alongside when it is needed.",
    facts: {
      basedIn: "Mulgrave and Airport West, VIC",
      serves: "Melbourne",
      focus: "Home and construction lending",
    },
    website: "https://rateone.com.au",
    instagram: "https://www.instagram.com/rateone.homeloans/",
    linkedin: "https://www.linkedin.com/in/ed-akgun-528793116/",
    servicesLabel: "Where Ed helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "Comparing 30+ lenders on one panel",
      "Land and house-and-land purchases",
      "Refinancing to fund a build",
      "First home and next home buyers",
    ],
    joined: "2026",
  },
  {
    slug: "billy-chok",
    kind: "finance",
    draft: true,
    roleLabel: "Lending adviser",
    name: "Billy Chok",
    monogram: "BC",
    portrait: "/partners/billy-chok/portrait.jpg",
    suburb: "Melbourne",
    state: "VIC",
    tagline:
      "Residential, construction and development finance, from a founder who has sat on the credit side of the desk.",
    disciplines: ["Construction loans", "Development finance", "Refinancing"],
    institution: {
      name: "Cloud Financial Group",
      role: "Founder and Senior Lending Adviser",
      note: "Lending and insurance, Australia wide",
      logo: "/partners/billy-chok/cloudfg.png",
    },
    stats: [
      { label: "In finance and lending", value: "15+ yrs" },
      { label: "Founded Cloud Financial", value: "2020" },
      { label: "Home to development lending", value: "Covered" },
    ],
    why: "Billy has seen lending from every seat that matters: broking from 2007, home finance at Westpac, then senior credit analysis at La Trobe Financial, where he was the person an application had to convince. He founded Cloud Financial Group in 2020 to put that whole picture to work for clients, from home loans through construction and development finance. He also develops property himself, so he has carried a construction loan from the borrower's side, and it shows in how he structures one: pre-approvals that hold, drawdowns that land on time, and no surprises at valuation.",
    aboutLabel: "About Billy",
    about:
      "Billy Chok is the founder of Cloud Financial Group, a Melbourne based advisory arranging residential, commercial and development finance, with insurance alongside, for clients across Australia. His path to broking ran through both sides of the industry: home lending with Westpac, then senior credit analysis with La Trobe Financial, one of Australia's largest non bank lenders. That credit background shapes how the firm works, with applications built the way an assessor reads them, whether the project is a first build, a knockdown rebuild or a multi unit development.",
    facts: {
      basedIn: "Melbourne, VIC",
      serves: "Australia wide",
      focus: "Construction and development finance",
    },
    website: "https://cloudfg.com.au",
    linkedin: "https://www.linkedin.com/in/billy-c-a44100b2/",
    servicesLabel: "Where Billy helps",
    services: [
      "Construction loans and progress payments",
      "Development finance for multi-unit projects",
      "Pre-approval before you go to tender",
      "Land, house-and-land and knockdown rebuilds",
      "Refinancing to fund a build",
      "Commercial and private lending",
    ],
    joined: "2026",
  },
  {
    slug: "jason-pogorelec",
    kind: "finance",
    draft: true,
    roleLabel: "Senior finance broker",
    name: "Jason Pogorelec",
    monogram: "JP",
    portrait: "/partners/jason-pogorelec/portrait.jpg",
    suburb: "West Melbourne",
    state: "VIC",
    tagline:
      "Finance broking for people building homes and portfolios, with strategy that looks past a single settlement.",
    disciplines: ["Construction loans", "Investment lending", "SMSF"],
    institution: {
      name: "Inovayt",
      role: "Senior Finance Broker",
      note: "Finance, wealth and commercial, Australia wide",
      logo: "/partners/jason-pogorelec/inovayt.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "Inovayt · 998 reviews" },
      { label: "In finance broking", value: "15+ yrs" },
      { label: "Industry honours", value: "9", sub: "2011 to 2022" },
    ],
    awards: [
      {
        label: "Top 20 Champion Broker, Victoria",
        sub: "AFG · 2019 and 2020",
      },
      {
        label: "Top 30 Young Broker of the Year, Australia",
        sub: "2012, 2014 and 2015",
      },
      {
        label: "Best Residential Broker, Finalist",
        sub: "Better Business Awards · 2022",
      },
    ],
    why: "Fifteen years with one firm is rare in broking, and it tells you how Jason works: analytical, organised and built around the client's next decade rather than a single settlement. He is the broker we point at owners thinking past one build, structuring lending across home, investment, commercial and SMSF so a construction loan today does not box the portfolio in tomorrow. Nine industry honours since 2011, from national young broker rankings to AFG's Champion Broker list, say the industry has noticed too.",
    aboutLabel: "About Jason",
    about:
      "Jason Pogorelec is a senior finance broker with Inovayt, a national finance and wealth advisory with teams across Melbourne, Sydney, Brisbane and beyond, a 5.0 Google rating across nearly a thousand reviews, and the 2024 Australian Broking Awards Independent Office of the Year. With Inovayt since May 2011, Jason specialises in strategic lending for property portfolios, commercial purchases and refinancing, SMSF arrangements and residential banking, with one intent throughout: results that serve a client's financial goals for the long term, not a one off transaction.",
    facts: {
      basedIn: "West Melbourne, VIC",
      serves: "Australia wide",
      focus: "Home, investment and SMSF lending",
    },
    website: "https://www.inovayt.com.au",
    linkedin: "https://www.linkedin.com/in/jason-pogorelec-2278b523/",
    servicesLabel: "Where Jason helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "Building a property portfolio strategically",
      "Commercial purchases and refinancing",
      "SMSF lending",
      "Refinancing to fund a build",
    ],
    joined: "2026",
  },
  {
    slug: "burak-dilbaz",
    kind: "finance",
    draft: true,
    roleLabel: "Finance broker",
    name: "Burak Dilbaz",
    monogram: "BD",
    portrait: "/partners/burak-dilbaz/portrait.jpg",
    suburb: "Clayton",
    state: "VIC",
    tagline:
      "Home, business and asset finance made simple, with a specialty in the self-employed.",
    disciplines: ["Construction loans", "Self-employed lending", "Asset finance"],
    google: { rating: 5.0, reviews: 19 },
    institution: {
      name: "Xubi",
      role: "Founder and Director",
      note: "Australian Credit Licence 389328",
      logo: "/partners/burak-dilbaz/xubi.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "Xubi · 19 reviews" },
      { label: "Inside the big four banks", value: "14 yrs", sub: "before broking" },
      { label: "Founded Xubi", value: "2022" },
    ],
    awards: [
      {
        label: "Lending Broker of the Year",
        sub: "Connective Excellence Awards · VIC and TAS · 2025",
      },
      {
        label: "Home Loans Broker of the Year, Finalist",
        sub: "Connective Excellence Awards · VIC and TAS · 2024",
      },
    ],
    why: "Fourteen years inside the big four banks, much of it managing business banking portfolios, taught Burak how lenders actually read a self employed file. That is now his specialty at Xubi, the brokerage he founded in 2022: home, business and asset finance for people whose income does not fit neatly in a payslip, business owners and owner builders included. Named Lending Broker of the Year for Victoria and Tasmania in 2025, he is the broker we introduce when a build sits alongside a business.",
    aboutLabel: "About Burak",
    about:
      "Burak Dilbaz is the founder and director of Xubi, a Clayton brokerage he named for his mother Zubeyde, and Connective's 2025 Lending Broker of the Year for Victoria and Tasmania. He came to broking after fourteen years with Australia's big four banks, most recently managing business banking portfolios at NAB, and built Xubi around the clients banks find hardest to serve: the self employed. The firm arranges home, commercial and asset finance under Australian Credit Licence 389328, with a five star Google record.",
    facts: {
      basedIn: "Clayton, VIC",
      serves: "Melbourne and Victoria",
      focus: "Home, business and asset finance",
    },
    website: "https://www.xubi.com.au",
    instagram: "https://www.instagram.com/xubifinance/",
    linkedin: "https://www.linkedin.com/in/burak-dilbaz-48867ba9/",
    servicesLabel: "Where Burak helps",
    services: [
      "Construction loans and progress payments",
      "Lending for the self-employed",
      "Pre-approval before you go to tender",
      "Business and commercial finance",
      "Asset and equipment finance",
      "Refinancing to fund a build",
    ],
    joined: "2026",
  },
  {
    slug: "maninder-kaur",
    kind: "finance",
    draft: true,
    roleLabel: "Principal broker",
    name: "Maninder Kaur",
    monogram: "MK",
    portrait: "/partners/maninder-kaur/portrait.jpg",
    suburb: "Campbellfield",
    state: "VIC",
    tagline:
      "Home, construction and commercial lending, from a principal broker who invests in property herself.",
    disciplines: ["Construction loans", "First home buyers", "Complex approvals"],
    institution: {
      name: "Evergrow Finance",
      role: "Founder and Principal Broker",
      note: "FBAA and AFCA member",
      logo: "/partners/maninder-kaur/evergrow.png",
    },
    stats: [
      { label: "In finance broking", value: "10+ yrs" },
      { label: "Lenders on the panel", value: "45+", sub: "via Loan Market Group" },
      { label: "Founded Evergrow", value: "2023" },
    ],
    why: "Maninder lives what she advises. A property investor and business owner herself, she has spent a decade in broking making difficult files work: self employed income, first homes, imperfect credit histories and construction lending among them. Clients get a problem solver who leaves no stone unturned, with a panel of more than forty five lenders behind her, and she works hand in hand with the agents, accountants and planners around a purchase, which is exactly how we like a broker to operate inside a build team.",
    aboutLabel: "About Maninder",
    about:
      "Maninder Kaur is the founder and principal broker of Evergrow Finance, a Campbellfield brokerage she opened in 2023 after seven years running a Loan Market business in Craigieburn. A member of the FBAA and AFCA, she works across home, investment, construction, commercial and asset lending through the Loan Market Group panel, with particular depth in self employed borrowers and complex approvals. An active supporter of her local community, she puts her intent simply: to be her clients' trusted broker for life.",
    facts: {
      basedIn: "Campbellfield, VIC",
      serves: "Melbourne",
      focus: "Home, construction and commercial lending",
    },
    website: "https://evergrowfinance.au",
    instagram: "https://www.instagram.com/maninder_evergrow_finance/",
    facebook: "https://www.facebook.com/evergrowfinance.au/",
    linkedin: "https://www.linkedin.com/in/maninder-kaur-6214a8196/",
    servicesLabel: "Where Maninder helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "Lending for the self-employed",
      "First home buyers",
      "Complex approvals and credit histories",
      "Commercial, car and equipment finance",
    ],
    joined: "2026",
  },
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
