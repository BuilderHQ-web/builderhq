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

export type PartnerKind = "architect" | "builder" | "finance" | "conveyancer";

export interface PartnerWork {
  title: string;
  suburb: string;
  type: string;
  /** Optional; omitted where the practice doesn't publish a year. */
  year?: string;
  /** Optional project image; normalised by the work-strip treatment. */
  image?: string;
  /** Direct link to this project on the partner's own site. Falls back
   *  to the partner's galleryUrl when omitted. */
  href?: string;
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
  /** The partner's in-app builder account, by its builder_profiles.slug.
   *  When set, the app's public profile route (/b/<that slug>) renders
   *  THIS partner page instead of the standard register profile — the
   *  curated profile is the profile, whichever door a client comes
   *  through. Independent of `draft`: a partner we have not published
   *  to the directory can still have their curated page serve as their
   *  own profile. */
  builderProfileSlug?: string;
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
  /** Normalised single-ink silhouette of the mark (transparent bg,
   *  trimmed), for the landing trust strip where logos float on the
   *  canvas. Generated when a partner goes live — see memory notes:
   *  scripts pipeline produces <dir>/logo-float-v2.png via PIL. */
  logoFloat?: string;
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
  /** All states the partner practises in, when more than one — drives the
   *  row badges, the map counts and the state filter. `state` remains the
   *  primary (home) state. */
  states?: string[];
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
  /** Further placings, listed quietly beneath the plaques where a
   *  partner's record runs past three. Keeps the panel's hierarchy
   *  while letting the full record show. One line each, already
   *  formatted. */
  awardsMore?: string[];
  /** A quieter recognition, shown on a compact dark strip rather than the
   *  gold honours board — for a platform or service accolade (e.g. Best of
   *  Houzz) that is not a formal design or industry award. */
  accolade?: { label: string; sub?: string; tag?: string };
  website?: string;
  /** Instagram profile. A compact icon beside the website button, or the
   *  full link when the partner has no website. */
  instagram?: string;
  /** Facebook page, shown as a compact icon beside the other links. */
  facebook?: string;
  /** LinkedIn page, shown as a compact icon beside the other links. */
  linkedin?: string;
  /** Direct booking link (e.g. Calendly) — renders as a calendar icon in
   *  the profile's link cluster, beside the socials. */
  booking?: string;
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
    slug: "house-design-solutions",
    kind: "architect",
    roleLabel: "Building design practice",
    name: "House Design Solutions",
    monogram: "HD",
    logo: "/partners/house-design-solutions/logo.png",
    logoFloat: "/partners/house-design-solutions/logo-float-v2.png",
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
    roleLabel: "Building design practice",
    name: "Summerhill Building Designers",
    monogram: "SB",
    logo: "/partners/summerhill-building-designers/logo.png",
    logoFloat: "/partners/summerhill-building-designers/logo-float-v2.png",
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
    slug: "quorum-studios",
    kind: "architect",
    roleLabel: "Residential architecture studio",
    name: "Quorum Studios",
    monogram: "QS",
    logo: "/partners/quorum-studios/logo.png",
    principal: "Manny and Vanessa Pedro",
    suburb: "Brisbane",
    state: "QLD",
    tagline:
      "A deliberately small Brisbane residential studio, pairing a registered architect who has judged Queensland’s HIA awards with a director trained in psychology and people development.",
    disciplines: ["Luxury new homes", "Character dwellings", "Pre-designed house plans"],
    google: { rating: 5.0, reviews: 18 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "18 reviews" },
      {
        label: "HIA awards panel",
        value: "Judge",
        sub: "Queensland House, Kitchen and Bathroom",
      },
      {
        label: "In practice",
        value: "10+ yrs",
        sub: "across two continents",
      },
    ],
    why: "In a register full of practices that enter design awards, Manny Pedro has been asked to judge them. He sat on the panel for Queensland’s HIA House, Kitchen and Bathroom of the Year, which is a different order of recognition from a shortlisting, because the industry does not hand you the scorecard unless it already trusts your eye. More than a decade in practice across two continents sits behind that, worked to a plain discipline he states simply as less is more, which shows up in the buildings as intuitive solutions rather than gestures.\n\nThe other half of this studio is the part most practices never think to build. Vanessa Pedro holds an honours degree in psychology and spent years in human resources and people development before taking on the client side of an architecture business. Building a house is the most emotionally exposed purchase most people ever make, and having someone whose actual training is in people running that relationship is rare and genuinely useful. The studio has stayed small on purpose, declining to trade intimacy for scale, and all eighteen of its reviewers have given it five stars. For an owner who wants a considered home and a calm process, that is an unusually well matched pair.",
    about:
      "Quorum Studios was founded in 2023 by Manny and Vanessa Pedro and works from Brisbane on residential architecture, from luxury new homes through to traditional character dwellings. Manny holds registration 6279 with the Board of Architects Queensland and leads the design; Vanessa directs business support and marketing and brings the interiors eye that runs alongside it. Every project opens with a single question about how a client wants to live, and the studio stays with it from the first sketch to the final site visit rather than stepping away once documentation is issued. Beside its bespoke commissions it offers a range of pre-designed house plans, which puts the same thinking within reach at a lower entry point. Recent work includes a home at Coorparoo, the Villa Palma residence and a pavilion on the Gold Coast.",
    facts: {
      established: "2023",
      basedIn: "Brisbane, QLD",
      serves: "Brisbane and South East Queensland",
      focus: "Luxury homes and character dwellings",
    },
    website: "https://www.qstudio.au",
    instagram: "https://www.instagram.com/quorum_studio_qld/",
    facebook: "https://www.facebook.com/people/Quorum-Studios/100080181046794/",
    galleryUrl: "https://www.qstudio.au",
    work: [
      {
        title: "Coorparoo",
        suburb: "Coorparoo",
        type: "New home",
        image: "/partners/quorum-studios/coorparoo.jpg",
      },
      {
        title: "Villa Palma",
        suburb: "Queensland",
        type: "New home",
        image: "/partners/quorum-studios/villa-palma.jpg",
      },
      {
        title: "Coastal pavilion",
        suburb: "Gold Coast",
        type: "New home",
        image: "/partners/quorum-studios/pavilion.jpg",
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
    roleLabel: "Building design practice",
    name: "Evoka Studio",
    monogram: "ES",
    logo: "/partners/evoka-studio/logo.png",
    logoFloat: "/partners/evoka-studio/logo-float-v2.png",
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
    why: "Anthony brings ten years of residential design and delivery to every Evoka Studio project. The studio starts with feasibility, so owners understand what a site can carry before design begins. From there, concept design, town planning, and construction documentation are all handled under one roof, with a focus on creativity, transparency, and seamless delivery from the first sketch through to handover.",
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
        href: "https://www.evokastudio.com.au/projects/cumberland-townhouses",
      },
      {
        title: "Richmond",
        suburb: "Richmond",
        type: "Rear extension",
        image: "/partners/evoka-studio/richmond.jpg",
        href: "https://www.evokastudio.com.au/projects/terrace-seventy-seven",
      },
      {
        title: "Lalor",
        suburb: "Lalor",
        type: "Townhouse development",
        image: "/partners/evoka-studio/lalor.jpg",
        href: "https://www.evokastudio.com.au/projects/lalor-edge-townhouses",
      },
    ],
    joined: "2026",
  },
  {
    slug: "silverpoint-design-and-planning",
    kind: "architect",
    roleLabel: "Building design and planning practice",
    name: "SilverPoint Building Designers & Planning Consultants",
    monogram: "SP",
    logo: "/partners/silverpoint-design-and-planning/logo.png",
    logoFloat: "/partners/silverpoint-design-and-planning/logo-float-v2.png",
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
    why: "Forty years of design and town planning have taught SilverPoint what Melbourne councils will approve, and they put that knowledge to work before a line is drawn. With design and planning under the one roof, schemes are shaped for approval from the start rather than negotiated after the fact. Accredited with HIA, Master Builders Victoria and the BPC, they are the steady hand we want on a complex site.",
    about:
      "SilverPoint is a Camberwell practice pairing building design with town planning consultancy, working across Melbourne for more than forty years. The team designs new homes, extensions, dual occupancies and multi-unit developments, and carries the planning side end to end: applications, subdivision and council negotiation. With HIA, Master Builders Victoria and BPC accreditation, and more than 1,800 projects completed, few practices know the approval process better.",
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
  {
    slug: "avankar-design-architects",
    kind: "architect",
    draft: true,
    name: "Avankar Design Architects",
    monogram: "AD",
    logo: "/partners/avankar-design-architects/logo.png",
    principal: "Baban Dizayi",
    suburb: "Bundoora",
    state: "VIC",
    tagline:
      "Architect led homes and interiors, with the concept held as the driving force from first sketch to delivery.",
    disciplines: ["Custom homes", "Interior design", "Multi-dwelling"],
    google: { rating: 4.9, reviews: 159 },
    institution: {
      name: "Australian Institute of Architects",
      role: "Member practice",
      note: "Architect registration in VIC, NSW, QLD and WA",
    },
    stats: [
      { label: "Google rating", value: "4.9", star: true, sub: "159 reviews" },
      { label: "Experience", value: "35+ yrs", sub: "local and international" },
      { label: "States registered in", value: "4", sub: "VIC, NSW, QLD and WA" },
    ],
    why: "Avankar brings the rigour of registered architects to residential work, and it shows in the process: a genuinely investigative first phase, a written design philosophy for every project, and the architectural concept held as the driving force from sketch through documentation to delivery. Principal architect Baban Dizayi is registered in four states, the team works in five languages, English, Arabic, Kurdish, Farsi and Dari, so briefs stay precise where they are often lost, and a 4.9 Google rating across 159 reviews says clients feel the difference.",
    about:
      "Avankar Design Architects is a Bundoora practice of architects, interior designers and specialists led by principal architect and director Baban Dizayi, with more than thirty five years of local and international experience behind it. A member practice of the Australian Institute of Architects, registered in Victoria, New South Wales, Queensland and Western Australia, the studio designs custom homes, interiors, multi-dwelling developments and commercial projects, weighing the environmental, social, functional and financial in every brief while the concept remains the driving force.",
    facts: {
      basedIn: "Bundoora, VIC",
      serves: "Melbourne and interstate",
      focus: "Homes, interiors and multi-dwelling",
    },
    website: "https://www.avankar.com.au",
    instagram: "https://www.instagram.com/avankar_design/",
    linkedin: "https://www.linkedin.com/company/avankar-design-architects/",
    galleryUrl: "https://www.avankar.com.au/gallery.html",
    work: [
      {
        title: "Shepparton",
        suburb: "Shepparton",
        type: "Custom home",
        image: "/partners/avankar-design-architects/shepparton.jpg",
      },
      {
        title: "Templestowe",
        suburb: "Templestowe",
        type: "Custom home",
        image: "/partners/avankar-design-architects/templestowe.jpg",
      },
      {
        title: "Doncaster",
        suburb: "Doncaster",
        type: "Interior design",
        image: "/partners/avankar-design-architects/doncaster.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "ultimate-design-and-drafting",
    kind: "architect",
    draft: true,
    roleLabel: "Design and drafting practice",
    name: "Ultimate Design & Drafting",
    monogram: "UD",
    logo: "/partners/ultimate-design-and-drafting/logo.png",
    logoDark: true,
    principal: "Joey Bondin",
    suburb: "Essendon",
    state: "VIC",
    tagline:
      "Sophisticated, practical home design and drafting, with energy ratings and colour selection under the same roof.",
    disciplines: ["Custom homes", "Drafting", "Energy ratings"],
    google: { rating: 4.4, reviews: 20 },
    stats: [
      { label: "Google rating", value: "4.4", star: true, sub: "20 reviews" },
      { label: "Established", value: "2006", sub: "18+ years in practice" },
      { label: "Energy ratings", value: "In house", sub: "thermal assessment and colour" },
    ],
    why: "Joey's team has been drawing Melbourne homes since 2006, and the practice is built around what actually gets projects moving: accurate drawings, honest timeframes and budgets treated with respect. Energy ratings, thermal assessment and colour selection sit in house alongside the drafting, so documentation arrives complete rather than in pieces. It is the kind of steady, practical outfit builders like pricing for, and owners like working with.",
    about:
      "Ultimate Design & Drafting is an Essendon practice founded by director Joey Bondin in 2006, designing homes and commercial projects across Melbourne for more than eighteen years. The team keeps thermal assessment, energy ratings and colour consultation in house alongside the design and drafting, and works to a brief it has held since the beginning: drawings that are accurate, on time, suited to how you live and honestly priced.",
    facts: {
      established: "2006",
      basedIn: "Essendon, VIC",
      serves: "Melbourne",
      focus: "Homes, drafting and energy ratings",
    },
    website: "https://www.ultimatedesign.com.au",
    instagram: "https://www.instagram.com/ultimatedesigndrafting/",
    galleryUrl: "https://www.ultimatedesign.com.au/projects/",
    work: [
      {
        title: "Strathtulloh",
        suburb: "Strathtulloh",
        type: "Acreage residence",
        image: "/partners/ultimate-design-and-drafting/strathtulloh.jpg",
      },
      {
        title: "Melbourne",
        suburb: "Melbourne",
        type: "Double-storey home",
        image: "/partners/ultimate-design-and-drafting/melbourne.jpg",
      },
      {
        title: "Taylors Hill",
        suburb: "Taylors Hill",
        type: "Single-storey home",
        image: "/partners/ultimate-design-and-drafting/taylors-hill.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "lateral-building-design",
    kind: "architect",
    draft: true,
    roleLabel: "Building design practice",
    name: "Lateral Building Design",
    monogram: "LB",
    logo: "/partners/lateral-building-design/logo.png",
    principal: "Donna and John Harding-Smith",
    suburb: "Bayswater North",
    state: "VIC",
    tagline:
      "Homes, townhouse developments and commercial projects, carried from first feasibility to approved permit since 2002.",
    disciplines: ["New homes", "Townhouse developments", "Town planning"],
    google: { rating: 4.4, reviews: 21 },
    institution: {
      name: "Design Matters National",
      role: "Member",
      note: "Formerly the Building Designers Association of Victoria",
    },
    stats: [
      { label: "Google rating", value: "4.4", star: true, sub: "21 reviews" },
      {
        label: "Planning permit success",
        value: "96%",
        sub: "as published by the practice",
      },
      {
        label: "Building permit success",
        value: "100%",
        sub: "as published by the practice",
      },
    ],
    why: "Lateral Building Design has been taking Melbourne projects from feasibility to approval since 2002, and the record is the argument: a 96 per cent success rate on planning permits and 100 per cent on building permits, as the practice publishes it. Founders Donna and John Harding-Smith built the firm on complementary ground, John a registered building practitioner in building design and architectural drafting, Donna an accountant keeping the business side disciplined, and the portfolio runs from single homes to multi-townhouse developments and childcare centres. That approvals literacy is precisely what we want beside owners heading into council.",
    about:
      "Lateral Building Design is a Bayswater North practice founded in July 2002 by Donna and John Harding-Smith. John, a registered building practitioner in building design and architectural drafting and a member of Design Matters National, leads the design work; Donna, an accountant across several industries before the practice, manages the business. The team designs new homes, extensions, townhouse developments and commercial buildings across Melbourne, and carries each project through town planning and building permit applications itself. Its published record, 96 per cent of planning permits and every building permit approved, reflects a practice organised around getting projects through.",
    facts: {
      established: "2002",
      basedIn: "Bayswater North, VIC",
      serves: "Melbourne",
      focus: "Homes, townhouses and commercial",
    },
    website: "https://www.lateralbuildingdesign.com.au",
    instagram: "https://www.instagram.com/lateralbuildingdesign/",
    linkedin: "https://www.linkedin.com/company/lateral-building-design/",
    galleryUrl: "https://www.lateralbuildingdesign.com.au/portfolio/",
    work: [
      {
        title: "Heathmont",
        suburb: "Heathmont",
        type: "New home",
        image: "/partners/lateral-building-design/heathmont.jpg",
      },
      {
        title: "Interior",
        suburb: "Melbourne",
        type: "Living room and fireplace",
        image: "/partners/lateral-building-design/interior.jpg",
      },
      {
        title: "Suburban Melbourne",
        suburb: "Melbourne",
        type: "Pool and alfresco terrace",
        image: "/partners/lateral-building-design/suburban-melbourne.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "metro-building-designers",
    kind: "architect",
    roleLabel: "Building design practice",
    name: "Metro Building Designers",
    monogram: "MB",
    logo: "/partners/metro-building-designers/logo.png",
    logoFloat: "/partners/metro-building-designers/logo-float-v2.png",
    logoDark: true,
    principal: "Glenn Nielsen",
    suburb: "Reservoir",
    state: "VIC",
    tagline:
      "Extensions, renovations, new homes and unit developments, designed around the way Melbourne families live.",
    disciplines: ["Extensions and renovations", "New homes", "Unit developments"],
    google: { rating: 4.9, reviews: 45 },
    stats: [
      { label: "Google rating", value: "4.9", star: true, sub: "45 reviews" },
      {
        label: "Extensions and renovations",
        value: "500+",
        sub: "designed across Melbourne",
      },
      { label: "Experience", value: "20 yrs", sub: "director Glenn Nielsen" },
    ],
    awards: [
      {
        label: "Renovation/Addition $500,000 to $750,000",
        sub: "HIA-CSR Victorian Housing and Kitchen & Bathroom Awards · Malvern, with builder Aviva Homes · 2024",
      },
      {
        label: "Project Home up to $500,000",
        sub: "HIA-CSR Victorian Housing and Kitchen & Bathroom Awards · Doreen, with builder Aviva Homes · 2024",
      },
    ],
    why:
      "Metro Building Designers has drawn more than five hundred extensions and renovations across Melbourne, and in 2024 it stood up at the industry’s own judging: category wins for a Malvern renovation and a Doreen project home at the HIA-CSR Victorian Housing and Kitchen & Bathroom Awards, both built with Aviva Homes.\n\nDirector Glenn Nielsen, a registered building practitioner of twenty years, keeps the practice focused on small to medium residential projects, so every client keeps their own design consultant from sketch to permit. Award level proof with household scale attention is the combination we look for.",
    about:
      "Metro Building Designers is a Reservoir practice led by director Glenn Nielsen, a building practitioner registered with the Victorian Building Authority who brings twenty years of residential design experience. The studio works on extensions, renovations, new homes and unit developments, deliberately held at small to medium scale so each client deals directly with their own design consultant, and counts more than five hundred extensions and renovations designed across Melbourne. Design, town planning and building permit applications are handled in house on fixed fees, and in 2024 two of the practice’s projects, a Doreen home and a Malvern renovation built with Aviva Homes, won their categories at the HIA-CSR Victorian Housing and Kitchen & Bathroom Awards.",
    facts: {
      basedIn: "Reservoir, VIC",
      serves: "Melbourne",
      focus: "Extensions, renovations and new homes",
    },
    website: "https://www.metrobd.com.au",
    instagram: "https://www.instagram.com/metrobd/",
    linkedin: "https://www.linkedin.com/in/glenn-nielsen-0a097a25/",
    galleryUrl: "https://www.metrobd.com.au/gallery",
    work: [
      {
        title: "Yarrambat",
        suburb: "Yarrambat",
        type: "New home",
        image: "/partners/metro-building-designers/yarrambat.jpg",
      },
      {
        title: "Suburban Melbourne",
        suburb: "Melbourne",
        type: "Dual occupancy",
        image: "/partners/metro-building-designers/suburban-melbourne.jpg",
      },
      {
        title: "Interiors",
        suburb: "Melbourne",
        type: "Bathroom",
        image: "/partners/metro-building-designers/interiors.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "wowowa",
    kind: "architect",
    draft: true,
    name: "WOWOWA",
    monogram: "WO",
    logo: "/partners/wowowa/logo.png",
    principal: "Monique and Scott Woodward",
    suburb: "Collingwood",
    state: "VIC",
    tagline:
      "Award winning architecture and interiors from Collingwood, designing homes that tell their owners' stories.",
    disciplines: ["Custom homes", "Interiors", "Public buildings"],
    google: { rating: 5.0, reviews: 5 },
    institution: {
      name: "Australian Institute of Architects",
      role: "Both principals are Fellows",
      note: "Monique Woodward serves as a National Councillor",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "5 reviews" },
      {
        label: "Industry honours",
        value: "30+",
        sub: "listed by the studio, 2013 to 2026",
      },
      {
        label: "Principals",
        value: "2",
        sub: "registered architects, AIA Fellows",
      },
    ],
    awards: [
      {
        label: "Melbourne Design Awards Gold Winner",
        sub: "Four golds · 2019, 2021, 2023 and 2025",
      },
      {
        label: "AIA Small Projects Award",
        sub: "Australian Institute of Architects · Casa de Gatos · 2017",
      },
      {
        label: "Australian Design Awards Gold",
        sub: "Hampton Park Fab Lab · 2024",
      },
    ],
    why: "WOWOWA is one of the most decorated studios on our register: four Melbourne Design Awards golds between 2019 and 2025, an Australian Institute of Architects award, and a published honours list that runs past thirty entries. Principals Monique and Scott Woodward are both registered architects and Fellows of the Institute, and Monique serves as a National Councillor, credentials few residential studios can match. The work itself is deeply personal, homes and interiors composed around their owners' stories, carried through with the command of colour the practice is known for. For owners who want architecture with genuine authorship, few introductions carry more weight.",
    about:
      "WOWOWA is a Collingwood architecture and interiors studio led by principals Monique and Scott Woodward, both registered architects and Fellows of the Australian Institute of Architects; Monique also serves as a National Councillor of the Institute. The practice designs custom homes, alterations and public buildings with a holistic approach that curates interiors, furniture and art alongside the architecture, honours Country, and is widely recognised for its command of colour. Its published honours run from an AIA Small Projects Award to four Melbourne Design Awards golds and a long line of Dulux Colour and Houses shortlistings, and its clients often arrive from demanding fields, medicine, technology and film, seeking homes designed as genuine sanctuaries.",
    facts: {
      basedIn: "Collingwood, VIC",
      serves: "Melbourne",
      focus: "Homes, interiors and public buildings",
    },
    website: "https://www.wowowa.com.au",
    instagram: "https://www.instagram.com/wowowaarch/",
    linkedin: "https://www.linkedin.com/company/wowowa/",
    galleryUrl: "https://www.wowowa.com.au/projects/",
    work: [
      {
        title: "Fitzroy North",
        suburb: "Fitzroy North",
        type: "Alteration and addition",
        image: "/partners/wowowa/fitzroy-north.jpg",
      },
      {
        title: "Glen Iris",
        suburb: "Glen Iris",
        type: "Family home",
        image: "/partners/wowowa/glen-iris.jpg",
      },
      {
        title: "Interiors",
        suburb: "Melbourne",
        type: "Kitchen",
        image: "/partners/wowowa/interiors.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "mq-design-group",
    kind: "architect",
    draft: true,
    roleLabel: "Building design studio",
    name: "MQ Design Group",
    monogram: "MQ",
    logo: "/partners/mq-design-group/logo.png",
    suburb: "Williamstown",
    state: "VIC",
    tagline:
      "A studio of more than fifteen building designers, carrying projects from first concept to building permit across Victoria.",
    disciplines: ["Custom homes", "Multi-residential", "Heritage restorations"],
    google: { rating: 4.8, reviews: 76 },
    stats: [
      { label: "Google rating", value: "4.8", star: true, sub: "76 reviews" },
      {
        label: "Building designers",
        value: "15+",
        sub: "across the Williamstown studio",
      },
      {
        label: "Combined experience",
        value: "100+ yrs",
        sub: "as the studio reports",
      },
    ],
    why: "MQ Design Group, the Williamstown studio long known as Meraq Building Designers, brings something rare on our register: genuine scale. More than fifteen qualified building designers work under one roof, with collective experience the studio puts past one hundred years, so projects carry from first concept to building permit without ever resting on a single pair of hands. The range runs from heritage restorations and family homes to infill multi-unit and seniors living developments, backed by council relationships across Victoria and a 4.8 Google rating over seventy six reviews. For owners who want real depth behind their designer, few studios offer more.",
    about:
      "MQ Design Group is a Williamstown building design studio, established as Meraq Building Designers and now practising under the MQ name. The team numbers more than fifteen qualified building designers, with collective experience the studio reports at over one hundred years, and it works across the full breadth of residential design: heritage restorations, alterations and additions, new homes, infill multi-unit developments, seniors living and light commercial. Projects are carried from concept through town planning and building permit approvals in house, supported by longstanding council relationships throughout Victoria, and the studio's recent work runs deepest through Melbourne's inner west, Newport, Spotswood, Altona and beyond.",
    facts: {
      basedIn: "Williamstown, VIC",
      serves: "Melbourne and Victoria",
      focus: "Homes, multi-residential and heritage",
    },
    website: "https://www.meraq.com.au",
    instagram: "https://www.instagram.com/mqdesigngroup/",
    facebook: "https://www.facebook.com/meraqbuildingdesigners/",
    galleryUrl: "https://www.meraq.com.au/projects/",
    work: [
      {
        title: "Thomas",
        suburb: "Melbourne",
        type: "Double-storey home",
        image: "/partners/mq-design-group/thomas.jpg",
      },
      {
        title: "Townhouse development",
        suburb: "Melbourne",
        type: "Suburban Melbourne",
        image: "/partners/mq-design-group/townhouse-development.jpg",
      },
      {
        title: "Custom home",
        suburb: "Melbourne",
        type: "Suburban Melbourne",
        image: "/partners/mq-design-group/custom-home.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "praeditos-designs",
    kind: "architect",
    roleLabel: "Building design and drafting",
    name: "Praeditos Designs & Drafting",
    monogram: "PD",
    logo: "/partners/praeditos-designs/logo.png",
    logoFloat: "/partners/praeditos-designs/logo-float-v2.png",
    principal: "Jacob Woods",
    suburb: "Canberra",
    state: "ACT",
    tagline:
      "Concept design, drafting and approval-ready working drawings for Canberra homes, extensions and small commercial projects.",
    disciplines: ["New homes", "Extensions and alterations", "Working drawings"],
    google: { rating: 4.7, reviews: 19 },
    stats: [
      { label: "Google rating", value: "4.7", star: true, sub: "19 reviews" },
      {
        label: "Industry awards",
        value: "4",
        sub: "ServiceSeeking Top 10, 2023 to 2024",
      },
      {
        label: "Building design since",
        value: "2018",
        sub: "Diploma qualified (CPP50911)",
      },
    ],
    awards: [
      {
        label: "Top 10 Building Designer in Regional NSW",
        sub: "ServiceSeeking.com.au · 2024",
      },
      {
        label: "Top 10 Draftsman in Canberra, two years running",
        sub: "ServiceSeeking.com.au · 2023 and 2024",
      },
      {
        label: "Top 10 Draftsman in Regional NSW",
        sub: "ServiceSeeking.com.au · 2024",
      },
    ],
    why:
      "Praeditos is a Canberra building design and drafting practice led by Jacob Woods, and it has built a strong record for a young studio: a 4.7 Google rating across nineteen reviews, and four ServiceSeeking Top 10 awards across two years, named among the top ten building designers and draftsmen in Canberra and regional New South Wales.\n\nJacob has worked in building design since qualifying in 2018, and runs each project himself from concept through to the working drawings a build needs for approval and construction, with all drafting in house. For an owner heading into council in the ACT, design and documentation under one roof is what keeps a project moving.",
    about:
      "Praeditos Designs & Drafting is a Canberra building design and drafting practice led by its director, Jacob Woods. Jacob completed a Diploma in Building Design in 2018 and has spent the years since designing and documenting homes, extensions and alterations across the ACT and surrounding New South Wales, working alongside a range of design and building companies before establishing his own practice. Praeditos focuses on residential and small commercial work, and carries each project through the full process, from initial concept and design advice to the detailed working drawings required for quoting, approval and construction. All drafting is completed in house, and the practice serves Canberra, Queanbeyan, Yass and the surrounding region, as well as remotely across Australia.",
    facts: {
      basedIn: "Canberra, ACT",
      serves: "Canberra, Queanbeyan and surrounding NSW",
      focus: "Homes, extensions and small commercial",
    },
    website: "https://www.praeditosdesigns.com.au",
    linkedin: "https://www.linkedin.com/in/jacob-woods-3999732b2/",
    facebook:
      "https://www.facebook.com/p/Praeditos-Designs-Drafting-100089866880565/",
    galleryUrl: "https://www.praeditosdesigns.com.au/projects",
    work: [
      {
        title: "Contemporary home",
        suburb: "Canberra region",
        type: "New home, two-storey",
        image: "/partners/praeditos-designs/contemporary.jpg",
      },
      {
        title: "Rendered family home",
        suburb: "Canberra region",
        type: "New home, two-storey",
        image: "/partners/praeditos-designs/rendered-home.jpg",
      },
      {
        title: "Single-storey home",
        suburb: "Canberra region",
        type: "New home",
        image: "/partners/praeditos-designs/single-storey.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "paul-tilse-architects",
    kind: "architect",
    draft: true,
    name: "Paul Tilse Architects",
    monogram: "PT",
    logo: "/partners/paul-tilse-architects/logo.png",
    principal: "Paul Tilse",
    suburb: "Kingston",
    state: "ACT",
    tagline:
      "Award winning architecture and interiors from a Canberra studio working across homes, commercial and government projects since 2003.",
    disciplines: ["Custom homes", "Renovations and extensions", "Interiors"],
    google: { rating: 4, reviews: 3 },
    institution: {
      name: "Australian Institute of Architects",
      role: "ACT Architecture Award winner",
      note: "A registered architecture practice since 2003",
    },
    stats: [
      { label: "Google rating", value: "4.0", star: true, sub: "3 reviews" },
      { label: "Established", value: "2003", sub: "over twenty years" },
      {
        label: "Industry awards",
        value: "20+",
        sub: "for its projects, 2013 to 2025",
      },
    ],
    awards: [
      {
        label: "MBA ACT House of the Year",
        sub: "2024 · the Pavilion House, with builder Brother Projects",
      },
      {
        label: "HIA National Bathroom of the Year",
        sub: "2020 · the Furneaux House",
      },
      {
        label: "Renovation and extension over $2.5 million",
        sub: "MBA ACT 2025 · the Ricotta House",
      },
    ],
    why: "Paul Tilse Architects is one of Canberra's most awarded residential practices. Established in 2003, the studio has spent more than twenty years designing homes, interiors and commercial work for private and government clients, and its projects have collected a long line of honours: the 2024 MBA ACT House of the Year for the Pavilion House, a national HIA Bathroom of the Year, and an ACT Architecture Award among more than twenty across the past decade. Paul Tilse and his team are registered architects who treat each brief as a problem to resolve into a clear, considered building, and their work is regularly published in titles such as The Local Project and Home Beautiful. For an owner who wants genuine architecture in the capital, this is a practice of real standing.",
    about:
      "Paul Tilse Architects is a Kingston based architecture and interiors studio established in 2003. Over more than twenty years it has delivered residential, commercial and retail projects across Canberra, Sydney, Melbourne and Queensland, for private and government clients, and works at every scale from a bespoke kitchen to a whole new home. The practice is led by registered architect Paul Tilse, and treats each commission as a fresh problem, synthesising the client's requirements into an efficient and vibrant architectural form. Its projects have been widely recognised, with MBA ACT and HIA awards including the 2024 House of the Year, and have been published across titles including The Local Project, Home Beautiful and The Design Files.",
    facts: {
      established: "2003",
      basedIn: "Kingston, ACT",
      serves: "Canberra and the eastern states",
      focus: "Homes, interiors and commercial",
    },
    website: "https://paultilsearchitects.com.au",
    instagram: "https://www.instagram.com/paul_tilse_architects/",
    linkedin: "https://www.linkedin.com/in/paul-tilse-5481759/",
    galleryUrl: "https://paultilsearchitects.com.au/works/",
    work: [
      {
        title: "Pavilion House",
        suburb: "Canberra",
        type: "New home",
        image: "/partners/paul-tilse-architects/pavilion.jpg",
      },
      {
        title: "Oblique House",
        suburb: "Canberra",
        type: "Kitchen and interiors",
        image: "/partners/paul-tilse-architects/oblique.jpg",
      },
      {
        title: "Ricotta House",
        suburb: "Canberra",
        type: "Renovation and extension",
        image: "/partners/paul-tilse-architects/ricotta.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "architects-ring-associates",
    kind: "architect",
    name: "Architects Ring & Associates",
    monogram: "AR",
    logo: "/partners/architects-ring-associates/logo.png",
    principal: "Terence Ring",
    suburb: "Kingston",
    state: "ACT",
    tagline:
      "One of Canberra's most awarded architecture practices, designing homes and buildings across the capital since 1991.",
    disciplines: ["Custom homes", "Multi-unit and commercial", "Interiors"],
    google: { rating: 4.8, reviews: 12 },
    institution: {
      name: "Australian Institute of Architects",
      role: "Member practice",
      note: "Registered architects · ACT 967, NSW 11797",
    },
    stats: [
      { label: "Google rating", value: "4.8", star: true, sub: "12 reviews" },
      {
        label: "Established",
        value: "1991",
        sub: "founder in Canberra since 1975",
      },
      { label: "Industry awards", value: "100+", sub: "local and national" },
    ],
    awards: [
      {
        label: "ACT House of the Year, twelve times",
        sub: "Master Builders ACT",
      },
      {
        label: "MBA National House of the Year, three times",
        sub: "Master Builders Australia",
      },
      {
        label: "AIA President's Award",
        sub: "Australian Institute of Architects · 2004",
      },
    ],
    why: "Architects Ring & Associates is one of Canberra's most awarded architecture practices, and one of its most senior. Founded in 1991 by Terence Ring, who has designed in the capital since 1975, the studio has been named ACT House of the Year twelve times and MBA National House of the Year three times, among more than one hundred local and national awards.\n\nTerry himself holds the Australian Institute of Architects President's Award and the ACT Chapter Medallion for Architecture, and the practice's commissions range from luxury homes to an extension of the Governor-General's residence, alongside community and Indigenous housing work. Its architects are registered in the ACT and NSW, and few practices know Canberra's sites and planning rules as intimately. For an owner planning something of ambition in the capital, this is about as assured as an introduction gets.",
    about:
      "Architects Ring & Associates is a Kingston based architecture and interior design practice, founded in 1991 by its director Terence Ring, who has practised in Canberra since 1975 and taught architecture and interior design at the Canberra Institute of Technology. The firm began in a home studio in Griffith through one of Australia's worst recessions and grew into one of the capital's most established, now working from a multi-storey building it designed on Wentworth Avenue. ARAA designs across the luxury residential, commercial, multi-unit and heritage sectors, and gives back through Indigenous and community housing, places of worship and an annual schools mentoring program. Its work has won more than one hundred awards, including the ACT House of the Year twelve times and the MBA National House of the Year three times, and Terry holds the AIA President's Award and the ACT Chapter Medallion for Architecture. The practice designs around the idea of 'genius loci', a sense of place, and many of its homes are still owned by the clients who first commissioned them decades ago.",
    facts: {
      established: "1991",
      basedIn: "Kingston, ACT",
      serves: "Canberra and NSW",
      focus: "Homes, interiors and commercial",
    },
    website: "https://araa.com.au",
    instagram: "https://www.instagram.com/araa_canberra/",
    facebook:
      "https://www.facebook.com/people/Architects-Ring-Associates/100063538931839/",
    linkedin: "https://www.linkedin.com/in/terry-terence-ring-45831a3b/",
    galleryUrl: "https://araa.com.au/houses/",
    work: [
      {
        title: "Bruce Residence",
        suburb: "Bruce",
        type: "New home",
        image: "/partners/architects-ring-associates/bruce.jpg",
      },
      {
        title: "Tennyson Project",
        suburb: "Canberra",
        type: "Custom home",
        image: "/partners/architects-ring-associates/tennyson.jpg",
      },
      {
        title: "Hughes Extension",
        suburb: "Hughes",
        type: "Extension and addition",
        image: "/partners/architects-ring-associates/hughes.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "paramount-conveyancing",
    kind: "conveyancer",
    roleLabel: "Conveyancing firm",
    name: "Paramount Conveyancing",
    monogram: "PC",
    logo: "/partners/paramount-conveyancing/logo.png",
    principal: "Sasha Obeid",
    suburb: "Greenvale",
    state: "VIC",
    tagline:
      "A Victorian conveyancing firm that reads the title, the covenants and the overlays before a client commits to a site.",
    disciplines: ["Contract and Section 32 review", "Off the plan", "Development sites"],
    google: { rating: 4.8, reviews: 390 },
    institution: {
      name: "Australian Institute of Conveyancers",
      role: "Victorian Division member",
      note: "Licensed under the Conveyancers Act 2006 · professional indemnity insured",
    },
    aboutLabel: "The firm",
    stats: [
      { label: "Google rating", value: "4.8", star: true, sub: "390 reviews" },
      { label: "Established", value: "2010", sub: "sixteen years of settlements" },
      { label: "Offices", value: "3", sub: "across metropolitan Melbourne" },
    ],
    why: "A conveyancer is the first professional to look at a block of land, and often the only one who reads what is actually on the title. Restrictive covenants, easements and planning overlays decide whether the house a client is planning can legally be built there, and a covenant stays binding however old it is. Removing one takes a Supreme Court application or a planning scheme amendment. An owner who finds that out after settlement has bought the wrong site.\n\nParamount has been doing this since 2010, and works the way that problem needs: in early, alongside the builder, the broker and the agent, rather than at the end when the paperwork is already drawn. Sasha Obeid founded the firm and is a member of the Australian Institute of Conveyancers, Victorian Division. Conveyancing is all they do, which is rather the point. For an owner or a developer buying land to build on, this is the call to make before the offer, not after it.",
    about:
      "Paramount Conveyancing is a Victorian firm founded in 2010 by director Sasha Obeid, working from offices in Greenvale, Melbourne CBD and Hoppers Crossing. The team handles residential and commercial transactions: established homes, land, off the plan purchases, development sites and investment property, along with subdivisions, mortgages and refinances. They act for local and international clients, and regularly work with developers, builders, buyers agents, mortgage brokers and real estate agents. The firm does not carry out financial feasibility work. What it does is review contracts, Section 32 statements, title, planning and related documentation, flag the problems, and make sure a client understands what they are committing to.",
    facts: {
      established: "2010",
      basedIn: "Greenvale, VIC",
      serves: "Victoria",
      focus: "Residential and commercial conveyancing",
    },
    website: "https://paramountconveyancing.com.au/",
    instagram: "https://www.instagram.com/paramount.conveyancing/",
    facebook: "https://www.facebook.com/ParamountConveyancing",
    linkedin: "https://www.linkedin.com/company/paramount-conveyancing",
    servicesLabel: "Where they help",
    services: [
      "Contract and Section 32 review before you sign",
      "Title, covenant and easement checks",
      "Off the plan purchases",
      "Land and development site acquisitions",
      "Subdivisions and settlements",
      "Sales, mortgages and refinances",
    ],
    joined: "2026",
  },
  {
    slug: "csd-studio",
    kind: "architect",
    draft: true,
    roleLabel: "Building and interior design studio",
    name: "CSD Studio",
    monogram: "CS",
    logo: "/partners/csd-studio/logo.png",
    principal: "Parampreet Kaur",
    suburb: "Canberra",
    state: "ACT",
    tagline:
      "An integrated building and interior design studio shaping homes and spaces across Canberra and Melbourne, considered inside and out.",
    disciplines: ["Custom homes", "Renovations and additions", "Interior design"],
    stats: [
      { label: "In practice", value: "8+ yrs", sub: "architecture and interiors" },
      {
        label: "Master's degree",
        value: "Interiors",
        sub: "The Glasgow School of Art",
      },
      {
        label: "Worked across",
        value: "3 countries",
        sub: "Australia, India and Dubai",
      },
    ],
    why: "CSD Studio, short for Concept Space Design, is a building and interior design practice led by Parampreet Kaur, and its distinction is the range she brings to a brief. Param graduated top of her cohort with a Bachelor of Architecture, awarded the Gold Medal for outstanding all round performance, and holds a Master of Interior Design from the Glasgow School of Art, with work spanning high end residential, hospitality and commercial projects across Australia, India and Dubai. That breadth shows in the studio's approach: homes and spaces resolved holistically, inside and out, carried from concept and spatial planning through material selection, approvals and delivery. CSD works across Canberra and Melbourne on custom homes, renovations, secondary dwellings, dual occupancies and multi-unit projects. For an owner who wants design that is considered rather than decorated, Param is a genuinely capable pair of hands.",
    about:
      "CSD Studio, short for Concept Space Design, is a building and interior design practice led by its director, Parampreet Kaur. Param holds a Bachelor of Architecture, for which she received the Gold Medal for top all round performance, and a Master of Interior Design from the Glasgow School of Art, and brings more than eight years across the architecture and interior design industry in Australia, India and Dubai, spanning high end residential, hospitality, commercial and workplace projects. The studio offers an end to end service, from concept and spatial planning through material selection, approvals and project delivery, and works across custom homes, renovations and additions, secondary dwellings, dual occupancies, retail and commercial fit-outs and multi-unit developments in the ACT and Melbourne. Param's approach balances aesthetics, function and the needs of the people who use a space, aiming for work that is refined, enduring and purpose-driven.",
    facts: {
      basedIn: "Canberra, ACT",
      serves: "Canberra and Melbourne",
      focus: "Homes, interiors and multi-unit",
    },
    website: "https://www.csdstudio.com.au",
    instagram: "https://www.instagram.com/csdstudio_au/",
    facebook: "https://www.facebook.com/csdstudio.canberra/",
    linkedin: "https://www.linkedin.com/in/param4988/",
    galleryUrl: "https://www.csdstudio.com.au",
    work: [
      {
        title: "Curved home",
        suburb: "Canberra",
        type: "New build",
        image: "/partners/csd-studio/curved-home.jpg",
      },
      {
        title: "Living room",
        suburb: "Canberra",
        type: "Interior",
        image: "/partners/csd-studio/interior.jpg",
      },
      {
        title: "Custom home",
        suburb: "Canberra",
        type: "New build",
        image: "/partners/csd-studio/custom-home.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "levan-design",
    kind: "architect",
    roleLabel: "Building design practice",
    name: "Levan Design",
    monogram: "LD",
    logo: "/partners/levan-design/logo.png",
    logoFloat: "/partners/levan-design/logo-float-v2.png",
    principal: "Natasha Levan",
    suburb: "Eltham",
    state: "VIC",
    tagline:
      "A boutique Eltham practice where one designer carries your home from first sketch to documentation, as she has for more than two decades.",
    disciplines: ["New homes", "Renovations and extensions", "Interior design"],
    google: { rating: 5.0, reviews: 13 },
    institution: {
      name: "Design Matters National",
      role: "Member",
      note: "Registered building practitioner · Victorian Building Authority",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "13 reviews" },
      {
        label: "In the industry",
        value: "30+ yrs",
        sub: "designing since 1994",
      },
      {
        label: "Her own practice",
        value: "2003",
        sub: "Levan Design, Eltham",
      },
    ],
    why:
      "Levan Design is the register’s boutique in the truest sense: one designer, Natasha Levan, who has drawn buildings for more than thirty years and has run her own residential practice since 2003. Behind that sits commercial and institutional work, multi-storey apartments and interiors, and five years inside Englehart Homes, one of Melbourne’s established custom builders, where she learned how houses actually get priced and built.\n\nEvery client gets Natasha herself, from first sketch to final documentation, with a perfect rating across thirteen reviews behind her. She is a registered building practitioner with the Victorian Building Authority and a member of Design Matters National. For owners in Melbourne’s north east who want one pair of hands on their home, this is it.",
    about:
      "Levan Design is a residential building design practice in Eltham, run by its principal, Natasha Levan, since 2003. Natasha has worked in building design since 1994, beginning with a South Melbourne architectural firm and building a portfolio that spans commercial and institutional projects, multi-storey apartments and interiors, before five years with Englehart Homes drew her to residential design for good. The practice is deliberately small and personal: new homes, renovations, extensions and interiors, designed and documented by the same hand throughout, with an eye shaped by a lifelong interest in art and architecture. Natasha holds an Associate Diploma in Architectural Drafting, is a registered building practitioner with the Victorian Building Authority, and is a member of Design Matters National.",
    facts: {
      established: "2003",
      basedIn: "Eltham, VIC",
      serves: "Melbourne's north east and beyond",
      focus: "Homes, extensions and interiors",
    },
    website: "https://www.levandesign.com.au",
    instagram: "https://www.instagram.com/levan_design/",
    linkedin: "https://www.linkedin.com/in/natasha-levan-839967b8/",
    galleryUrl: "https://www.levandesign.com.au/projects",
    work: [
      {
        title: "Rathmines Street",
        suburb: "Melbourne",
        type: "Rear extension",
        image: "/partners/levan-design/rathmines.jpg",
      },
      {
        title: "Argyle Street",
        suburb: "Melbourne",
        type: "Kitchen and interiors",
        image: "/partners/levan-design/argyle.jpg",
      },
      {
        title: "Florence Street",
        suburb: "Melbourne",
        type: "Kitchen and dining",
        image: "/partners/levan-design/florence.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "maxa-design",
    kind: "architect",
    draft: true,
    roleLabel: "Sustainable building design",
    name: "Maxa Design",
    monogram: "MD",
    logo: "/partners/maxa-design/logo.png",
    principal: "Sven and Dawn Maxa",
    suburb: "Blackburn",
    state: "VIC",
    tagline:
      "Australia's sustainable design specialists: award winning eco and Passivhaus homes, designed to brief and budget by a carbon neutral practice.",
    disciplines: ["Passivhaus and eco homes", "New homes", "Renovations"],
    google: { rating: 4.7, reviews: 19 },
    institution: {
      name: "Design Matters National",
      role: "Member practice",
      note: "Principal Sven Maxa · Certified Passivhaus Designer · registered in every state",
    },
    stats: [
      { label: "Google rating", value: "4.7", star: true, sub: "19 reviews" },
      {
        label: "Industry awards",
        value: "25+",
        sub: "including Design of the Year, twice",
      },
      {
        label: "Established",
        value: "2004",
        sub: "carbon neutral, a team of nine",
      },
    ],
    awards: [
      {
        label: "Building Design of the Year, twice",
        sub: "Design Matters National · Canal Haus 2023 · Donvale 2020",
      },
      {
        label: "10 Star Sustainable Design Challenge, winner",
        sub: "BDAV 2015 · the Arc, Australia's first 10 star relocatable home",
      },
      {
        label: "Best Small Sustainable Practice",
        sub: "Sustainability Awards · 2023",
      },
    ],
    why: "Maxa Design is the sustainability authority on our register, and the record reads like it. The practice has been named Building Design of the Year twice, for Canal Haus in 2023 and Donvale in 2020, holds more than two dozen industry awards from a published honours list that runs to nearly fifty entries, and designed the Arc, Australia's first 10 star rated relocatable home. Principal Sven Maxa is a Certified Passivhaus Designer, a registered building practitioner in every Australian state, a past member of Design Matters National's Committee of Management and a former awards judge, and the practice itself is carbon neutral. What makes that record useful to an owner is the discipline behind it: two decades of designing high performance homes to brief and to budget, proving sustainable and beautiful are the same project.",
    about:
      "Maxa Design is a Blackburn based building design practice founded in 2004 by Sven and Dawn Maxa, and grown from a husband and wife studio into a team of nine. The practice specialises in eco and energy efficient homes, from new builds and renovations through to certified Passivhaus projects, designed with a practical, can-do approach that holds to brief and budget. Its work has collected more than two dozen awards, including Building Design of the Year twice and the BDAV 10 Star Sustainable Design Challenge for the Arc, Australia's first 10 star rated relocatable home. Sven, a Certified Passivhaus Designer registered in every Australian state, presents regularly to industry and advocates for eco home design; Dawn has shaped the practice's growth through business, marketing and interiors, including the couple's award winning Nunawading home featured in Inside Out. The practice is carbon neutral.",
    facts: {
      established: "2004",
      basedIn: "Blackburn, VIC",
      serves: "Melbourne, with projects interstate",
      focus: "Eco, energy efficient and Passivhaus homes",
    },
    website: "https://www.maxadesign.com.au",
    instagram: "https://www.instagram.com/maxadesign_",
    facebook: "https://www.facebook.com/maxadesign",
    linkedin: "https://www.linkedin.com/company/maxa-design/",
    galleryUrl: "https://www.maxadesign.com.au/projects",
    work: [
      {
        title: "Canal Haus",
        suburb: "Queensland",
        type: "Canal-front new home",
        image: "/partners/maxa-design/canal-haus.jpg",
      },
      {
        title: "Surrey Hills",
        suburb: "Surrey Hills",
        type: "New family home",
        image: "/partners/maxa-design/surrey-hills.jpg",
      },
      {
        title: "Kyneton",
        suburb: "Kyneton",
        type: "Kitchen and interiors",
        image: "/partners/maxa-design/kyneton.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "sydesign",
    kind: "architect",
    draft: true,
    roleLabel: "Building design studio",
    name: "Sydesign",
    monogram: "SY",
    logo: "/partners/sydesign/logo.png",
    principal: "Shady Younes",
    suburb: "Stanmore",
    state: "NSW",
    tagline:
      "A Sydney studio of twenty five years, designing homes that stand out while fitting in, and steering them through council to completion.",
    disciplines: ["New homes", "Renovations and additions", "Multi-residential"],
    google: { rating: 4.9, reviews: 107 },
    stats: [
      { label: "Google rating", value: "4.9", star: true, sub: "107 reviews" },
      {
        label: "Established",
        value: "2000",
        sub: "twenty five years in Sydney",
      },
      {
        label: "Best of Houzz",
        value: "3",
        sub: "Design and Service, 2024 and 2025",
      },
    ],
    awards: [
      {
        label: "Best of Houzz Design, two years running",
        sub: "Houzz · 2024 and 2025",
      },
      {
        label: "Best of Houzz Service",
        sub: "Houzz · 2025",
      },
      {
        label: "Best of Houzz Winner",
        sub: "Houzz · three years running, to 2020",
      },
    ],
    why: "Sydesign has spent twenty five years designing homes for Sydney, and the numbers behind the studio are hard to argue with: a 4.9 rating across 107 reviews, the deepest review base of any design practice on our register, and Best of Houzz honours in both design and service across multiple years. Founded in 2000 by principal Shady Younes, the Stanmore studio pairs a boutique team of designers and technicians with an international blend of influences, and carries each project from concept through development applications, complying development and working drawings. That fluency with Sydney's councils and private certifiers is precisely what a NSW owner needs beside them, approvals are where Sydney projects live or die, and this studio navigates them daily.",
    about:
      "Sydesign is a building design studio in Stanmore, in Sydney's inner west, founded in 2000 by principal Shady Younes. The studio designs new homes, renovations and additions, and multi-residential projects across Sydney, working as a small, close team of designers and technicians who carry each commission from concept design through development applications or complying development to full working drawings. Long experience with Sydney's local councils and private certifiers keeps approvals moving, and the studio composes the right team for each project's scale and setting. Its work balances big picture aesthetics with fine detail, designed to respond to changing environments and ways of living, and has been recognised with Best of Houzz awards for both design and service across multiple years.",
    facts: {
      established: "2000",
      basedIn: "Stanmore, NSW",
      serves: "Sydney",
      focus: "Homes, additions and multi-residential",
    },
    website: "https://www.sydesign.com.au",
    instagram: "https://www.instagram.com/sydesign_sydney/",
    linkedin: "https://www.linkedin.com/in/shady-younes-75ba9185/",
    galleryUrl: "https://www.sydesign.com.au/projects",
    work: [
      {
        title: "Cabarita House",
        suburb: "Cabarita",
        type: "New home and pool",
        image: "/partners/sydesign/cabarita.jpg",
      },
      {
        title: "Hunters Hill",
        suburb: "Hunters Hill",
        type: "New family home",
        image: "/partners/sydesign/hunters-hill.jpg",
      },
      {
        title: "Bateau Bay",
        suburb: "Bateau Bay",
        type: "Courtyard living",
        image: "/partners/sydesign/bateau-bay.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "design-unity",
    kind: "architect",
    draft: true,
    roleLabel: "Building design practice",
    name: "Design Unity",
    monogram: "DU",
    logo: "/partners/design-unity/logo.png",
    principal: "Warren Jenkins",
    suburb: "Warragul",
    state: "VIC",
    tagline:
      "Designing custom homes across Gippsland and Melbourne's south east since 1999, weighing construction cost, running cost and environmental impact in every set of drawings.",
    disciplines: ["Custom homes", "Interior design", "Town planning"],
    google: { rating: 5, reviews: 4 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "4 reviews" },
      {
        label: "Industry awards",
        value: "30+",
        sub: "across two decades of practice",
      },
      {
        label: "Established",
        value: "1999",
        sub: "designing homes for over 25 years",
      },
    ],
    awards: [
      {
        label: "Best of Houzz, Design and Service",
        sub: "Houzz · 2018",
      },
      {
        label: "Abode Awards, winner",
        sub: "2012",
      },
      {
        label: "Casey Business Awards, winner",
        sub: "2012",
      },
    ],
    why: "Design Unity has been designing homes under Warren Jenkins since 1999, and the practice thinks about cost the way owners have to live with it. Every design is weighed for its construction cost and its ongoing running costs together, alongside function and environmental impact, a discipline most practices never formalise. More than 30 industry awards back the approach, including Best of Houzz honours for both design and service, and the service span runs well past the drawings: interior design, town planning, project tendering, consultant coordination and project management are all carried in house. For owners building in Gippsland or Melbourne's south east, that is a rare combination of design ambition and delivery control.",
    about:
      "Design Unity is a building design practice in Warragul, led by Warren Jenkins and designing custom homes across Gippsland and Melbourne's south east since 1999. The practice takes a whole of life view of every project, balancing construction cost, ongoing running costs, function and environmental impact from the first sketch, and its work has been recognised with more than 30 industry awards, including Best of Houzz honours for design and service and business excellence awards across Melbourne's south east. Services run from concept design and architectural drafting through interior design, town planning and project tendering to consultant coordination and project management, supported by a settled network of builders, consultants and suppliers built over two decades. The result is a practice that carries a home from first idea to handover with the same team accountable throughout.",
    facts: {
      established: "1999",
      basedIn: "Warragul, VIC",
      serves: "Gippsland and Melbourne's south east",
      focus: "Custom homes, designed whole of life",
    },
    website: "https://designunity.com.au",
    instagram: "https://www.instagram.com/design_unity/",
    facebook: "https://www.facebook.com/people/Design-Unity/100063648185991/",
    linkedin: "https://www.linkedin.com/company/design-unity/",
    galleryUrl: "https://designunity.com.au/completed-projects/",
    work: [
      {
        title: "Resort-style living",
        suburb: "Victoria",
        type: "New home and pool",
        image: "/partners/design-unity/work-1.jpg",
      },
      {
        title: "Family entertainer",
        suburb: "Victoria",
        type: "New home, court and pool",
        image: "/partners/design-unity/work-2.jpg",
      },
      {
        title: "Alfresco laneway",
        suburb: "Victoria",
        type: "Outdoor living",
        image: "/partners/design-unity/work-3.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "neighbourhood-architecture",
    kind: "architect",
    name: "Neighbourhood Architecture",
    monogram: "NA",
    logo: "/partners/neighbourhood-architecture/logo.png",
    principal: "Chris Clode and Brendan McGregor",
    suburb: "Kingston",
    state: "ACT",
    tagline:
      "Canberra’s high-performance home specialists, designing new homes, renovations and extensions with energy performance tested from the first concept.",
    disciplines: ["New homes", "Renovations and extensions", "Energy performance modelling"],
    google: { rating: 5.0, reviews: 13 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "13 reviews" },
      {
        label: "MBA and HIA honours",
        value: "16",
        sub: "including three wins, 2022 to 2025",
      },
      {
        label: "Architect registrations",
        value: "2",
        sub: "ACT and New South Wales",
      },
    ],
    awards: [
      {
        label: "Sustainable Residential Project, winner",
        sub: "Master Builders ACT · 2025 · Tocumwal Revival",
      },
      {
        label: "Custom Built Home, winner",
        sub: "Master Builders ACT · 2022 · Flow House",
      },
      {
        label: "People’s Choice Award, winner",
        sub: "Master Builders ACT · 2022 · Flow House",
      },
    ],
    why: "Most homes are designed first and assessed for energy performance afterwards, which is the wrong order: by the time a rating comes back, orientation, glazing and shading are already settled. Neighbourhood Architecture inverts that. NatHERS approved modelling runs from the start, so those decisions, along with insulation and thermal performance, are tested while they are still easy to change.\n\nBehind it sits an uncommon pairing. Chris Clode is a registered architect; Brendan McGregor is an HIA GreenSmart Professional who led design at Light House Architecture and Science before the two founded the practice. One small team therefore covers both the architecture and the energy expertise, and can carry a project from concept and approvals through documentation, builder tendering and support on site. Sixteen Master Builders and HIA honours since 2022 say the industry agrees, most recently the 2025 Master Builders ACT award for Sustainable Residential Project. For an owner who wants a home that is beautiful, buildable and cheap to run through a Canberra winter, that is a rare combination.",
    about:
      "Neighbourhood Architecture is a Canberra architecture practice established in 2021 by directors Chris Clode and Brendan McGregor, working from the Kingston Foreshore. Chris holds architect registration in the ACT and New South Wales, numbers 2618 and 11914, alongside a Masters in Architecture from the University of Canberra. Brendan is the practice’s lead designer and holds a Certificate IV in Home Energy Efficiency and Sustainability. The team designs bespoke new homes, renovations and extensions throughout Canberra and southern New South Wales, combining passive solar principles with site-specific architecture and close attention to natural light, comfort and buildability, and to how a house contributes to the street it stands in. Recent work runs from the Tocumwal Revival heritage renovation at O’Connor to the Plant House and Flow House at Denman Prospect.",
    facts: {
      established: "2021",
      basedIn: "Kingston, ACT",
      serves: "Canberra and southern NSW",
      focus: "High-performance homes and renovations",
    },
    website: "https://neighbourhoodarchitecture.com.au",
    instagram: "https://www.instagram.com/neighbourhood_architecture/",
    facebook: "https://www.facebook.com/Neighbourhoodarchitecture/",
    galleryUrl: "https://neighbourhoodarchitecture.com.au/projects/",
    work: [
      {
        title: "Tocumwal Revival",
        suburb: "O’Connor",
        type: "Heritage renovation and rear addition",
        image: "/partners/neighbourhood-architecture/tocumwal-revival.jpg",
        href: "https://neighbourhoodarchitecture.com.au/project/tocumwal-revival/",
      },
      {
        title: "Plant House",
        suburb: "Denman Prospect",
        type: "8.1 star solar passive new home",
        image: "/partners/neighbourhood-architecture/plant-house.jpg",
        href: "https://neighbourhoodarchitecture.com.au/project/plant-house/",
      },
      {
        title: "Flow House",
        suburb: "Denman Prospect",
        type: "Solar passive new home on a sloping site",
        image: "/partners/neighbourhood-architecture/flow-house.jpg",
        href: "https://neighbourhoodarchitecture.com.au/project/flow-house/",
      },
    ],
    joined: "2026",
  },
  {
    slug: "dna-architects",
    kind: "architect",
    name: "DNA Architects",
    monogram: "DA",
    logo: "/partners/dna-architects/logo.png",
    logoFloat: "/partners/dna-architects/logo-float-v2.png",
    principal: "AJ Bala and four fellow directors",
    suburb: "Braddon",
    state: "ACT",
    tagline:
      "One of Canberra's most awarded residential practices: a Braddon studio of more than twenty architects and designers, designing homes across the capital and the coast since 2001.",
    disciplines: ["New homes", "Renovations and extensions", "Multi-residential"],
    google: { rating: 4, reviews: 11 },
    stats: [
      { label: "Google rating", value: "4.0", star: true, sub: "11 reviews" },
      {
        label: "Industry awards",
        value: "50+",
        sub: "MBA, HIA and AIA, 2010 to 2025",
      },
      {
        label: "Architects and designers",
        value: "20+",
        sub: "led by five directors",
      },
    ],
    awards: [
      {
        label: "House of the Year, HIA and Master Builders",
        sub: "ACT and Southern NSW · 2022",
      },
      {
        label: "Townhouse Villa Development of the Year, twice",
        sub: "HIA Australia · 2020 and 2021",
      },
      {
        label: "National Medium Density, winner",
        sub: "Master Builders Australia · 2021",
      },
    ],
    why:
      "DNA Architects is the largest design practice on our register, and the awards case is hard to match: more than fifty MBA, HIA and AIA honours, House of the Year from both HIA and Master Builders in 2022, and HIA Australia’s national Townhouse Villa Development of the Year twice.\n\nEstablished in 2001 by Glen Dowse and Ross Norwood, the Braddon studio now runs more than twenty architects and designers under five directors, four of them registered architects, including a Fellow of the Australian Institute of Architects. Director AJ Bala, a registered architect, leads client work with the people focused approach it was built on. A studio this decorated that still runs on repeat clients and referrals is the partner we want beside an owner.",
    about:
      "DNA Architects, Dowse Norwood and Associates, is a registered architecture practice in Braddon, established in 2001 by Glen Dowse and Ross Norwood and grown to a studio of more than twenty architects and designers under five directors, among them AJ Bala, a registered architect. The practice designs new homes, renovations and multi-residential projects across Canberra and southern New South Wales, alongside commercial and interior work, and its record spans more than fifty industry honours, including House of the Year from both HIA and Master Builders in 2022, HIA Australia's national Townhouse Villa Development of the Year in 2020 and 2021, and a national medium density award from Master Builders Australia. The studio listens first and designs to the site and the client rather than to a house style, an approach that keeps most of its work arriving through repeat clients and referrals.",
    facts: {
      established: "2001",
      basedIn: "Braddon, ACT",
      serves: "Canberra and southern NSW",
      focus: "Homes, multi-residential and interiors",
    },
    website: "https://dnaa.com.au",
    instagram: "https://www.instagram.com/dna_architects/",
    linkedin: "https://www.linkedin.com/company/dna-architects-pty-ltd/",
    galleryUrl: "https://dnaa.com.au/portfolio/",
    work: [
      {
        title: "Guerilla Bay house",
        suburb: "Guerilla Bay",
        type: "Coastal home",
        image: "/partners/dna-architects/guerilla-bay.jpg",
      },
      {
        title: "Curved roof house",
        suburb: "Canberra",
        type: "House and pool",
        image: "/partners/dna-architects/curved-house.jpg",
      },
      {
        title: "Black and timber kitchen",
        suburb: "Canberra",
        type: "Interior",
        image: "/partners/dna-architects/kitchen.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "adam-hobill-design",
    kind: "architect",
    roleLabel: "Residential building design practice",
    name: "Adam Hobill Design",
    monogram: "AH",
    logo: "/partners/adam-hobill-design/logo.png",
    principal: "Adam Hobill",
    suburb: "Narrabundah",
    state: "ACT",
    tagline:
      "A Narrabundah practice named the region’s Residential Building Designer of the Year six times over, designing custom homes, extensions and renovations across Canberra and southern New South Wales.",
    disciplines: ["Custom homes", "Extensions and renovations", "Spec and display homes"],
    google: { rating: 5.0, reviews: 10 },
    awards: [
      {
        label: "National Design Excellence, winner",
        sub: "Building Designers Association of Australia, 2021",
      },
      {
        label: "Residential Building Designer of the Year, six times",
        sub: "HIA ACT and southern NSW, 2003 to 2020",
      },
      {
        label: "National winner, New Residential Building",
        sub: "Building Designers Association of Australia, the Treehouse, 2021",
      },
    ],
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "10 reviews" },
      {
        label: "Designer of the Year",
        value: "6",
        sub: "times, HIA ACT and southern NSW",
      },
      {
        label: "Projects completed",
        value: "500+",
        sub: "in twenty five years",
      },
    ],
    why: "Being named your region’s best designer is one thing. Being named it six times is another. The Housing Industry Association has made Adam Hobill its Residential Building Designer of the Year for the ACT and southern New South Wales on six occasions between 2003 and 2020, and in 2021 the Building Designers Association of Australia handed the practice its national Design Excellence award. Beneath those sit close to sixty awards and nominations across the HIA, Master Builders and the BDAA, stretching back two decades.\n\nWhat lies behind the trophies is a designer who has been on building sites since childhood, on his family’s own jobs, and who has since carried more than five hundred projects through to completion, including two homes for his own family. That last detail counts for more than it sounds, because he has stood where his clients stand, signing for a house he then has to live in. Adam still works personally on every project, at a pace set by the decisions rather than the calendar. For a Canberra family who want a home shaped around the way they actually live, that is a rare depth of experience.",
    about:
      "Adam Hobill Design is a boutique residential building design practice in Narrabundah, Canberra, working across the ACT and southern New South Wales. Adam Hobill is its director and principal designer. The practice takes on custom homes, extensions and renovations, and is unusually direct about its range, typically working on extension and renovation projects from around five hundred thousand dollars, and nine hundred thousand plus on a new home. Its houses have appeared in House and Garden, Home Beautiful and Inside Out. The practice specialises in new builds that are on brief and on budget.",

    facts: {
      experience: "25+ yrs",
      basedIn: "Narrabundah, ACT",
      serves: "Canberra and southern NSW",
      focus: "Custom homes, extensions and renovations",
    },
    website: "https://adamhobilldesign.com.au",
    instagram: "https://www.instagram.com/adamhobilldesign/",
    linkedin: "https://www.linkedin.com/in/adam-hobill-a8191b3/",
    galleryUrl: "https://adamhobilldesign.com.au",
    work: [
      {
        title: "Griffith",
        suburb: "Griffith",
        type: "New home and pool",
        image: "/partners/adam-hobill-design/griffith.jpg",
      },
      {
        title: "Turner",
        suburb: "Turner",
        type: "New home",
        image: "/partners/adam-hobill-design/turner.jpg",
      },
      {
        title: "Red Hill",
        suburb: "Red Hill",
        type: "New home",
        image: "/partners/adam-hobill-design/red-hill.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "atria-designs",
    kind: "architect",
    draft: true,
    roleLabel: "Building design studio",
    name: "Atria Designs",
    monogram: "AD",
    logo: "/partners/atria-designs/logo.png",
    principal: "Samuel Kassis",
    suburb: "Rouse Hill",
    state: "NSW",
    tagline:
      "The Rouse Hill studio behind Australia's Display Home of the Year 2024, designing custom homes for owners and display homes for the country's best builders since 2015.",
    disciplines: ["Custom homes", "Duplexes", "Commercial projects"],
    institution: {
      name: "Building Designers Association of Australia",
      role: "Member",
      note: "Director a BDAA member since 2016",
    },
    google: { rating: 4.5, reviews: 23 },
    stats: [
      { label: "Google rating", value: "4.5", star: true, sub: "23 reviews" },
      {
        label: "Industry honours",
        value: "14",
        sub: "across BDAA, HIA and MBA, since 2016",
      },
      {
        label: "Established",
        value: "2015",
        sub: "BDAA Rookie of the Year in 2016",
      },
    ],
    awards: [
      {
        label: "Australian Display Home of the Year",
        sub: "HIA · 2024 · Jacks Point, with Horizon Homes",
      },
      {
        label: "National Design Awards, winner",
        sub: "Building Designers Association of Australia · 2023 · Mid Century Haven",
      },
      {
        label: "Master Builders NSW award, winner",
        sub: "2023 · Mid Century Haven, with Evolution Building Co",
      },
    ],
    why: "Atria Designs is the studio behind Australia's Display Home of the Year, the HIA's national award for 2024, won with builder Horizon Homes, and it backs that with a BDAA National Design Award of its own in 2023. That double is rare: recognition from the housing industry's biggest body and from the building designers' peak body, on top of fourteen industry honours since 2016. Founded by Samuel Kassis in 2015 and named BDAA Rookie of the Year within its first year, the Rouse Hill studio designs custom homes, duplexes and commercial projects, and is trusted by some of Australia's best builders and developers for their display and volume work. For owners that combination matters: boutique attention on your project, backed by the discipline of a studio that designs for the industry's best.",
    about:
      "Atria Designs is a building design studio in Rouse Hill, in Sydney's Hills District, founded by Samuel Kassis in 2015 and named BDAA Rookie of the Year within its first year. The team designs custom homes, renovations, duplexes and commercial projects across Sydney, and is also the design partner behind display and volume homes for some of Australia's best builders and developers, work that won HIA's Australian Display Home of the Year in 2024 and NSW Display Home of the Year in 2023 with Horizon Homes. The studio's own shelf carries a BDAA National Design Award for Mid Century Haven in 2023, and the team brings close to twenty years of industry experience to each commission. Its promise is a client experience worth having: your needs first, clear communication before, during and after the process, and designs that keep working for the people living in them years on.",
    facts: {
      established: "2015",
      basedIn: "Rouse Hill, NSW",
      serves: "Sydney and NSW",
      focus: "Custom homes, duplexes and display homes",
    },
    website: "https://www.atriadesigns.com.au",
    instagram: "https://www.instagram.com/atria_designs/",
    facebook: "https://www.facebook.com/atriadesigns.au",
    linkedin: "https://www.linkedin.com/company/atria-designs-au/",
    galleryUrl: "https://www.atriadesigns.com.au/project-gallery/",
    work: [
      {
        title: "Lennox Street",
        suburb: "Sydney",
        type: "Duplex",
        image: "/partners/atria-designs/lennox-street.jpg",
      },
      {
        title: "The Oasis",
        suburb: "Sydney",
        type: "Single storey living",
        image: "/partners/atria-designs/the-oasis.jpg",
      },
      {
        title: "Poolside home",
        suburb: "Sydney",
        type: "New home and pool",
        image: "/partners/atria-designs/poolside-home.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "dawes-design",
    kind: "architect",
    roleLabel: "Building design and drafting",
    name: "Dawes Design & Drafting Group",
    monogram: "DD",
    logo: "/partners/dawes-design/logo.png",
    logoFloat: "/partners/dawes-design/logo-float-v2.png",
    principal: "Troy Dawes",
    suburb: "Narre Warren",
    state: "VIC",
    tagline:
      "More than two thousand completed Victorian projects: a Narre Warren studio designing new homes, extensions and multi unit projects across Melbourne, the Peninsula and Gippsland since 1997.",
    disciplines: ["New homes", "Extensions and renovations", "Multi-unit developments"],
    institution: {
      name: "Victorian Building Authority",
      role: "Registered Building Practitioner",
      note: "Director Troy Dawes · registered since 1997",
    },
    google: { rating: 5, reviews: 21 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "21 reviews" },
      {
        label: "Projects completed",
        value: "2,740",
        sub: "1,100 new homes moved into",
      },
      {
        label: "Designing since",
        value: "1996",
        sub: "VBA registered practitioner since 1997",
      },
    ],
    awards: [
      {
        label: "Best Home $500k to $600k, first place",
        sub: "Master Builders Victoria · 2021",
      },
      {
        label: "Renovation and Extension over $500k, first place",
        sub: "Master Builders Victoria · 2015",
      },
      {
        label: "HIA award, category winner",
        sub: "2016 · Warragul Extension",
      },
    ],
    why:
      "Dawes Design has the numbers of a big practice and the manner of a small one: 2,740 completed projects, 1,100 new homes moved into, and a director who still works with every client one on one.\n\nTroy Dawes has designed Victorian homes since 1996, with Victorian Building Authority registration since 1997, and his projects took first place at the Master Builders Victoria awards in 2015 and 2021, with an HIA category win for the Warragul Extension in 2016. A 5.0 Google rating across 21 reviews says it still feels personal at that scale. This is a studio that has met whatever a site can throw at a project, and documents it so the permits move.",
    about:
      "Dawes Design & Drafting Group is a building design practice headquartered in Narre Warren, with offices in Scoresby and Warragul, serving Melbourne, the Mornington Peninsula and Gippsland. Director Troy Dawes has designed for Victoria since 1996 and has been a registered building practitioner with the Victorian Building Authority since 1997; the current practice was established in 2007 as a rebranding of Troy Dawes Design, founded in 1997. The studio designs new homes, extensions and renovations, dual occupancies and multi unit developments, and works deliberately as a small practice, with Troy developing each project alongside the client from first concept to approved drawings, supported by a settled network of town planners, engineers, surveyors and thermal assessors. Accurate, detailed documentation is the house discipline, drawn so town planning and building permits move without drama, and the record now stands at 2,740 completed projects and 1,100 new homes.",
    facts: {
      established: "1997",
      basedIn: "Narre Warren, VIC",
      serves: "Melbourne, Mornington Peninsula and Gippsland",
      focus: "Homes, extensions and multi unit design",
    },
    website: "https://dawesdesign.com.au",
    instagram: "https://www.instagram.com/dawesdesign/",
    facebook: "https://www.facebook.com/dawesdesign/",
    linkedin: "https://au.linkedin.com/pub/troy-dawes/69/5bb/820",
    galleryUrl: "https://dawesdesign.com.au/",
    work: [
      {
        title: "Mt Eliza Extension",
        suburb: "Mount Eliza",
        type: "Extension",
        image: "/partners/dawes-design/mt-eliza.jpg",
      },
      {
        title: "Warragul Dwelling",
        suburb: "Warragul",
        type: "New home",
        image: "/partners/dawes-design/warragul-dwelling.jpg",
      },
      {
        title: "Warragul Addition",
        suburb: "Warragul",
        type: "Addition",
        image: "/partners/dawes-design/warragul-addition.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "hyperspace",
    kind: "architect",
    draft: true,
    name: "Hyperspace Architecture",
    monogram: "HS",
    logo: "/partners/hyperspace/logo.png",
    principal: "Meetu Sharma Saxena and Vishal Saxena",
    suburb: "Braddon",
    state: "ACT",
    states: ["ACT", "NSW"],
    tagline:
      "A registered architecture practice in both the ACT and New South Wales, carrying projects from feasibility through planning to architecture and interiors, with buildability designed in from the first sketch.",
    disciplines: ["New homes", "Multi-residential", "Heritage and interiors"],
    institution: {
      name: "Australian Institute of Architects",
      role: "A+ member practice",
      note: "Registered architects · ACT 2456, NSW 11796",
    },
    google: { rating: 4.5, reviews: 16 },
    stats: [
      { label: "Google rating", value: "4.5", star: true, sub: "16 reviews" },
      {
        label: "Leadership experience",
        value: "50+ yrs",
        sub: "combined, across three countries",
      },
      {
        label: "Established",
        value: "2017",
        sub: "a Canberra studio of eight",
      },
    ],
    why: "Hyperspace is registered to practise on both sides of the border, a rarity on our register: architects registered in the ACT and New South Wales, an A+ member practice of the Australian Institute of Architects, and an approved NSW Design and Building Practitioner for Class 2 multi dwelling work to unlimited height. Founders Meetu Sharma Saxena and Vishal Saxena bring more than fifty years of combined experience across India, the UAE and Australia, including high value projects worth hundreds of millions of dollars, and the studio's portfolio runs from custom homes to heritage works at the Australian War Memorial. Every design is grounded in buildability, how the building actually goes together, priced and sequenced, which is exactly the discipline an owner wants between a concept and a contract.",
    about:
      "Hyperspace Architecture is a Braddon based practice founded in 2017 by Meetu Sharma Saxena and Vishal Saxena, architects who entered the profession in 2000 and practised across India and the UAE before settling in Australia in 2009. The studio of eight offers an end to end service, from feasibility and planning advice through architecture and interior design to delivery, and lodges development applications across the ACT and NSW councils. Its sectors span custom homes, knockdown rebuilds, dual occupancies, apartments and townhouses, childcare and education, commercial fit outs and heritage conservation, including heritage works at the Australian War Memorial. The practice is an A+ member of the Australian Institute of Architects, holds architect registrations in the ACT and New South Wales, and is an approved NSW Design and Building Practitioner for Class 2 buildings to unlimited height. Designs are underpinned by close study of each site and a construction first mindset, so what is drawn is what can be built, efficiently and cost effectively.",
    facts: {
      established: "2017",
      basedIn: "Braddon, ACT",
      serves: "Canberra and NSW",
      focus: "Homes, multi-residential and heritage",
    },
    website: "https://www.hyper-space.com.au",
    instagram: "https://www.instagram.com/hyperspace_architecture/",
    facebook: "https://www.facebook.com/Hyperspace.Architecture/",
    linkedin: "https://www.linkedin.com/company/hyperspacedesigns/",
    galleryUrl: "https://www.hyper-space.com.au/projects",
    work: [
      {
        title: "Deakin house",
        suburb: "Deakin",
        type: "New home",
        image: "/partners/hyperspace/deakin-house.jpg",
      },
      {
        title: "Deakin poolside",
        suburb: "Deakin",
        type: "New home and pool",
        image: "/partners/hyperspace/deakin-poolside.jpg",
      },
      {
        title: "Jumping Creek",
        suburb: "NSW",
        type: "New home",
        image: "/partners/hyperspace/jumping-creek.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "chevli-architects",
    kind: "architect",
    draft: true,
    name: "Chevli Architects",
    monogram: "CA",
    logo: "/partners/chevli-architects/logo.png",
    principal: "Vikram and Sejal Chevli",
    suburb: "Giralang",
    state: "ACT",
    tagline:
      "A design led practice with studios in Canberra and Surat, bringing two decades of experience across three continents to homes, terraces and mixed use projects in the ACT.",
    disciplines: ["New homes", "Multi-residential", "Mixed use"],
    stats: [
      {
        label: "Registered architect",
        value: "ACT",
        sub: "Vikram Chevli · registration 2638",
      },
      {
        label: "Leadership experience",
        value: "20+ yrs",
        sub: "across India, the USA and Australia",
      },
      {
        label: "Established",
        value: "2021",
        sub: "studios in Canberra and Surat",
      },
    ],
    why: "Chevli Architects reads a site the way few Canberra practices can, through two climates at once: a studio in Canberra, a studio in Surat, and a design philosophy built on responding to the physical, cultural and climatic context of a place. Principal architect Vikram Chevli is ACT registered and came to his own practice the long way: seven years at Stewart Architecture, then design director at JWLand's design arm, where he drove a mixed use development of 241 apartments from concept to handover. Co founder Sejal Chevli adds fifteen plus years across India, the United States and Australia, including six years on education and public school projects. That is large project discipline applied at house scale, with materials, finishes and natural light doing the talking.",
    about:
      "Chevli Architects is a design led architecture practice founded in 2021 by Vikram and Sejal Chevli, with studios in Canberra and Surat, India, the two cities the practice calls home. Vikram, the managing director and principal architect, is registered in the ACT and trained at CEPT Ahmedabad, the Bezalel Academy in Jerusalem and the University of New Mexico; he spent seven years with Stewart Architecture and three as design director at JWLand's design studio, delivering mixed use developments from concept to completion. Sejal brings more than fifteen years across India, the United States and Australia, spanning education and public buildings, sustainable residential work and six years with CCJ Architects. The practice works across homes, terraces, apartments and mixed use projects, designing places that respond to their physical, cultural and climatic context, with experiential quality carried through the sensitive use of materials, finishes and natural light.",
    facts: {
      established: "2021",
      basedIn: "Giralang, ACT",
      serves: "Canberra and surrounds",
      focus: "Homes, multi-residential and mixed use",
    },
    website: "https://chevliarchitects.com.au",
    instagram: "https://www.instagram.com/chevliarchitects/",
    linkedin: "https://www.linkedin.com/company/chevli-architects/",
    galleryUrl: "https://chevliarchitects.com.au/projects/",
    work: [
      {
        title: "Dawn, Braddon",
        suburb: "Braddon",
        type: "Apartments, as design director",
        image: "/partners/chevli-architects/dawn-braddon.jpg",
      },
      {
        title: "Denman Prospect terraces",
        suburb: "Denman Prospect",
        type: "Multi-residential",
        image: "/partners/chevli-architects/denman-prospect.jpg",
      },
      {
        title: "Canberra living room",
        suburb: "Canberra",
        type: "Interior",
        image: "/partners/chevli-architects/canberra-interior.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "elite-building-design",
    kind: "architect",
    roleLabel: "Building design practice",
    name: "Elite Building Design",
    monogram: "EB",
    logo: "/partners/elite-building-design/logo.png",
    logoFloat: "/partners/elite-building-design/logo-float-v2.png",
    principal: "Abdul Moussa",
    suburb: "Belmore",
    state: "NSW",
    tagline:
      "A Belmore studio designing about seventy homes a year across Sydney, the Illawarra and Newcastle, with fluency on both sides of the drawings: design and construction.",
    disciplines: ["New homes", "Duplexes and dual occupancy", "Renovations"],
    google: { rating: 5, reviews: 17 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "17 reviews" },
      {
        label: "Homes designed",
        value: "70",
        sub: "a year, Sydney to Newcastle",
      },
      {
        label: "In the industry",
        value: "10+ yrs",
        sub: "across design and construction",
      },
    ],
    awards: [
      {
        label: "Local Business Awards, winner",
        sub: "Liverpool City · 2022",
      },
      {
        label: "Australian Small Business Champion, finalist",
        sub: "2022",
      },
      {
        label: "Outstanding Business Person, finalist",
        sub: "Local Business Awards · 2022 · Abdul Moussa",
      },
    ],
    why:
      "Elite Building Design works at a pace most studios never see, about seventy homes a year across Sydney, the Illawarra and Newcastle, and it shows in how buildable the drawings are.\n\nDirector Abdul Moussa brings more than a decade across building design and construction, so designs arrive priced before they reach a builder’s estimator: duplexes and dual occupancies, and luxury homes with the detail owners asked for. The practice took the Liverpool City Local Business Award in 2022, with national Small Business Champion finalist recognition the same year. For owners in Sydney’s south west, this is design that respects the budget and survives the build.",
    about:
      "Elite Building Design is a Belmore based building design practice established in 2018 and led by director Abdul Moussa, a building designer with more than ten years across the design and construction industry. The studio designs new homes, duplexes and dual occupancies, renovations and extensions, and carries clients from the first design consultation through council approval to completion, drawing on construction knowledge that keeps designs practical, priced and approvable. Working across Sydney, the Illawarra and Newcastle at around seventy homes a year, the practice pairs volume with a luxury standard of finish. It was named Liverpool City's Local Business Award winner in 2022, a year that also brought finalist honours at the Australian Small Business Champion Awards and a personal finalist listing for Abdul as Outstanding Business Person of the Year.",
    facts: {
      established: "2018",
      basedIn: "Belmore, NSW",
      serves: "Sydney, Illawarra and Newcastle",
      focus: "Homes, duplexes and dual occupancy",
    },
    website: "https://elitebuildingdesign.com.au",
    instagram: "https://www.instagram.com/elite_building_design/",
    facebook: "https://www.facebook.com/EliteBuildingDesign/",
    linkedin: "https://www.linkedin.com/in/abdul-moussa-236b50240/",
    galleryUrl: "https://elitebuildingdesign.com.au/",
    work: [
      {
        title: "Gregory Hills",
        suburb: "Gregory Hills",
        type: "New home",
        image: "/partners/elite-building-design/gregory-hills.jpg",
      },
      {
        title: "Residence Lurnea",
        suburb: "Lurnea",
        type: "Duplex",
        image: "/partners/elite-building-design/lurnea.jpg",
      },
      {
        title: "Harrington Grove",
        suburb: "Harrington Park",
        type: "Ensuite",
        image: "/partners/elite-building-design/harrington-grove.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "design-plus-drafting",
    kind: "architect",
    roleLabel: "Building design and drafting",
    name: "Design Plus Drafting",
    monogram: "DP",
    logo: "/partners/design-plus-drafting/logo.png",
    logoFloat: "/partners/design-plus-drafting/logo-float-v2.png",
    principal: "Scott Nicholson",
    suburb: "Leichhardt",
    state: "NSW",
    tagline:
      "Sydney's Inner West design and drafting studio, reimagining homes from attic conversions to full knockdown rebuilds, with the approvals process handled end to end.",
    disciplines: ["New homes and knockdown rebuilds", "Extensions and additions", "Attic conversions"],
    google: { rating: 4.9, reviews: 62 },
    stats: [
      { label: "Google rating", value: "4.9", star: true, sub: "62 reviews" },
      {
        label: "Designing since",
        value: "1994",
        sub: "three decades of design and drafting",
      },
      {
        label: "Drafting projects",
        value: "10,000+",
        sub: "via parent company Drawable, since 2007",
      },
    ],
    why:
      "Design Plus Drafting holds one of the deepest review bases of any design practice we list, a 4.9 rating across 62 reviews, and it comes from doing the unglamorous parts well: development applications, complying development, council coordination and consultant management, handled for clients rather than handed to them.\n\nDirector Scott Nicholson leads a Leichhardt team whose knowledge of Sydney’s councils means issues are caught in the drawings, not in the assessment queue. Behind the studio sits Drawable, a drafting operation that has completed more than ten thousand projects since 2007. From attic conversions to knockdown rebuilds, this is the Inner West’s steady hand.",
    about:
      "Design Plus Drafting is a building design and drafting studio in Leichhardt, in Sydney's Inner West, led by director Scott Nicholson and tracing its design arc back to 1994. The team works across residential, commercial and corporate projects: home extensions and additions, attic conversions, new homes and full knockdown rebuilds, with every design developed to be achievable and compliant with the relevant codes. The studio prepares high quality drawings and full documentation for development applications and complying development, coordinates the required consultants directly, and applies years of experience with Sydney councils to give each application its best chance of a smooth approval. The practice is the building design division of Drawable, a drafting company that has completed more than ten thousand projects for trade businesses across Australia and the Pacific Rim since 2007, and it serves clients in any style and location across New South Wales.",
    facts: {
      established: "1994",
      basedIn: "Leichhardt, NSW",
      serves: "Sydney and NSW",
      focus: "Homes, extensions and approvals",
    },
    website: "https://www.designplusdrafting.com.au",
    instagram: "https://www.instagram.com/designplusdraftingau/",
    linkedin: "https://www.linkedin.com/company/design-plus-drafting/",
    galleryUrl: "https://www.designplusdrafting.com.au/",
    work: [
      {
        title: "Hurlstone Park",
        suburb: "Hurlstone Park",
        type: "New home and pool",
        image: "/partners/design-plus-drafting/hurlstone-park.jpg",
      },
      {
        title: "Monterey",
        suburb: "Monterey",
        type: "New home",
        image: "/partners/design-plus-drafting/monterey.jpg",
      },
      {
        title: "Central Coast",
        suburb: "Central Coast",
        type: "Hillside home",
        image: "/partners/design-plus-drafting/central-coast.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "mt-martha-design-drafting",
    kind: "architect",
    draft: true,
    roleLabel: "Building design and drafting",
    name: "Mt. Martha design + drafting",
    monogram: "MD",
    logo: "/partners/mt-martha-design-drafting/logo.png",
    principal: "Adam Doherty",
    suburb: "Mornington",
    state: "VIC",
    tagline:
      "The Mornington studio drawing more than 150 Peninsula projects a year, led by a building designer who has been at the board since 1983.",
    disciplines: ["New homes", "Renovations and additions", "Townhouse developments"],
    institution: {
      name: "Design Matters National",
      role: "Member",
      note: "Registered Building Practitioner · Building Designer (Architectural)",
    },
    google: { rating: 4.5, reviews: 10 },
    stats: [
      { label: "Google rating", value: "4.5", star: true, sub: "10 reviews" },
      {
        label: "Projects a year",
        value: "150+",
        sub: "for owners, builders and developers",
      },
      {
        label: "Designing since",
        value: "1983",
        sub: "his own practice since 1992",
      },
    ],
    why: "Adam Doherty has been designing buildings since 1983, and the Peninsula has noticed: his deliberately small Mornington practice turns out more than 150 building design projects a year for owners, builders and developers, and has become the preferred designer for many of the Peninsula's premium builders. The work spans new homes, including passive solar and sustainable designs, major renovations, and townhouse developments, with a town planning fluency that keeps Peninsula applications moving. His own Barkly Street House carries a commendation from the Building Designers Association of Victoria. Four decades at the board, a settled process and the principal's personal attention on every job: that is what steady looks like.",
    about:
      "Mt. Martha design + drafting is a building design practice in Mornington, led by principal Adam Doherty, a building designer since 1983 who has run his own Peninsula practice since 1992. The studio designs new homes, including passive solar and sustainable solutions, major renovations and additions, and townhouse developments and subdivisions, and prepares town planning and building permit applications, coordinating surveys, engineering, soil reports and energy ratings so each project arrives approval ready. Deliberately small, the practice gives every client personal and attentive service while carrying more than 150 projects a year across the Mornington Peninsula and Melbourne's bayside, from Mount Eliza and Frankston to Sorrento and Portsea. Adam holds a Certificate of Technology in Architectural Drafting, is a registered building practitioner, and is a member of Design Matters National, Victoria's building design association, whose professional development program keeps the practice current on regulation and product alike.",
    facts: {
      established: "1992",
      basedIn: "Mornington, VIC",
      serves: "Mornington Peninsula and bayside Melbourne",
      focus: "Homes, townhouses and town planning",
    },
    website: "https://www.mtmarthadrafting.com.au",
    instagram: "https://www.instagram.com/mtmarthadesign/",
    facebook: "https://www.facebook.com/MtMarthaDesignandDrafting",
    linkedin: "https://www.linkedin.com/in/mtmarthadrafting/",
    galleryUrl: "https://www.mtmarthadrafting.com.au/projects/",
    work: [
      {
        title: "Barkly Street House",
        suburb: "Mornington",
        type: "The designer's own home",
        image: "/partners/mt-martha-design-drafting/barkly-street.jpg",
      },
      {
        title: "Mornington home",
        suburb: "Mornington",
        type: "New home",
        image: "/partners/mt-martha-design-drafting/mornington.jpg",
      },
      {
        title: "Sorrento kitchen",
        suburb: "Sorrento",
        type: "Interior",
        image: "/partners/mt-martha-design-drafting/sorrento.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "banksia-building-design",
    kind: "architect",
    draft: true,
    roleLabel: "Building design practice",
    name: "Banksia Building Design",
    monogram: "BB",
    logo: "/partners/banksia-building-design/logo.png",
    principal: "Claire",
    suburb: "Killara",
    state: "NSW",
    tagline:
      "A Sydney building design studio built on honest advice, where a degree-qualified designer takes your home personally from first sketch to council approval.",
    disciplines: ["New homes and knockdown rebuilds", "Extensions and additions", "DA and CDC approvals"],
    google: { rating: 5.0, reviews: 4 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "4 reviews" },
      {
        label: "Experience",
        value: "10 yrs",
        sub: "architecture and residential design",
      },
      {
        label: "Qualified",
        value: "Degree",
        sub: "Bachelor of Architectural Studies",
      },
    ],
    why: "Banksia exists because its founder watched the industry do the opposite of what she believed in. Claire, the studio's principal designer, holds a Bachelor of Architectural Studies and nearly a decade in residential design, and she started Banksia after seeing clients oversold and misled by businesses chasing a sale rather than giving honest advice. Her answer is a practice where integrity comes first: transparent guidance at every step, a designer who genuinely listens, and one degree-qualified pair of hands on your home from first sketch through the development application. Early clients have returned a perfect five stars, and the through-line in the work is a designer's eye for natural light, craftsmanship and the balance of indoor and outdoor living. For a Sydney homeowner who wants their designer in their corner, this is a considered, trustworthy introduction.",
    about:
      "Banksia Building Design is a residential building design studio serving Sydney, led by its principal designer, Claire, who holds a Bachelor of Architectural Studies and has spent close to a decade specialising in residential projects. The practice designs new homes and knockdown rebuilds, first and ground floor extensions, internal renovations and granny flats, and prepares and lodges development applications and complying development certificates, drawing on real experience with Sydney's councils. Founded on a commitment to honest, transparent advice, the studio pairs a fresh contemporary perspective with years of professional experience, and works closely with each client so the finished design reflects the way they actually live. A love of craftsmanship and the outdoors runs through the work, shaping how each home handles natural light and the connection between indoor and outdoor space.",
    facts: {
      experience: "10 yrs",
      basedIn: "Killara, NSW",
      serves: "Sydney and NSW",
      focus: "Homes, extensions and approvals",
    },
    website: "https://www.banksiabuildingdesign.com.au",
    instagram: "https://www.instagram.com/banksiabuildingdesign/",
    facebook: "https://www.facebook.com/BanksiaBuildingDesign",
    linkedin: "https://www.linkedin.com/company/banksia-building-design/",
    galleryUrl: "https://www.banksiabuildingdesign.com.au/projects",
    work: [
      {
        title: "Glass pavilion",
        suburb: "Sydney",
        type: "Alterations and additions",
        image: "/partners/banksia-building-design/rear-extension.jpg",
      },
      {
        title: "Contemporary new home",
        suburb: "Sydney",
        type: "New build",
        image: "/partners/banksia-building-design/new-build.jpg",
      },
      {
        title: "Spa terrace",
        suburb: "Sydney",
        type: "Deck and landscaping",
        image: "/partners/banksia-building-design/terrace.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "niche-home-designs",
    kind: "architect",
    roleLabel: "Building design practice",
    name: "Niche Home Designs",
    monogram: "NH",
    logo: "/partners/niche-home-designs/logo.png",
    principal: "Nick Nikolaidis",
    suburb: "Sydney",
    state: "NSW",
    tagline:
      "A multi award winning Sydney studio designing bespoke homes since 1994, known for a signature modern look and for carrying every project hands on through council approval.",
    disciplines: ["New homes", "Alterations and additions", "Multi residential and sustainable"],
    institution: {
      name: "Building Designers Association of Australia",
      role: "Accredited Building Designer",
      note: "Director Nick Nikolaidis",
    },
    google: { rating: 5, reviews: 8 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "8 reviews" },
      { label: "Completed projects", value: "1,400" },
      { label: "Designing since", value: "1994", sub: "over 30 years" },
    ],
    awards: [
      { label: "Residential Buildings over 450 sqm, winner", sub: "HIA NSW · Blakehurst Dwelling" },
      { label: "Low Density Multi Residential, winner", sub: "BDA NSW · Kangaroo Point Dwellings" },
      { label: "New Houses, winner", sub: "BDA Sydney · Connells Point Dwelling" },
    ],
    why: "Niche Home Designs has been designing bespoke Sydney homes since 1994, and the record is hard to argue with: around 1,400 completed projects and eighteen industry awards, among them state wins with the Building Designers Association and the HIA and finalist places at national level. What we value as much as the trophies is that this is still a hands on studio: director Nick Nikolaidis works on each home himself, and the practice has spent three decades learning exactly how to carry a design through a development application and council. For an owner heading to tender, that is the combination that matters, a home designed to an award standard, drawn by people who know how to get it approved and built.",
    about:
      "Niche Home Designs is a multi award winning building design studio founded in Sydney in 1994 and led by its director, Nick Nikolaidis, an accredited building designer and member of the Building Designers Association of Australia. The studio designs new homes, alterations and additions, multi residential projects and sustainable homes, working for the most part across southern Sydney’s St George and Sutherland Shire areas, and taking projects across the rest of Sydney and New South Wales. Its process is deliberately hands on: a site visit and detailed brief, concept sketches, then the development application and council approval, followed by the documentation needed for a construction certificate. Years of working with councils and building authorities, alongside a settled network of industry consultants, sit behind that, and the studio pairs its signature modern look with whatever style a client has in mind.",
    facts: {
      established: "1994",
      basedIn: "Sydney, NSW",
      serves: "Sydney and NSW",
      focus: "New homes, additions and multi residential",
    },
    website: "https://nichehomedesigns.com.au/",
    instagram: "https://www.instagram.com/nichehomedesigns/",
    facebook: "https://www.facebook.com/nichehomedesigns",
    linkedin: "https://www.linkedin.com/company/niche-home-designs/",
    galleryUrl: "https://nichehomedesigns.com.au/",
    work: [
      {
        title: "Sylvania Waters Residence",
        suburb: "Sylvania Waters",
        type: "New home",
        image: "/partners/niche-home-designs/sylvania-waters-1.jpg",
      },
      {
        title: "Sylvania Waters Dwelling",
        suburb: "Sylvania Waters",
        type: "New home",
        image: "/partners/niche-home-designs/sylvania-waters-2.jpg",
      },
      {
        title: "Sans Souci Dwelling",
        suburb: "Sans Souci",
        type: "New home",
        image: "/partners/niche-home-designs/sans-souci.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "studio-lira",
    kind: "architect",
    roleLabel: "Architecture | Interiors",
    name: "Studio LIRA",
    monogram: "LI",
    logo: "/partners/studio-lira/logo.png",
    suburb: "Newtown",
    state: "NSW",
    tagline:
      "Two Italian architects, registered in Sydney and Rome, whose Newtown studio brings a European sense of proportion and restraint to homes, interiors and fit-outs.",
    disciplines: ["New homes and additions", "Heritage properties", "Interiors and commercial"],
    google: { rating: 5.0, reviews: 7 },
    institution: {
      name: "NSW Architects Registration Board",
      role: "Registered architects",
      note: "NSW licence 13292",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "7 reviews" },
      { label: "In architecture", value: "20 yrs", sub: "ten of them in Sydney" },
      { label: "Registered architects", value: "2", sub: "NSW and Rome" },
    ],
    accolade: {
      label: "Best of Houzz for Service",
      sub: "2017, 2023, 2024 and 2025",
      tag: "4× winner",
    },
    why: "Studio LIRA is the kind of practice we are always looking for and rarely find: built on genuine experience across new homes, alterations and additions, heritage properties and commercial projects, with a rigorous approach from the earliest ideas to the final built outcome. Every project begins by understanding the people, the place and what already exists, allowing a clear concept to emerge. The result feels thoughtful, enduring and built to last.\n\nThat same care continues into delivery. Their documentation anticipates challenges, supports a smoother approval pathway and provides builders with clear, buildable information. They stay closely involved during construction, so the original vision is realised with the same care and precision.\n\nFor owners who value considered architecture, technical confidence and the continuity of one team from first sketch to completion, Studio LIRA is a practice we recommend with genuine confidence.",
    about:
      "Studio LIRA is a Sydney based architecture and interiors practice with experience delivering projects across Australia and overseas. For Studio LIRA, every project is driven by a central idea that gives the architecture its identity. That idea informs every decision, from the overall spatial composition to the smallest material detail, creating work that feels coherent and enduring. Every design is shaped by its own story, context and purpose.\n\nThey believe that good architecture is realised through collaboration and a shared commitment to quality, and they value long-term relationships with clients, consultants, builders and craftspeople who take genuine pride in their work, recognising that careful detailing, quality craftsmanship and thoughtful execution are what ultimately transform a strong idea into lasting architecture.",
    facts: {
      basedIn: "Newtown, NSW",
      serves: "Sydney",
      focus: "New homes, interiors and fit-outs",
    },
    website: "https://studiolira.com.au/",
    instagram: "https://www.instagram.com/studioliraarchitects/",
    galleryUrl: "https://studiolira.com.au/",
    work: [
      {
        title: "Castle Hill Residence",
        suburb: "Castle Hill",
        type: "New home",
        image: "/partners/studio-lira/castle-hill-exterior.jpg",
      },
      {
        title: "Castle Hill Interior",
        suburb: "Castle Hill",
        type: "Interior",
        image: "/partners/studio-lira/castle-hill-interior.jpg",
      },
      {
        title: "Double Bay Apartments",
        suburb: "Double Bay",
        type: "Multi residential",
        image: "/partners/studio-lira/double-bay-apartments.jpg",
      },
    ],
    joined: "2026",
  },

  /* ── Build partners ─────────────────────────────────────────────── */
  /* Real, in review (draft). New partner kind: registered builders we
     would put in front of a homeowner. Not yet wired into the public
     register (no segment, no /partners/builders route) — reachable only
     via /partners/preview/[slug] until we roll the lens out. */
  {
    slug: "elevate-building-group",
    kind: "builder",
    draft: true,
    roleLabel: "Custom home builder",
    name: "Elevate Building Group",
    monogram: "EB",
    logo: "/partners/elevate-building-group/logo.png",
    principal: "Matthew Menichelli",
    suburb: "Greensborough",
    state: "VIC",
    tagline:
      "An award-winning Melbourne master builder: national and state Master Builders honours, two winning 'Block' builds, and custom homes, renovations and extensions delivered to that standard.",
    disciplines: ["Custom homes", "Renovations and extensions", "Knockdown rebuilds"],
    google: { rating: 5, reviews: 11 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "11 reviews" },
      {
        label: "Wins on 'The Block'",
        value: "2x",
        sub: "featured for four seasons",
      },
      {
        label: "Combined experience",
        value: "40+ yrs",
        sub: "master-builder team",
      },
    ],
    awards: [
      {
        label: "National Excellence Awards, winner",
        sub: "Master Builders Australia · 2024",
      },
      {
        label: "Excellence in Housing Awards, winner",
        sub: "Master Builders Victoria · 2025",
      },
      {
        label: "Best Custom Home, winner",
        sub: "Master Builders Victoria · 2022",
      },
    ],
    why: "Elevate is the kind of builder other builders keep an eye on. Matthew Menichelli took his team from a carpentry business to a national Master Builders winner in little more than a decade, with back to back Excellence in Housing honours in Victoria and two winning builds on 'The Block' along the way. The work spans bespoke custom homes, luxury renovations and extensions, multi residential and basement construction, all held to the standard those awards imply. What makes this a genuine introduction is the company they keep: Elevate has earned the trust of some of Australia's most respected designers, and repays it with builds that land on brief, on budget and on time. For an owner planning something serious, this is a proven pair of hands near the top of the Melbourne market.",
    about:
      "Elevate Building Group is an award-winning Melbourne building company led by director Matthew Menichelli, a registered Master Builder and VBA registered building practitioner. Based in Greensborough and working across Melbourne's northern and eastern suburbs, the team specialises in custom and luxury homes, alongside knockdown rebuilds, single and double storey extensions, full renovations, townhouse and multi residential developments, basement construction and commercial fit outs. Backed by more than forty years of combined industry experience, Elevate works hand in hand with leading architects and designers to deliver homes tailored to each owner's block, budget and brief, and also carries out building inspections across Melbourne.",
    facts: {
      experience: "40+ yrs combined",
      basedIn: "Greensborough, VIC",
      serves: "Melbourne, north and east",
      focus: "Custom homes, renovations and extensions",
    },
    website: "https://elevatebuilding.com.au",
    instagram: "https://www.instagram.com/elevate_building_group/",
    facebook: "https://www.facebook.com/elevatebuild",
    linkedin: "https://www.linkedin.com/in/matthew-menichelli-3ab770265/",
    galleryUrl: "https://elevatebuilding.com.au/",
    work: [
      {
        title: "Carn",
        suburb: "Melbourne",
        type: "Renovation and extension",
        image: "/partners/elevate-building-group/carn.jpg",
        href: "https://elevatebuilding.com.au/portfolio-carn/",
      },
      {
        title: "Pinnacle",
        suburb: "Melbourne",
        type: "Custom home",
        image: "/partners/elevate-building-group/pinnacle.jpg",
        href: "https://elevatebuilding.com.au/portfolio-pinnacle/",
      },
      {
        title: "Waterloo",
        suburb: "Melbourne",
        type: "Renovation and extension",
        image: "/partners/elevate-building-group/waterloo.jpg",
        href: "https://elevatebuilding.com.au/portfolio-waterloo/",
      },
    ],
    joined: "2026",
  },

  {
    slug: "mardo-building-co",
    kind: "builder",
    draft: true,
    roleLabel: "Custom home builder",
    name: "Mardo Building Co",
    monogram: "MB",
    logo: "/partners/mardo-building-co/logo.png",
    principal: "Wafa Ismael",
    suburb: "Melbourne",
    state: "VIC",
    tagline:
      "An owner-run, VBA-registered Melbourne builder with fifteen years behind it: fixed-price contracts, a single point of contact and a ten-year workmanship warranty on every custom home, extension and renovation.",
    disciplines: ["Custom homes", "Extensions and second storeys", "Renovations"],
    google: { rating: 5, reviews: 23 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "23 reviews" },
      {
        label: "Projects completed",
        value: "100+",
        sub: "homes and renovations",
      },
      {
        label: "Building since",
        value: "15+ yrs",
        sub: "owner-run team",
      },
    ],
    why: "Mardo is the kind of builder you hire when you want the process to be as calm as the result. Wafa Ismael runs every project himself, with a settled in-house crew rather than a rotating cast of subcontractors, so the person who quotes your job is the person accountable for it at handover. That structure is why the guarantees actually hold: a fixed price locked in before work starts, one point of contact the whole way through, and a ten-year workmanship warranty on the finished home. Across fifteen years and more than a hundred Melbourne homes, extensions and renovations, that consistency has earned a spotless five-star record. For an owner who wants certainty on price, timeline and finish, Mardo is a genuinely safe pair of hands.",
    about:
      "Mardo Building Co is a VBA registered residential builder working across metropolitan Melbourne, founded and led by Wafa Ismael with more than fifteen years in the industry. The team builds new custom homes and townhouses, single and double storey extensions and additions, and full kitchen, bathroom and laundry renovations, and manages council permits and architectural planning along the way. Every project is run by the owner and a consistent crew of the company's own licensed and insured tradespeople, which is how Mardo holds to fixed-price contracts, on-time completion and a ten-year workmanship warranty. The result the company is known for is simple: a higher standard of finish, delivered without surprises.",
    facts: {
      experience: "15+ yrs",
      basedIn: "Melbourne, VIC",
      serves: "Metropolitan Melbourne",
      focus: "Custom homes, extensions and renovations",
    },
    website: "https://mardobuildingco.com.au",
    instagram: "https://www.instagram.com/mardobuildingco/",
    facebook: "https://www.facebook.com/p/Mardo-Building-Co-100063984045301/",
    galleryUrl: "https://mardobuildingco.com.au/projects-hub/",
    work: [
      {
        title: "Keilor Park",
        suburb: "Keilor Park",
        type: "Home renovation",
        image: "/partners/mardo-building-co/house.jpg",
        href: "https://mardobuildingco.com.au/projects-hub/keilor-park-project/",
      },
      {
        title: "Frankston",
        suburb: "Frankston",
        type: "Bathroom renovation",
        image: "/partners/mardo-building-co/bathroom.jpg",
        href: "https://mardobuildingco.com.au/projects-hub/frankston-project/",
      },
      {
        title: "Blackburn North",
        suburb: "Blackburn North",
        type: "Kitchen renovation",
        image: "/partners/mardo-building-co/kitchen.jpg",
        href: "https://mardobuildingco.com.au/projects-hub/blackburn-north-project/",
      },
    ],
    joined: "2026",
  },

  {
    slug: "buildkomm",
    kind: "builder",
    draft: true,
    builderProfileSlug: "buildkomm-pty-ltd-715fe8",
    roleLabel: "Residential and commercial builder",
    name: "Buildkomm",
    monogram: "BK",
    logo: "/partners/buildkomm/logo.png",
    principal: "Eddie Komm",
    suburb: "Moorabbin",
    state: "VIC",
    states: ["VIC", "QLD"],
    tagline:
      "A Moorabbin builder carrying townhouses, boutique apartments and architectural homes across bayside Melbourne, with the licences and the balance sheet to run several major contracts at once.",
    disciplines: [
      "Townhouses and dual occupancy",
      "Boutique apartments",
      "Luxury residences",
      "Industrial and commercial",
    ],
    stats: [
      { label: "Completed works", value: "$200m+", sub: "delivered to date" },
      {
        label: "DBI facility",
        value: "$40m",
        sub: "domestic building insurance",
      },
      {
        // Short value, long sub: "VIC + QLD" wraps to two lines at this
        // type size and breaks the band's rhythm against $200m+ / $40m.
        label: "Licensed",
        value: "Dual",
        sub: "VIC and QLD, commercial and residential",
      },
    ],
    signature: {
      label: "Registered builder",
      value: "DB-U 69666",
    },
    why: "Buildkomm is the rare builder whose capacity is a matter of record rather than assertion.\n\nMost builders ask an owner to take their financial standing on trust. Buildkomm publishes it: over $200 million in completed works, and a $40 million Domestic Building Insurance facility, which is the figure an insurer is willing to stand behind and the reason they can carry several large contracts at once.\n\nThe licensing is unusually broad too, covering commercial and residential work in Victoria and residential in Queensland. A builder who handles post-tensioned slabs and basements on a five-storey apartment building brings a different order of structural confidence to a townhouse site.",
    about:
      "Buildkomm is a Melbourne based builder working across the residential and commercial sectors, led by director Eddie Komm from an office in Moorabbin. They are a Master Builders Victoria member and QBCC licensed in Queensland.\n\nThe practice delivers turnkey projects for developers, architects and private clients across four streams: medium-density townhouses on slab-on-ground and basement, boutique to mid-rise apartments up to five storeys, industrial warehouses in precast and structural steel, and architecturally significant homes in Melbourne's bayside suburbs.\n\nCompleted work concentrates through the south east and bayside, from Malvern East and Caulfield through Bentleigh and Cheltenham to Brighton, Beaumaris and Mordialloc. A team of roughly forty runs on documented systems, which is what holds the same standard across concurrent projects.",
    facts: {
      experience: "Decades",
      basedIn: "Moorabbin, VIC",
      serves: "Melbourne and south east Queensland",
      focus: "Townhouses, apartments and luxury homes",
    },
    website: "https://www.buildkomm.com.au",
    instagram: "https://www.instagram.com/buildkomm/",
    linkedin: "https://au.linkedin.com/company/build-komm",
    galleryUrl: "https://www.buildkomm.com.au/portfolio",
    work: [
      {
        title: "Bayside townhouses",
        suburb: "Brighton",
        type: "Townhouses",
        image: "/partners/buildkomm/brighton.jpg",
      },
      {
        title: "Double-height living",
        suburb: "Beaumaris",
        type: "Luxury residence",
        image: "/partners/buildkomm/beaumaris.jpg",
      },
      {
        title: "Three-storey residences",
        suburb: "Caulfield",
        type: "Multi-dwelling",
        image: "/partners/buildkomm/caulfield.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "the-builders-project",
    kind: "builder",
    builderProfileSlug: "the-builders-project-61b9f3",
    roleLabel: "Design-led builder",
    name: "The Builders Project",
    monogram: "TB",
    logo: "/partners/the-builders-project/logo.png",
    principal: "Miguel and Kristina Raveche",
    suburb: "Melbourne",
    state: "VIC",
    tagline:
      "A husband-and-wife builder in Melbourne. Miguel builds, Kristina designs, and most of their work is a period home restored at the front and rebuilt at the back.",
    disciplines: [
      "Custom homes",
      "Renovations and extensions",
      "Heritage restoration",
      "Development projects",
    ],
    google: { rating: 4.9, reviews: 17 },
    stats: [
      { label: "Google rating", value: "4.9", star: true, sub: "17 reviews" },
      {
        label: "Homes built or renovated",
        value: "30+",
        sub: "by Miguel and Kristina together",
      },
      {
        label: "On the tools since",
        value: "2009",
        sub: "registered builder since 2019",
      },
    ],
    why: "Miguel Raveche has been on the tools since 2009 and a registered builder since 2019. Kristina Raveche is an interior designer and stylist with a decade of hands-on experience. They are married, they run the company together, and between them they have built or renovated more than thirty properties. It is an unusual pairing, and a useful one. The person pricing the job and the person choosing the finishes sit at the same table from the first meeting.\n\nIt shows most in their heritage work. On both Prahran House and Windsor House they took the back off a period home, restored what was left, and built a contemporary addition behind it. Both were built to Odyssey Architecture’s drawings. That is the harder kind of renovation. Floor levels, window heights and every junction between old and new have to be settled before anyone lifts a tool. Windsor House still went from building permit to finished home in under six months. For an owner with a period house and a modern brief, that is the experience you want on site.",
    about:
      "The Builders Project is a Melbourne building company working across custom homes, renovations, extensions, additions and development projects. Miguel and Kristina Raveche founded it in 2016. They started from a simple view: a good home begins with thoughtful design and careful craftsmanship, and the people building it should understand the people who will live in it. The team is five: Miguel as director and builder, Kristina as creative director, a construction manager, a lead carpenter and an operations manager. Every job runs through the same six stages, from the first consultation and early coordination, through pricing, planning and pre-construction, to construction and handover. Recent work includes Windsor House and Prahran House, both heritage renewals with Odyssey Architecture, and Russel House, a new build with The Designers Studio.",
    facts: {
      established: "2016",
      experience: "17 yrs",
      basedIn: "Melbourne, VIC",
      serves: "Melbourne",
      focus: "Heritage renewal, custom homes and extensions",
    },
    website: "https://www.thebuildersproject.melbourne",
    instagram: "https://www.instagram.com/thebuildersproject/",
    facebook: "https://www.facebook.com/thebuildersproject/",
    galleryUrl: "https://www.thebuildersproject.melbourne/projects",
    work: [
      {
        title: "Prahran House",
        suburb: "Prahran",
        type: "Heritage renewal and rear addition",
        image: "/partners/the-builders-project/prahran-house.webp",
        href: "https://www.thebuildersproject.melbourne/prahran-house",
      },
      {
        title: "Windsor House",
        suburb: "Windsor",
        type: "Heritage renewal and rear addition",
        image: "/partners/the-builders-project/windsor-house.webp",
        href: "https://www.thebuildersproject.melbourne/windsor-house",
      },
      {
        title: "Russel House",
        suburb: "Melbourne",
        type: "New build",
        image: "/partners/the-builders-project/russel-house.webp",
        href: "https://www.thebuildersproject.melbourne/russel-house",
      },
    ],
    joined: "2026",
  },
  {
    slug: "inverloch-builders",
    kind: "builder",
    draft: true,
    roleLabel: "Custom home builder",
    name: "Inverloch Builders",
    monogram: "IB",
    logo: "/partners/inverloch-builders/logo.png",
    principal: "Andrew Kempster",
    suburb: "Inverloch",
    state: "VIC",
    tagline:
      "The Bass Coast builder that brings builder, designer and engineer to the table from day one, so the home you design is the home you can afford to build.",
    disciplines: ["Custom homes", "Major renovations", "Coastal builds"],
    google: { rating: 4.8, reviews: 20 },
    stats: [
      { label: "Google rating", value: "4.8", star: true, sub: "20 reviews" },
      {
        label: "Experience",
        value: "30+ yrs",
        sub: "custom homes and major renovations",
      },
      {
        label: "Builder at the table",
        value: "Day one",
        sub: "early builder involvement model",
      },
    ],
    why: "Most building stress starts the same way: a home is designed first, and what it costs to build is discovered later. Inverloch Builders is set up to prevent exactly that. Director Andrew Kempster runs an early builder involvement model that brings builder, designer, engineer and client together from the very start, so every idea is tested for cost and buildability before it hardens into drawings. Behind it sits more than thirty years of experience, an in-house carpentry crew the practice calls its backbone, and a deliberate cap on how many projects are taken each year so that none of them are rushed. Clients rate the experience 4.8 across 20 Google reviews, and the word that keeps appearing is the one that matters most on a build: listens. For owners on the Bass Coast, this is the steady local hand.",
    about:
      "Inverloch Builders is a custom home and renovation builder on Victoria's Bass Coast, led by director Andrew Kempster, a registered building practitioner. The team designs and delivers new custom homes, major renovations and transformations of existing properties across Inverloch and the surrounding coast and hinterland, from Venus Bay, Phillip Island and San Remo through to Leongatha, Korumburra, Walkerville and Foster. Its early builder involvement approach aligns builder, designer, engineer and client from the first conversation, keeping every decision practical, affordable and achievable, and its in-house carpentry team is backed by a network of subcontractors and suppliers the practice has worked with for years. The number of projects taken on each year is deliberately limited, with a focus on building beyond minimum standards: durable structures, considered detail and healthier homes with natural light and clean air.",
    facts: {
      experience: "30+ yrs",
      basedIn: "Inverloch, VIC",
      serves: "Bass Coast and South Gippsland",
      focus: "Custom homes and major renovations",
    },
    website: "https://www.inverlochbuilders.com.au",
    instagram: "https://www.instagram.com/inverlochbuilders/",
    facebook: "https://www.facebook.com/Inverlochbuilders/",
    galleryUrl: "https://www.inverlochbuilders.com.au/",
    work: [
      {
        title: "Poolside pavilion",
        suburb: "Bass Coast",
        type: "Custom home",
        image: "/partners/inverloch-builders/pool.jpg",
      },
      {
        title: "Black barn house",
        suburb: "South Gippsland",
        type: "Custom home",
        image: "/partners/inverloch-builders/barn.jpg",
      },
      {
        title: "Cathedral living room",
        suburb: "Bass Coast",
        type: "Interior",
        image: "/partners/inverloch-builders/living.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "a1-custom-homes",
    kind: "builder",
    draft: true,
    roleLabel: "Custom home builder",
    name: "A1 Custom Homes",
    monogram: "A1",
    logo: "/partners/a1-custom-homes/logo.png",
    principal: "Ankush Arora",
    suburb: "Epping",
    state: "VIC",
    tagline:
      "An Epping builder for Melbourne's north and west, carrying homes from planning permit to keys, with townhouses and multi-units alongside new builds.",
    disciplines: ["New homes", "Townhouses and multi-units", "Renovations and extensions"],
    google: { rating: 5.0, reviews: 12 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "12 reviews" },
      {
        label: "Experience",
        value: "10 yrs",
        sub: "across Melbourne's growth corridors",
      },
      {
        label: "Planning and permits",
        value: "In-house",
        sub: "council applications handled end to end",
      },
    ],
    why: "Every client A1 Custom Homes has heard from on Google says the same thing: five stars, twelve times over. Director Ankush Arora, a registered building practitioner, has spent a decade building where Melbourne is growing fastest, the northern and western corridors, and the practice is shaped around the part owners dread most: planning. Permits are prepared and lodged in-house, so approvals arrive on time and projects start when they should. The range runs wider than most, from custom new homes and knockdown rebuilds to townhouses and multi-unit developments, with renovations and extensions in between. For an owner building in the north or west who wants one team from council to keys, this is a strong pair of hands.",
    about:
      "A1 Custom Homes is a residential building company in Epping, led by director Ankush Arora, a registered building practitioner. The team designs and delivers new custom homes, knockdown rebuilds, renovations and extensions, and townhouse and multi-unit developments across Melbourne's northern and western suburbs, working in communities such as Wollert, Donnybrook, Mickleham, Wallan, Sunbury, Tarneit, Truganina, Fraser Rise and Melton. Planning permits are handled in-house, with applications prepared and lodged with council so projects are approved and started on time. The practice works comfortably in both contemporary and conventional design, takes client preferences as the starting point for every build, and treats feedback as part of how the service improves.",
    facts: {
      experience: "10 yrs",
      basedIn: "Epping, VIC",
      serves: "Melbourne's north and west",
      focus: "New homes, townhouses and multi-units",
    },
    website: "https://a1customhomes.com.au",
    instagram: "https://www.instagram.com/OFFICIALA1CUSTOMHOMES",
    facebook: "https://www.facebook.com/a1customhome/",
    galleryUrl: "https://a1customhomes.com.au/",
    work: [
      {
        title: "Corner block home",
        suburb: "Melbourne's north",
        type: "New home",
        image: "/partners/a1-custom-homes/facade.jpg",
      },
      {
        title: "White kitchen and dining",
        suburb: "Melbourne's west",
        type: "Interior",
        image: "/partners/a1-custom-homes/kitchen.jpg",
      },
      {
        title: "Marble bathroom",
        suburb: "Melbourne's north",
        type: "Interior",
        image: "/partners/a1-custom-homes/bathroom.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "grg-construction",
    kind: "builder",
    draft: true,
    roleLabel: "Renovation and extension builder",
    name: "GRG Construction",
    monogram: "GR",
    logo: "/partners/grg-construction/logo.png",
    principal: "Gian Riboni",
    suburb: "Melbourne",
    state: "VIC",
    tagline:
      "A Melbourne renovation and extension specialist that does things right the first time, with one hands-on team from permits to final finishes.",
    disciplines: ["Renovations", "Extensions", "New builds"],
    google: { rating: 5.0, reviews: 3 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "3 reviews" },
      {
        label: "Experience",
        value: "10+ yrs",
        sub: "renovations, extensions and new builds",
      },
      {
        label: "Project management",
        value: "Hands‑on",
        sub: "permits to final finishes",
      },
    ],
    why: "GRG Construction was founded on a simple discipline: do it right the first time. Director Gian Riboni leads a team of builders and tradespeople with more than ten years in the industry, and runs projects the way owners wish every builder would: clear timelines and upfront communication, premium materials backed by quality assurance, and hands-on management of every detail from permits through to final finishes. The Google record is short and spotless, five stars from every client who has left one. For an owner reworking or extending a Melbourne home who wants one accountable team across the whole job, this is a builder worth meeting.",
    about:
      "GRG Construction is a Melbourne building company specialising in residential renovations and extensions, alongside new custom builds, led by director Gian Riboni. Founded on a passion for high-quality construction, the team pairs more than ten years of industry experience with a hands-on approach to every project: transparent planning and timelines, upfront communication, premium materials and expert techniques, and project management that covers everything from permits to the final finish. Licensed and insured, the practice takes the time to understand each client's vision and tailors every renovation, extension or new build to the way they live.",
    facts: {
      experience: "10+ yrs",
      basedIn: "Melbourne, VIC",
      serves: "Melbourne",
      focus: "Renovations, extensions and new builds",
    },
    website: "https://grgconstruction.com.au",
    instagram: "https://www.instagram.com/grgconstruction/",
    facebook: "https://www.facebook.com/61581396730686/",
    galleryUrl: "https://grgconstruction.com.au/",
    work: [
      {
        title: "Craigieburn",
        suburb: "Craigieburn",
        type: "Renovation",
        image: "/partners/grg-construction/craigieburn.jpg",
      },
      {
        title: "St Kilda",
        suburb: "St Kilda",
        type: "Outdoor extension",
        image: "/partners/grg-construction/stkilda.jpg",
      },
      {
        title: "Two-storey frame",
        suburb: "Melbourne",
        type: "New build",
        image: "/partners/grg-construction/frame.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "delcon-design-and-construct",
    kind: "builder",
    draft: true,
    roleLabel: "Design and construct builder",
    name: "Delcon Design and Construct",
    monogram: "DC",
    logo: "/partners/delcon-design-and-construct/logo.png",
    principal: "Daniel Ellul",
    suburb: "Tullamarine",
    state: "VIC",
    tagline:
      "The Melbourne design and construct team that makes multi-unit development simple, led by an investor director who builds as if the project were his own.",
    disciplines: ["Multi-unit developments", "Custom homes", "Design and construct"],
    google: { rating: 5.0, reviews: 18 },
    institution: {
      name: "Master Builders Victoria",
      role: "Member",
      note: "Registered building practitioner · Victorian Building Authority",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "18 reviews" },
      {
        label: "Building since",
        value: "2010",
        sub: "design and construct, Melbourne",
      },
      {
        label: "Construction experience",
        value: "40+ yrs",
        sub: "behind the delcon team",
      },
    ],
    why: "Multi-unit development is where most owners get lost, and it is exactly the process delcon was established in 2010 to simplify. The Tullamarine team runs the whole journey under one roof, feasibility, building design, subdivision, project management and construction, so an inexperienced or time poor investor is never left coordinating consultants on their own. Director Daniel Ellul is an active property investor himself, and every client deals with him directly, borrowing that experience first hand. The practice is a member of Master Builders Victoria, a registered building practitioner with the VBA, and holds a perfect 5.0 across 18 Google reviews. For an owner weighing a duplex, a townhouse project or a custom home, this is a develop-with-confidence introduction.",
    about:
      "delcon design and construct is a boutique residential design and construction company in Tullamarine, established in 2010 from a vision to simplify the multi-unit development process. Led by owner director Daniel Ellul and backed by more than forty years of construction industry experience, the team carries projects from feasibility and building design through subdivision, project management and full construction, working with a hand-picked group of creative designers, quality suppliers and skilled trades. As active property investors themselves, the delcon team brings first-hand development experience to every job, and clients always have immediate access to the director. The primary focus is enabling clients to succeed with multi-unit and dual occupancy developments, and the same design and construct discipline goes into custom family homes, delivered on time and on budget. delcon is a registered building practitioner with the Victorian Building Authority and a member of Master Builders Victoria.",
    facts: {
      established: "2010",
      basedIn: "Tullamarine, VIC",
      serves: "Melbourne",
      focus: "Multi-unit developments and custom homes",
    },
    website: "https://delcon.net.au",
    instagram: "https://www.instagram.com/delcon_design_and_construct/",
    facebook: "https://www.facebook.com/DelconDesignAndConstruct/",
    linkedin: "https://www.linkedin.com/in/daniel-ellul-3b752560/",
    galleryUrl: "https://delcon.net.au/",
    work: [
      {
        title: "Pascoe Vale",
        suburb: "Pascoe Vale",
        type: "Side-by-side townhouses",
        image: "/partners/delcon-design-and-construct/pascoe-vale.jpg",
      },
      {
        title: "Altona North",
        suburb: "Altona North",
        type: "Multi-unit development",
        image: "/partners/delcon-design-and-construct/altona-north.jpg",
      },
      {
        title: "Essendon",
        suburb: "Essendon",
        type: "Bathroom",
        image: "/partners/delcon-design-and-construct/essendon.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "de-lune-construction",
    kind: "builder",
    builderProfileSlug: "de-lune-construction-db683d",
    roleLabel: "Architectural builder",
    name: "de Lune Construction",
    monogram: "DL",
    logo: "/partners/de-lune-construction/logo.png",
    principal: "Fletcher Thompson",
    suburb: "Hawthorn",
    state: "VIC",
    tagline:
      "A Hawthorn construction team led by an architecture graduate with dual builder registration, carrying Melbourne's complex architectural projects from concept to completion.",
    disciplines: ["Complex architectural builds", "New homes", "Commercial projects"],
    google: { rating: 5.0, reviews: 2 },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "2 reviews" },
      {
        label: "Experience",
        value: "15 yrs",
        sub: "complex architectural builds",
      },
      {
        label: "Builder registration",
        value: "Dual",
        sub: "residential and commercial",
      },
    ],
    why: "de Lune Construction approaches building as the continuation of architecture.\n\nLed by director Fletcher Thompson, whose background spans both an architectural education and construction, the practice understands that exceptional projects are the product of thousands of considered decisions long before work begins on site. Planning is rigorous, communication is direct and execution is disciplined, allowing architects and clients to move through construction with confidence.\n\nRather than simply delivering what is documented, de Lune works collaboratively to resolve details, protect design intent and build with the same level of care that shaped the original concept. It is a measured, thoughtful approach that makes them a natural fit for architecturally ambitious projects.",
    about:
      "de Lune Construction is a Hawthorn based builder specialising in architecturally designed residential and commercial projects across Melbourne.\n\nWorking closely with architects, consultants and clients, the practice delivers projects from early planning through to completion, with an emphasis on detailed preparation, transparent communication and uncompromising quality. Every project is approached with the belief that better planning leads to better outcomes on site.\n\nThe portfolio spans bespoke homes alongside detailed commercial and hospitality work, from the Malvern and Nicholson residences to Programa HQ and Curve Cycling Melbourne. It reflects a practice trusted to deliver projects where precision, collaboration and attention to detail matter.",
    facts: {
      experience: "15 yrs",
      basedIn: "Hawthorn, VIC",
      serves: "Melbourne",
      focus: "Complex architectural builds",
    },
    website: "https://www.delune.com.au",
    instagram: "https://www.instagram.com/deluneconstruction",
    linkedin: "https://www.linkedin.com/in/fletcher-thompson-2155a184/",
    galleryUrl: "https://www.delune.com.au/",
    work: [
      {
        title: "Calacatta kitchen",
        suburb: "Melbourne",
        type: "Interior",
        image: "/partners/de-lune-construction/kitchen.jpg",
      },
      {
        title: "Stone powder room",
        suburb: "Melbourne",
        type: "Interior",
        image: "/partners/de-lune-construction/powder.jpg",
      },
      {
        title: "Hydronic slab pour",
        suburb: "Melbourne",
        type: "On site",
        image: "/partners/de-lune-construction/onsite.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "pache-built",
    kind: "builder",
    draft: true,
    roleLabel: "Custom home builder",
    name: "Pache Built",
    monogram: "PB",
    logo: "/partners/pache-built/logo.png",
    principal: "Matthew Pace",
    suburb: "Spotswood",
    state: "VIC",
    tagline:
      "A Spotswood builder crafting high-end homes across Melbourne's inner west, with certified Passive Haus skills behind healthier, higher-performing builds.",
    disciplines: ["Custom homes", "Renovations and extensions", "Passive House builds"],
    google: { rating: 5.0, reviews: 30 },
    institution: {
      name: "Australian Passive Haus Association",
      role: "Member",
      note: "Certified Passive Haus Tradesperson · HIA member · VBA registered",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "30 reviews" },
      {
        label: "Experience",
        value: "17+ yrs",
        sub: "tradesman turned builder",
      },
      {
        label: "Passive Haus",
        value: "Certified",
        sub: "healthier, higher-performing homes",
      },
    ],
    why: "Thirty Google reviews, every one of them five stars: that is the deepest perfect record on our builder register, and it belongs to a tradesman. Matthew Pace spent seventeen years on the tools before building Pache Built around the things sites often lose: relationships, precision craftsmanship and finishes that last. The practice is also a rarity in Melbourne's west, a Certified Passive Haus Tradesperson business and Australian Passive Haus Association member, pairing traditional carpentry with building science for homes that are healthier, cheaper to run and better to live in. From Spotswood and Yarraville renovations to full custom builds, this is quality you can walk through, and clients who cannot stop saying so.",
    about:
      "Pache Built is a residential building company in Spotswood, established in 2012 and led by founder Matthew Pace, a tradesman turned builder with more than seventeen years of industry experience. The team designs and delivers custom homes, renovations, extensions and Passive House builds across Melbourne's inner west, from Spotswood, Yarraville, Williamstown, Newport and Seddon through to Altona, and inner-north suburbs such as Brunswick and Fitzroy. Grounded in relationships, precision craftsmanship and a commitment to lifting the standard of residential construction, the practice combines traditional carpentry and timber detailing with forward-thinking building principles for healthier, cost-effective, sustainable and higher-performing homes. Matthew is a VBA registered building practitioner, a Housing Industry Association member, and a Certified Passive Haus Tradesperson with membership of the Australian Passive Haus Association.",
    facts: {
      established: "2012",
      basedIn: "Spotswood, VIC",
      serves: "Melbourne's inner west",
      focus: "Custom homes, renovations and Passive House builds",
    },
    website: "https://pachebuilt.com",
    instagram: "https://www.instagram.com/pache_built/",
    facebook: "https://www.facebook.com/people/Pache-Built/100063840708805/",
    galleryUrl: "https://pachebuilt.com/",
    work: [
      {
        title: "Edithvale",
        suburb: "Edithvale",
        type: "Kitchen and extension",
        image: "/partners/pache-built/edithvale.jpg",
      },
      {
        title: "Spotswood",
        suburb: "Spotswood",
        type: "Bathroom renovation",
        image: "/partners/pache-built/spotswood.jpg",
      },
      {
        title: "Altona North",
        suburb: "Altona North",
        type: "Bathroom renovation",
        image: "/partners/pache-built/altona-north.jpg",
      },
    ],
    joined: "2026",
  },
  {
    slug: "create-build-enjoy",
    kind: "builder",
    draft: true,
    roleLabel: "Outdoor structures specialist",
    name: "Create Build Enjoy",
    monogram: "CB",
    logo: "/partners/create-build-enjoy/logo.png",
    suburb: "Fyshwick",
    state: "ACT",
    states: ["ACT", "NSW"],
    tagline:
      "Canberra's outdoor specialists and authorised Stratco dealer, turning backyards into rooms with patios, opening roofs and outdoor kitchens, supplied and installed under one price.",
    disciplines: [
      "Patios, carports and pergolas",
      "Opening and louvre roofs",
      "Decking, sunrooms and outdoor rooms",
    ],
    google: { rating: 5.0, reviews: 70 },
    institution: {
      name: "Stratco",
      role: "Authorised Outback dealer and installer",
      note: "Australia's leading outdoor structures manufacturer",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "70 reviews" },
      {
        label: "In Canberra",
        value: "15 yrs",
        sub: "outdoor construction",
      },
      {
        label: "Price promise",
        value: "Supply + install",
        sub: "one comprehensive quote",
      },
    ],
    why: "Seventy five-star reviews and not a single one lower: that is the deepest perfect record on our entire register, and it belongs to the team that will build your backyard. Create Build Enjoy has spent fifteen years turning Canberra yards into rooms, patios, carports, pergolas, opening and louvre roofs, decking, sunrooms and outdoor kitchens, as an authorised Stratco Outback dealer and installer, so the structure over your head carries the name of Australia's leading manufacturer. Everything comes as one supply-and-install price, and the business is licensed in both the ACT and New South Wales, holds a builder's licence and carries an ACT Secure Local Jobs certificate. For a homeowner or developer who wants an outdoor space done properly and backed to last, this is a rare five-star pair of hands.",
    about:
      "Create Build Enjoy, CBE, is a Canberra outdoor construction company based in Fyshwick, with fifteen years of service in the local building industry. The team specialises in transforming outdoor spaces: patios, carports, pergolas, opening and louvre roofs, decking, sunrooms, granny flats, extensions and outdoor blinds, delivered as a comprehensive supply-and-install package. As an authorised Stratco Outback dealer and installer, CBE partners with Australia's leading manufacturer of outdoor structures and building products, pairing that product quality with its own craftsmanship and reliability. The business holds a builder's licence, is licensed in both the ACT and New South Wales, and carries an ACT Government Secure Local Jobs certificate, working across residential and commercial projects from single patios to multi-unit developments and custom opening-roof installations.",
    facts: {
      experience: "15 yrs",
      basedIn: "Fyshwick, ACT",
      serves: "Canberra and surrounding NSW",
      focus: "Patios, opening roofs and outdoor rooms",
    },
    website: "https://createbuild.com.au",
    instagram: "https://www.instagram.com/create.build.enjoy/",
    facebook: "https://www.facebook.com/141248096444815",
    linkedin: "https://www.linkedin.com/company/96955711/",
    galleryUrl: "https://createbuild.com.au/",
    work: [
      {
        title: "Flat-roof pavilion",
        suburb: "Canberra",
        type: "Patio and outdoor kitchen",
        image: "/partners/create-build-enjoy/pavilion.jpg",
      },
      {
        title: "Gabled outdoor room",
        suburb: "Canberra",
        type: "Patio and entertaining",
        image: "/partners/create-build-enjoy/outdoor-room.jpg",
      },
      {
        title: "Stone bathroom",
        suburb: "Canberra",
        type: "Extension",
        image: "/partners/create-build-enjoy/bathroom.jpg",
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
    roleLabel: "Mortgage adviser",
    name: "Ed Akgun",
    monogram: "EA",
    portrait: "/partners/ed-akgun/portrait.jpg",
    logoFloat: "/partners/ed-akgun/logo-float-v2.png",
    suburb: "Airport West",
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
    google: { rating: 4.9, reviews: 135 },
    stats: [
      {
        label: "Google rating",
        value: "4.9",
        star: true,
        sub: "RateOne · 135 reviews",
      },
      { label: "In lending and banking", value: "13+ yrs" },
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
    why:
      "Ed spent ten years inside Commonwealth Bank, from mortgage lending through premier banking to senior relationship management, before crossing to broking.\n\nThat history means he reads a lender’s decision the way an insider does, and now works a panel of more than thirty banks for the client, structuring loans around the build ahead so pre-approvals hold and progress payments arrive on time. That mix of insider knowledge and client-side independence is what we want beside an owner building.",
    aboutLabel: "About Ed",
    about:
      "Ed Akgun is a mortgage adviser with RateOne, a full service broking firm named a Top 25 Brokerage by The Adviser six years running, with more than ten thousand clients across its Melbourne offices. Ed holds a Diploma of Finance and Mortgage Broking and is an MFAA accredited credit adviser. He came to broking after a decade with Commonwealth Bank, and works across purchases, refinancing and construction lending for clients throughout Melbourne, with RateOne's financial planning arm alongside when it is needed.",
    facts: {
      basedIn: "Airport West, VIC",
      serves: "Melbourne",
      focus: "Home and construction lending",
    },
    website: "https://rateone.com.au",
    instagram: "https://www.instagram.com/rateone.homeloans/",
    linkedin: "https://www.linkedin.com/in/ed-akgun-528793116/",
    booking: "https://calendly.com/ed--d4a0/30min/",
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
    roleLabel: "Lending adviser",
    name: "Billy",
    monogram: "B",
    portrait: "/partners/billy-chok/portrait.jpg",
    logoFloat: "/partners/billy-chok/logo-float-v2.png",
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
    why:
      "Billy has seen lending from every seat: broking from 2007, home finance at Westpac, then senior credit analysis at La Trobe Financial, where he was the person an application had to convince.\n\nHe founded Cloud Financial Group in 2020 to put that picture to work for clients, across home loans, construction and development finance. He develops property himself, so he has carried a construction loan from the borrower’s side, which shows in how he structures one: pre-approvals that hold, drawdowns on time, no surprises at valuation.",
    aboutLabel: "About Billy",
    about:
      "Billy is the founder of Cloud Financial Group, a Melbourne based advisory arranging residential, commercial and development finance, with insurance alongside, for clients across Australia. His path to broking ran through both sides of the industry: home lending with Westpac, then senior credit analysis with La Trobe Financial, one of Australia's largest non bank lenders. That credit background shapes how the firm works, with applications built the way an assessor reads them, whether the project is a first build, a knockdown rebuild or a multi unit development.",
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
    roleLabel: "Senior finance broker",
    name: "Jason Pogorelec",
    monogram: "JP",
    portrait: "/partners/jason-pogorelec/portrait.jpg",
    suburb: "West Melbourne",
    state: "VIC",
    tagline:
      "Finance broking for people building homes and portfolios, with strategy that looks past a single settlement.",
    disciplines: ["Construction loans", "Investment lending", "SMSF"],
    google: { rating: 5.0, reviews: 998 },
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
    instagram: "https://www.instagram.com/jasonpogorelecfinance/",
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
    roleLabel: "Principal broker",
    name: "Maninder Kaur",
    monogram: "MK",
    portrait: "/partners/maninder-kaur/portrait.jpg",
    logoFloat: "/partners/maninder-kaur/logo-float-v2.png",
    suburb: "Campbellfield",
    state: "VIC",
    tagline:
      "Home, construction and commercial lending, from a principal broker who invests in property herself.",
    disciplines: ["Construction loans", "First home buyers", "Complex approvals"],
    google: { rating: 5.0, reviews: 569 },
    institution: {
      name: "Evergrow Finance",
      role: "Founder and Principal Broker",
      note: "FBAA and AFCA member",
      logo: "/partners/maninder-kaur/evergrow.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "Evergrow · 569 reviews" },
      { label: "In finance broking", value: "10+ yrs" },
      { label: "Lenders on the panel", value: "45+", sub: "via Loan Market Group" },
    ],
    why:
      "Maninder lives what she advises. A property investor and business owner herself, she has spent a decade in broking making difficult files work: self employed income, first homes, imperfect credit histories and construction lending.\n\nClients get a problem solver with a panel of more than forty five lenders behind her, who works hand in hand with the agents, accountants and planners around a purchase. That is how a broker should operate inside a build team.",
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
    slug: "lan-truong",
    kind: "finance",
    draft: true,
    roleLabel: "Finance broker",
    name: "Lan Truong",
    monogram: "LT",
    portrait: "/partners/lan-truong/portrait.jpg",
    suburb: "Footscray",
    state: "VIC",
    tagline:
      "Home and construction lending from a Footscray shopfront, backed by twenty five years in banking and finance.",
    disciplines: ["Construction loans", "Home loans", "Investment lending"],
    institution: {
      name: "Vantage Point Lending",
      role: "Director and Finance Broker",
      note: "Australian Credit Licence 389087",
      logo: "/partners/lan-truong/vantage-point.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "Vantage Point · 195 reviews" },
      { label: "In banking and finance", value: "25 yrs", sub: "since 2001" },
      { label: "With NAB", value: "15 yrs", sub: "before broking" },
    ],
    why: "Lan has been in banking and finance since 2001, fifteen of those years with NAB, where she ran branches and managed business banking portfolios before crossing to broking. That depth shows in the record her clients have left behind: a perfect five star Google rating across one hundred and ninety five reviews, built one settlement at a time from her Footscray shopfront. She does the legwork, negotiates directly with the lender, and stays involved well past approval, which is exactly the steadiness we want behind an owner funding a build.",
    aboutLabel: "About Lan",
    about:
      "Lan Truong is the director of Vantage Point Lending, a boutique Footscray brokerage she founded in 2019 after three years as a Loan Market director and fifteen years with National Australia Bank, where she rose from lending operations to branch manager and business banker. Her team works across home, investment, construction, commercial and equipment lending under Australian Credit Licence 389087, serving clients from Maribyrnong, Ascot Vale and Sunshine to greater Melbourne, in the western suburbs communities she has served since her banking days. The firm's line is simple: they work for you, not the banks.",
    facts: {
      basedIn: "Footscray, VIC",
      serves: "Greater Melbourne",
      focus: "Home, construction and investment lending",
    },
    website: "https://www.vplending.com.au",
    linkedin: "https://www.linkedin.com/in/lan-truong-09983291/",
    servicesLabel: "Where Lan helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "First home buyers",
      "Residential and commercial investment",
      "Refinancing and renovation lending",
      "Car and equipment finance",
    ],
    joined: "2026",
  },
  {
    slug: "shan-chhetri",
    kind: "finance",
    draft: true,
    roleLabel: "Mortgage broker",
    name: "Shan Chhetri",
    monogram: "SC",
    portrait: "/partners/shan-chhetri/portrait.jpg",
    suburb: "Mickleham",
    state: "VIC",
    tagline:
      "Home, first home and investment lending from a broker who is also a CPA, built on structure, cash flow and long-term cost.",
    disciplines: ["First home buyers", "Investment lending", "Self-employed"],
    institution: {
      name: "Mortgage Choice",
      role: "Mortgage broker",
      note: "One of Australia’s longest established broking networks",
      logo: "/partners/shan-chhetri/mortgage-choice.png",
    },
    stats: [
      { label: "Qualified as", value: "CPA", sub: "and a mortgage broker" },
      { label: "Advice built on", value: "Structure", sub: "cash flow and long-term cost" },
      { label: "Serves", value: "Local", sub: "Mickleham, Craigieburn, Greenvale" },
    ],
    why: "Shan is a Certified Practising Accountant as well as a mortgage broker, and that combination is exactly why we like him beside an owner planning a build. Where most brokers look at the loan, he reads the whole picture: how a facility is structured, what it does to cash flow, and what it truly costs over the life of the loan, not just the headline rate. First home buyers, growing families and business owners are his day to day, and the same rigour that makes a good accountant, careful with the numbers and clear about the trade offs, is what turns complex lending into a plan an owner can actually follow.",
    aboutLabel: "About Shan",
    about:
      "Shan Chhetri is a Mickleham based mortgage broker and Certified Practising Accountant, working under Mortgage Choice, one of Australia’s longest established broking networks. He supports home buyers across Mickleham, Craigieburn and Greenvale, with particular depth for first home buyers, families and business owners, and brings years of accounting alongside his lending experience. His approach is deliberately practical: understand the client’s goals, structure the finance around cash flow and long term cost, and turn complex lending into simple, considered steps.",
    facts: {
      basedIn: "Mickleham, VIC",
      serves: "Melbourne’s north",
      focus: "Home, investment and business lending",
    },
    website: "https://www.mortgagechoice.com.au/shan.chhetri/",
    linkedin: "https://www.linkedin.com/company/mortgage-choice/",
    servicesLabel: "Where Shan helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "First home buyers",
      "Loan structuring for cash flow and cost",
      "Lending for the self-employed and business owners",
      "Refinancing and investment lending",
    ],
    joined: "2026",
  },
  {
    slug: "robert-stipanic",
    kind: "finance",
    draft: true,
    roleLabel: "Finance broker",
    name: "Robert Stipanic",
    monogram: "RS",
    portrait: "/partners/robert-stipanic/portrait.jpg",
    suburb: "Melbourne",
    state: "VIC",
    tagline:
      "Home and business lending from a broker with twenty five years in finance, sixteen of them inside the bank, offered mobile across Melbourne.",
    disciplines: ["Home loans", "Business and commercial", "Refinancing"],
    google: { rating: 5.0, reviews: 151 },
    institution: {
      name: "Mortgage Choice",
      role: "Finance broker",
      note: "Practising as Smartline Personal Mortgage Advisers",
      logo: "/partners/robert-stipanic/mortgage-choice.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "151 reviews" },
      { label: "In lending", value: "25 yrs", sub: "banking and broking" },
      { label: "Inside Commonwealth Bank", value: "16 yrs", sub: "business and corporate finance" },
    ],
    why: "Robert spent sixteen years inside the Commonwealth Bank, rising from analyst to relationship executive in corporate and business finance, managing portfolios of commercial clients turning over ten million dollars and more, before he moved to broking in 2017. That is an unusually deep grounding for a mortgage broker: he has sat on the bank’s side of the table and understands how credit decisions are really made. Twenty five years in lending, a genuinely consultative manner, and a mobile service that comes to the client are exactly what we want beside an owner weighing up how to fund a build.",
    aboutLabel: "About Robert",
    about:
      "Robert Stipanic is a Melbourne finance broker with more than twenty five years in lending. He spent sixteen of them at the Commonwealth Bank, progressing from financial analyst to relationship executive across business and corporate finance, where he looked after portfolios of commercial clients with turnover above ten million dollars, before becoming a broker in 2017. He practises as Smartline Personal Mortgage Advisers, part of the Mortgage Choice network, one of Australia’s largest broking groups with a panel of more than forty lenders. His approach is deliberately consultative: listen closely to a client’s situation and goals, then find the finance that genuinely suits their circumstances. He offers a mobile service across Melbourne and surrounds.",
    facts: {
      basedIn: "Melbourne, VIC",
      serves: "Melbourne and surrounds",
      focus: "Home and business lending",
    },
    website: "https://www.mortgagechoice.com.au/robert.stipanic/",
    linkedin: "https://www.linkedin.com/in/robert-stipanic/",
    servicesLabel: "Where Robert helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "Home loans and refinancing",
      "Business and commercial lending",
      "Investment property finance",
      "Self-employed and business owners",
    ],
    joined: "2026",
  },
  {
    slug: "tim-murphy",
    kind: "finance",
    roleLabel: "Mortgage broker",
    name: "Tim Murphy",
    monogram: "TM",
    portrait: "/partners/tim-murphy/portrait.jpg",
    logoFloat: "/partners/tim-murphy/logo-float-v4.png",
    suburb: "Melbourne",
    state: "VIC",
    tagline:
      "First home, investment and refinance lending from a broker who brings a strategist’s eye and negotiates hard with the banks on your behalf.",
    disciplines: ["First home buyers", "Investment lending", "Refinancing"],
    google: { rating: 5.0, reviews: 25 },
    institution: {
      name: "Mortgage Choice",
      role: "Mortgage broker",
      note: "One of Australia’s largest broker networks",
      logo: "/partners/tim-murphy/mortgage-choice.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "25 reviews" },
      {
        label: "Commercial career",
        value: "15+ yrs",
        sub: "across APAC, including REA Group",
      },
      { label: "Serves", value: "Local", sub: "Fitzroy to Craigieburn" },
    ],
    why:
      "Tim came to broking after more than fifteen years leading commercial and operations teams across the Asia Pacific, including a period at REA Group, the company behind Mortgage Choice itself.\n\nThat background shows in how he works: a clear strategy at the start, then hard, informed negotiation to land the right deal. Add a five star rating across every review and a focus on keeping it easy, and he is a broker we are glad to put in front of an owner planning a build.",
    aboutLabel: "About Tim",
    about:
      "Tim Murphy is a Melbourne mortgage broker with Mortgage Choice, serving clients from Fitzroy through to Craigieburn. Before broking he spent more than fifteen years in senior commercial and operations roles across the Asia Pacific, in business strategy, negotiation and partnerships, including several years at REA Group, the property group that owns Mortgage Choice. He brings that same strategic, deal focused approach to home lending: build a clear plan for first home buyers, investors and those refinancing, then advocate with the lenders to secure a strong outcome, all with the exceptional, straightforward service his clients consistently rate five stars.",
    facts: {
      basedIn: "Melbourne, VIC",
      serves: "Melbourne, Fitzroy to Craigieburn",
      focus: "Home, investment and refinance lending",
    },
    website: "https://www.mortgagechoice.com.au/tim.murphy/",
    linkedin: "https://www.linkedin.com/in/tim-murphy-52a07537/",
    servicesLabel: "Where Tim helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "First home buyers",
      "Investment property finance",
      "Refinancing to a better deal",
      "A clear plan, then negotiation with the banks",
    ],
    joined: "2026",
  },
  {
    slug: "rhys-elmi",
    kind: "finance",
    roleLabel: "Mortgage broker",
    name: "Rhys Elmi",
    monogram: "RE",
    portrait: "/partners/rhys-elmi/portrait.jpg",
    /* The canonical Mortgage Choice lockup float (owned by tim-murphy's
       asset dir) — livePartnerLogos dedupes identical srcs, so the brand
       shows once in the marquee however many MC brokers are live. */
    logoFloat: "/partners/tim-murphy/logo-float-v4.png",
    suburb: "Cheltenham",
    state: "VIC",
    tagline:
      "A first home buyer specialist and property investor himself, guiding buyers through every step with a teacher’s patience.",
    disciplines: ["First home buyers", "Investment lending", "Construction loans"],
    google: { rating: 5.0, reviews: 147 },
    institution: {
      name: "Mortgage Choice Cheltenham",
      role: "Broker and business partner",
      note: "Part of the Mortgage Choice network",
      logo: "/partners/rhys-elmi/mortgage-choice.png",
    },
    stats: [
      {
        label: "Google rating",
        value: "5.0",
        star: true,
        sub: "Cheltenham office · 147 reviews",
      },
      { label: "Broking since", value: "2021", sub: "business partner since 2024" },
      { label: "Property investor", value: "Himself", sub: "invests alongside his clients" },
    ],
    why:
      "Rhys came to broking from an unusual place: five years teaching at a private school on the Mornington Peninsula, until buying his own first home in 2020 changed his career.\n\nThat teacher’s instinct to explain things clearly still defines how he works, and it is why first home buyers seek him out. He has guided many through a first purchase start to finish, invests in property himself, and became a business partner at the five star Mortgage Choice Cheltenham practice in 2024. With the team’s depth in construction lending, he is a natural fit beside an owner building.",
    aboutLabel: "About Rhys",
    about:
      "Rhys Elmi is a Cheltenham mortgage broker who joined Mortgage Choice in 2021 and became a business partner at the firm’s Cheltenham practice in July 2024. He came to lending after five years teaching at a private school on the Mornington Peninsula, a change prompted by buying his own first home in 2020 and studying through the pandemic to make the move. An active property investor himself, he specialises in first home buyers, helping them understand the preparation a strong loan application needs, and works across investment, construction and refinancing through the Mortgage Choice network. Clients rate the Cheltenham practice five stars across 147 reviews.",
    facts: {
      basedIn: "Cheltenham, VIC",
      serves: "Melbourne",
      focus: "First home, investment and construction lending",
    },
    website:
      "https://www.mortgagechoice.com.au/shaun.curtis/our-team/team-profiles/rhys-elmi/",
    instagram: "https://www.instagram.com/home_loan_helper/",
    facebook: "https://www.facebook.com/rhyselmimortgagebroker",
    linkedin: "https://www.linkedin.com/in/rhys-elmi-43ab2911a/",
    servicesLabel: "Where Rhys helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "First home buyers",
      "Getting a first application approval ready",
      "Investment property finance",
      "Refinancing to a better deal",
    ],
    joined: "2026",
  },
  {
    slug: "chris-paton",
    kind: "finance",
    draft: true,
    roleLabel: "Mortgage broker",
    name: "Chris Paton",
    monogram: "CP",
    portrait: "/partners/chris-paton/portrait.jpg",
    suburb: "Mornington Peninsula",
    state: "VIC",
    tagline:
      "A Mornington Peninsula local who builds genuine, lasting relationships and makes the whole finance process feel simple.",
    disciplines: ["First home buyers", "Investment lending", "Renovation and refinance"],
    google: { rating: 5.0, reviews: 22 },
    institution: {
      name: "Mortgage Choice",
      role: "Mortgage broker",
      note: "Serving the Mornington Peninsula",
      logo: "/partners/chris-paton/mortgage-choice.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "22 reviews" },
      { label: "On the Peninsula", value: "Local", sub: "lived here most of his life" },
      { label: "Known for", value: "Service", sub: "no request is too much trouble" },
    ],
    why: "Chris has lived on the Mornington Peninsula for most of his life, and it shows in how he works: genuine, long term relationships and a level of service where no question or request is too much trouble. He came to broking from an entrepreneur’s background, having designed, made and wholesaled his own furniture, so he understands both running a business and building something with your hands. For first home buyers, investors and owners looking to renovate, he takes the time to explain the whole process so they feel confident and in control, which is exactly the steadying presence we want beside someone financing a build.",
    aboutLabel: "About Chris",
    about:
      "Chris Paton is a Mornington Peninsula mortgage broker with Mortgage Choice, and a local through and through, having lived in the area for most of his life and stayed close to its community and sporting clubs, first growing up and now with his own children. He came to lending from an entrepreneurial background in the furniture industry, where he ran his own wholesale business with products he designed and made himself. He brings that same care to broking: building genuine, lasting relationships and guiding clients, whether they are buying a first home, investing, refinancing or renovating, through the entire process so they feel confident and empowered.",
    facts: {
      basedIn: "Mornington Peninsula, VIC",
      serves: "The Mornington Peninsula and Melbourne’s southeast",
      focus: "First home, investment and renovation lending",
    },
    website:
      "https://www.mortgagechoice.com.au/chris.paton/our-team/team-profiles/chris-paton/",
    linkedin: "https://www.linkedin.com/in/chris-paton-654675338/",
    servicesLabel: "Where Chris helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "First home buyers",
      "Renovation and refinance lending",
      "Investment property finance",
      "Understanding the whole process, start to finish",
    ],
    joined: "2026",
  },
  {
    slug: "paul-wojtaszak",
    kind: "finance",
    draft: true,
    roleLabel: "Principal broker",
    name: "Paul Wojtaszak",
    monogram: "PW",
    portrait: "/partners/paul-wojtaszak/portrait.jpg",
    suburb: "Griffith",
    state: "ACT",
    tagline:
      "Home, investment and construction lending from a multi award Canberra broker, guiding clients with the clarity of a fixed star.",
    disciplines: ["First home buyers", "Investment lending", "Land and build"],
    google: { rating: 5.0, reviews: 126 },
    institution: {
      name: "Pollux Financial",
      role: "Founder and Principal Broker",
      note: "MFAA member · Credit representative under ACL 391237",
      logo: "/partners/paul-wojtaszak/logo.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "126 reviews" },
      { label: "In mortgage broking", value: "12 yrs", sub: "since 2014" },
      { label: "Founder of Pollux", value: "2023", sub: "his own Canberra practice" },
    ],
    awards: [
      {
        label: "Platinum Achiever, four years running",
        sub: "2020, 2021, 2022 and 2023",
      },
      {
        label: "Top 5 Mortgage Broker in the ACT",
        sub: "RateMyAgent · two years running",
      },
      {
        label: "LMG Top 250 Brokers",
        sub: "2025",
      },
    ],
    why: "Paul is one of Canberra's most decorated brokers, and the record is not a matter of opinion: a five star rating across more than one hundred and twenty reviews, four consecutive years as a Platinum Achiever, and a place among the Top 5 brokers in the ACT two years running. He has spent twelve years in lending, eight of them as a partner at a leading Canberra brokerage before founding his own firm, Pollux Financial, in 2023. Named for the brightest star in Gemini, the practice is built on a guiding star idea: clear advice through the parts of property finance that most confuse people. For an owner planning a build, that clarity and that track record are exactly what we want on their side.",
    aboutLabel: "About Paul",
    about:
      "Paul Wojtaszak is the founder and principal broker of Pollux Financial, a Griffith practice he established in 2023 after eight years as a partner at a leading Canberra brokerage. He has worked in mortgage broking since 2014, and came to it from senior finance roles in the Australian public service. A multiple Platinum Achiever and a RateMyAgent Top 5 broker in the ACT, he works across first home purchases, investment, land and build, refinancing and equity release, with access to lenders nationwide through the LMG network. His approach is deliberately clear and personal: understand the client's position, explain each step in plain terms, and structure the finance to put their goals within reach. He is a member of the MFAA and a credit representative under Australian Credit Licence 391237.",
    facts: {
      basedIn: "Griffith, ACT",
      serves: "Canberra and nationwide",
      focus: "Home, investment and construction lending",
    },
    website: "https://polluxfinancial.au/paul-wojtaszak/",
    facebook: "https://www.facebook.com/p/Pollux-Financial-61556624043848/",
    linkedin: "https://www.linkedin.com/in/paul-wojtaszak-437162118/",
    servicesLabel: "Where Paul helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "First home buyers",
      "Land and build finance",
      "Investment property finance",
      "Refinancing and equity release",
    ],
    joined: "2026",
  },
  {
    slug: "austin-rulfs",
    kind: "finance",
    draft: true,
    roleLabel: "Founder and director",
    name: "Austin Rulfs",
    monogram: "AR",
    portrait: "/partners/austin-rulfs/portrait.jpg",
    suburb: "Adelaide",
    state: "SA",
    tagline:
      "Smarter home and investment lending from an Adelaide founder who has spent close to two decades helping Australians build wealth through property.",
    disciplines: ["Investment lending", "Construction loans", "First home buyers"],
    google: { rating: 4.9, reviews: 140 },
    institution: {
      name: "Zanda Wealth Mortgage Brokers",
      role: "Founder and Director",
      note: "Credit Representative 370592 under Australian Credit Licence 389328",
      logo: "/partners/austin-rulfs/logo.png",
    },
    stats: [
      { label: "Google rating", value: "4.9", star: true, sub: "140 reviews" },
      { label: "Lenders on panel", value: "100+", sub: "across Australia" },
      { label: "In finance since", value: "2006", sub: "close to two decades" },
    ],
    why: "Austin has spent close to two decades in property and finance. He founded Zanda Finance in 2006 and built Zanda Wealth into a practice known less for chasing the lowest rate than for structuring lending around a client's longer plan, whether that is a first home or a growing investment portfolio. His team works across a panel of more than one hundred lenders, and his own record is strong: a 4.9 rating across 140 reviews, and a place among the top five brokers in South Australia as ranked by Connective, the broking network he operates under. For an owner planning a build, that mix of investment thinking and lender breadth is exactly the kind of counsel we want on their side.",
    aboutLabel: "About Austin",
    about:
      "Austin Rulfs is the founder and director of Zanda Wealth Mortgage Brokers, an Adelaide firm he has built over close to two decades in property and finance. He launched Zanda Finance in 2006 and established Zanda Wealth as a property investment practice in 2014, and today the two work side by side: one helping clients arrange the right finance, the other helping them use it to build long term wealth. He works across first home buyers, upgraders, investors and refinancers, with access to more than one hundred lenders, and holds a Diploma of Financial Services and Mortgage Broking Management. His approach is deliberately plain: understand where a client wants to be in ten years, then structure the lending to help them get there. He operates as a credit representative under Australian Credit Licence 389328.",
    facts: {
      basedIn: "Adelaide, SA",
      serves: "Adelaide and nationwide",
      focus: "Home, investment and construction lending",
    },
    website: "https://zandawealth.com.au/about-austin-rulfs/",
    linkedin: "https://au.linkedin.com/in/austin-rulfs-28624172",
    servicesLabel: "Where Austin helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "First home buyers",
      "Investment property and portfolio finance",
      "Refinancing and restructuring",
      "Bridging finance for upgraders",
    ],
    joined: "2026",
  },
  {
    slug: "julie-judge",
    kind: "finance",
    roleLabel: "Finance broker",
    name: "Julie Judge",
    monogram: "JJ",
    portrait: "/partners/julie-judge/portrait.jpg",
    logoFloat: "/partners/julie-judge/logo-float-v2.png",
    suburb: "Sydney",
    state: "NSW",
    tagline:
      "A Sydney finance broker at her best with the applications others find hard, structuring lending for self-employed clients and business owners, including those running construction and engineering firms.",
    disciplines: ["Self-employed lending", "Business and commercial", "Complex income structures"],
    google: { rating: 5.0, reviews: 46 },
    institution: {
      name: "Mortgage Pass",
      role: "Founder and finance broker",
      note: "MFAA member",
      logo: "/partners/julie-judge/mortgage-pass.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "46 reviews" },
      {
        label: "In finance broking",
        value: "5+ yrs",
        sub: "founder of Mortgage Pass",
      },
      { label: "Lenders on the panel", value: "35+" },
    ],
    why:
      "Julie came to broking after years in business, working alongside self-employed owners across many industries, and it shapes the work she takes on. Where many brokers prefer a straightforward salaried application, she is at her best with the ones that are not: project based income, layered business structures, the tradies and the construction and engineering operators whose financials never fit a template.\n\nShe knows what a lender needs to see, and how to position a business’s real strength so it is recognised. Her clients return the trust, with a five star rating across more than forty reviews, and for an owner financing a build, many of whom are self-employed, she is the broker we want beside them.",
    aboutLabel: "About Julie",
    about:
      "Julie Judge is the founder of Mortgage Pass, a Sydney brokerage that spans both mortgage and business finance, working from offices in the Sydney CBD and Merrylands. On the residential side she helps clients buy a first home, purchase an investment property or refinance to ease cash flow; on the business side she arranges commercial and industrial property lending, cash flow funding and asset finance. She works across a panel of more than thirty five lenders, holds a Diploma of Finance and Mortgage Broking Management, and is a member of the Mortgage and Finance Association of Australia, operating as a credit representative under Australian Credit Licence 387025. Clients tend to describe the same things: plain English, a calm and personal process, and approvals secured where other brokers could not.",
    facts: {
      basedIn: "Sydney, NSW",
      serves: "Sydney and across Australia",
      focus: "Home, business and commercial lending",
    },
    website: "https://mortgagepass.com.au/finance-broker-julie-judge/",
    instagram: "https://www.instagram.com/mortgage_pass/",
    linkedin: "https://www.linkedin.com/in/julie-judge-2b6274b7/",
    servicesLabel: "Where Julie helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "Self-employed and business owner lending",
      "Home purchase, investment and refinance",
      "Commercial, industrial and retail property",
      "Business cash flow and asset finance",
    ],
    joined: "2026",
  },
  {
    slug: "luke-brodie",
    kind: "finance",
    roleLabel: "Mortgage broker",
    name: "Luke Brodie",
    monogram: "LB",
    portrait: "/partners/luke-brodie/portrait.jpg",
    logoFloat: "/partners/luke-brodie/logo-float-v2.png",
    suburb: "Sutherland Shire",
    state: "NSW",
    tagline:
      "A boutique broker from Sydney’s Sutherland Shire who takes complex lending scenarios in his stride, specialising in construction and development finance, trust and self-employed lending.",
    disciplines: ["Construction and development", "Trust and SMSF", "Self-employed"],
    google: { rating: 5.0, reviews: 6 },
    institution: {
      name: "BetterLend",
      role: "Founder and mortgage broker",
      note: "Backed by Partnership Finance Group",
      logo: "/partners/luke-brodie/betterlend.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "6 reviews" },
      {
        label: "In mortgage broking",
        value: "5+ yrs",
        sub: "founder of BetterLend",
      },
      { label: "Lenders on the panel", value: "30+", sub: "100+ loan products" },
    ],
    why: "Luke has built a reputation for solving lending scenarios that require more than simply comparing interest rates. He has extensive experience working with self-employed clients and those purchasing through company and trust structures, tailoring lending solutions to suit more complex financial circumstances.\n\nEvery client deals directly with Luke from the initial strategy discussion through to settlement, with every stage of the lending process personally managed by him. This provides a consistent one-on-one experience built on clear communication, accountability and exceptional client outcomes.",
    aboutLabel: "About Luke",
    about:
      "Luke Brodie heads up BetterLend, a boutique mortgage brokerage from Sydney’s Sutherland Shire, providing tailored lending solutions across residential, construction and development finance, commercial lending and SMSF borrowing. Taking the time to understand each client’s goals, Luke focuses on delivering lending strategies that support both their immediate needs and long-term objectives.\n\nBacked by access to more than 30 lenders and specialist funding solutions through Partnership Finance Group, Luke is known for navigating complex lending scenarios with clear advice, careful structuring and a proactive approach. His focus is on delivering the right lending solution for each client while building long-term relationships that continue well beyond settlement.",
    facts: {
      basedIn: "Sutherland Shire, Sydney",
      serves: "Sydney and New South Wales",
      focus: "Construction, development and complex lending",
    },
    website: "https://betterlend.com.au/luke-brodie/",
    linkedin: "https://www.linkedin.com/in/luke-brodie/",
    servicesLabel: "Where Luke helps",
    services: [
      "Construction loans and progress payments",
      "Development finance",
      "Bridging loans",
      "Pre-approval before you go to tender",
      "Trust and company structures",
      "Self-employed and complex applications",
    ],
    joined: "2026",
  },
  {
    slug: "alex-burley",
    kind: "finance",
    roleLabel: "Mortgage adviser",
    name: "Alex Burley",
    monogram: "AB",
    portrait: "/partners/alex-burley/portrait.jpg",
    suburb: "Beacon Hill",
    state: "NSW",
    tagline:
      "A Northern Beaches adviser who came up through financial advice, sourcing home loans that fit the bigger picture and answer to you, not the banks.",
    disciplines: ["First home buyers", "Investment lending", "Refinancing"],
    google: { rating: 4.8, reviews: 6 },
    institution: {
      name: "Mortgage Choice",
      role: "Franchise owner and adviser",
      note: "One of Australia’s largest broker networks",
      logo: "/partners/alex-burley/mortgage-choice.png",
    },
    stats: [
      { label: "Google rating", value: "4.8", star: true, sub: "6 reviews" },
      {
        label: "In finance and banking",
        value: "14+ yrs",
        sub: "financial advice background",
      },
      { label: "Lenders on the panel", value: "35+" },
    ],
    why:
      "Alex spent years in financial advice before broking, much of it in advice remediation with Deloitte, NAB and OCG, reviewing where past advice had fallen short and putting it right.\n\nHe came away knowing what good advice looks like, and it shapes how he lends: start from what a client is really trying to achieve, then find a loan that fits the wider financial picture rather than tick a box on a single transaction. For an owner financing a build, where structure can matter as much as the rate, that planning minded instinct earns him a place in the network.",
    aboutLabel: "About Alex",
    about:
      "Alex Burley owns the Mortgage Choice franchise on Sydney’s Northern Beaches, based in Beacon Hill where he lives and works. A former financial adviser, he helps first home buyers, investors and homeowners navigate everything from refinancing and construction loans to more complex lending scenarios. Alex compares a panel of more than 35 lenders on each client’s behalf, taking the time to understand their goals before recommending the solution that’s the best fit for their circumstances. He believes great mortgage advice is built on trust, transparency and tailoring finance to each client’s goals, not just finding the lowest interest rate. For most residential home loans, Alex’s services come at no direct cost to the client, as the lender pays him a commission once the loan settles.",
    facts: {
      basedIn: "Beacon Hill, NSW",
      serves: "Sydney’s Northern Beaches",
      focus: "Home, investment and refinance lending",
    },
    website: "https://www.mortgagechoice.com.au/alex.burley/",
    instagram: "https://www.instagram.com/mortgagechoice_alexburley/",
    facebook: "https://www.facebook.com/MortgageChoiceAlexBurley/",
    linkedin: "https://www.linkedin.com/in/alex-burley-a1632022/",
    servicesLabel: "Where Alex helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "First home buyers",
      "Investment property finance",
      "Renovation finance and equity release",
      "Lending that fits your bigger financial picture",
    ],
    joined: "2026",
  },
  {
    slug: "nathan-newlan",
    kind: "finance",
    roleLabel: "Mortgage broker",
    name: "Nathan Newlan",
    monogram: "NN",
    portrait: "/partners/nathan-newlan/portrait.jpg",
    suburb: "Bendigo",
    state: "VIC",
    tagline:
      "An award winning Bendigo broker who owns his Mortgage Choice business, as invested in the local community as he is in getting clients across the country the right result.",
    disciplines: ["First home buyers", "Investment lending", "Refinancing"],
    google: { rating: 5, reviews: 86 },
    institution: {
      name: "Mortgage Choice - Nathan Newlan",
      role: "Owner and director",
      note: "One of Australia’s largest broker networks",
      logo: "/partners/nathan-newlan/mortgage-choice.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "86 reviews" },
      { label: "In finance and banking", value: "10+ yrs", sub: "began in Bendigo banking" },
      { label: "Lenders on the panel", value: "35+" },
    ],
    awards: [
      { label: "Editor’s Choice Award, winner", sub: "The Adviser Better Business Awards · VIC/TAS 2026" },
      { label: "Best New Broker, winner", sub: "The Adviser Better Business Awards · VIC/TAS 2024" },
      { label: "Best Regional Broker, finalist", sub: "The Adviser · VIC/TAS 2025 and 2026" },
    ],
    why:
      "Nathan is Bendigo through and through, and the recognition has come quickly. Within a few years of going out on his own he was named Best New Broker for Victoria and Tasmania, and in 2026 he took the Editor’s Choice award at the Better Business Awards, with regional broker finalist places at both The Adviser and the MFAA alongside.\n\nBeneath the trophies is a genuinely local practice: more than eighty five five star reviews from a community he is part of, on the field with North Bendigo Football Club and at Barkers Creek Cricket Club as much as across a desk. For an owner financing a build, in the region or anywhere in the country, a broker this trusted and this close to his clients is one we stand behind.",
    aboutLabel: "About Nathan",
    about:
      "Nathan Newlan is the owner and director of the Mortgage Choice franchise in Bendigo. He came to broking after around a decade in finance and banking, starting out at a major bank’s Bendigo branch before moving into broking in 2021 and opening his own Mortgage Choice business in 2025. He works with clients across Bendigo and Australia wide, drawing on a panel of more than thirty five lenders to compare options. For most residential home loans his service comes at no direct cost to the client, as the lender pays him a commission once the loan settles. First home buyers, investors and those refinancing all sit within his work, handled with the patient, straightforward support he has built his name on.",
    facts: {
      basedIn: "Bendigo, VIC",
      serves: "Bendigo and Australia wide",
      focus: "Home, investment and refinance lending",
    },
    website: "https://www.mortgagechoice.com.au/n.newlan/",
    instagram: "https://www.instagram.com/nathan.newlan_mortgagechoice/",
    linkedin: "https://au.linkedin.com/in/nathan-newlan-546340143",
    servicesLabel: "Where Nathan helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "First home buyers",
      "Investment property finance",
      "Refinancing to a better deal",
      "Local knowledge, with lending Australia wide",
    ],
    joined: "2026",
  },
  {
    slug: "bianca-dacic",
    kind: "finance",
    roleLabel: "Finance broker",
    name: "Bianca Dacic",
    monogram: "BD",
    portrait: "/partners/bianca-dacic/portrait.jpg",
    suburb: "Niddrie",
    state: "VIC",
    tagline:
      "A Niddrie broker known for getting first home buyers into a place of their own, even with little or no deposit, and for the calm guidance that gets them there.",
    disciplines: ["Low deposit home loans", "First home buyers", "Commercial and asset finance"],
    google: { rating: 5, reviews: 93 },
    institution: {
      name: "Loan Savvy",
      role: "Founder and director",
      note: "Boutique Melbourne brokerage",
      logo: "/partners/bianca-dacic/loan-savvy.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "93 reviews" },
      { label: "Loan Savvy since", value: "2018", sub: "her own brokerage" },
      { label: "In the industry", value: "10+ yrs", sub: "software to broking" },
    ],
    why:
      "Bianca has quietly become one of the more trusted brokers in Melbourne’s north west, and the proof is in the people who keep coming back: more than ninety reviews, every one of them five star. What they single out is that she gets them in.\n\nShe is a genuine specialist in buying with little or no deposit, guiding first home buyers through the part of lending most find daunting, with a patience that makes a stressful process manageable. For an owner financing a build, especially one working hard to pull a deposit together, a broker this good at the hard part of getting finance approved is exactly who we want beside them.",
    aboutLabel: "About Bianca",
    about:
      "Bianca Dacic is the founder and director of Loan Savvy, a Niddrie based brokerage she started in 2018. She came to broking from the industry’s other side, having spent years in mortgage software and broker training with firms such as Rubik and Temenos before advising clients directly. Loan Savvy works across home, commercial, and car and asset lending, and adds the practical coaching many brokers leave out, from reading bank statements and credit reports to helping clients set and reach a savings goal on the way to a purchase. Bianca is a credit representative (510930) of Mortgage Specialists Pty Ltd under Australian Credit Licence 387025, and she frames the work the way her clients do: a long term partnership rather than a single transaction.",
    facts: {
      basedIn: "Niddrie, VIC",
      serves: "Melbourne",
      focus: "Home, commercial and asset lending",
    },
    website: "https://www.loan-savvy.com.au/",
    instagram: "https://www.instagram.com/loan_savvy/",
    facebook: "https://www.facebook.com/loansavvyy/",
    linkedin: "https://au.linkedin.com/in/bianca-dacic-802ab279",
    servicesLabel: "Where Bianca helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "Buying with little or no deposit",
      "First home buyers",
      "Commercial, car and asset finance",
      "Refinancing, plus credit and savings coaching",
    ],
    joined: "2026",
  },
  {
    slug: "matthew-hayes",
    kind: "finance",
    roleLabel: "Mortgage broker",
    name: "Matthew Hayes",
    monogram: "MH",
    portrait: "/partners/matthew-hayes/portrait.jpg",
    suburb: "Manuka",
    state: "ACT",
    tagline:
      "A born and raised Canberra broker with a thousand loans behind him, who structures finance around long term wealth rather than just the day’s interest rate.",
    disciplines: ["First home buyers", "Investment and wealth creation", "Refinancing"],
    google: { rating: 5, reviews: 125 },
    institution: {
      name: "Mortgage Choice - Matthew Hayes",
      role: "Owner and director",
      note: "One of Australia’s largest broker networks",
      logo: "/partners/matthew-hayes/mortgage-choice.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "125 reviews" },
      { label: "Loans signed", value: "1,000+", sub: "and counting" },
      { label: "In the industry", value: "10+ yrs", sub: "a lifelong Canberran" },
    ],
    why:
      "Matthew has been a Canberran his whole life, and has built one of the busier broking practices in the city on it: more than a thousand loans signed, over a hundred and twenty five five star reviews, and the local knowledge you only get from knowing the streets and suburbs first hand.\n\nWhat sets him apart is how he thinks. He looks past the day’s interest rate to structure finance around where a client is trying to get to, whether that is a first home or a third investment property, so the loan supports a long term plan, not one purchase. For an owner financing a build, in Canberra or well beyond it, a broker with that local depth and strategic sense is who we want alongside them.",
    aboutLabel: "About Matthew",
    about:
      "Matthew Hayes owns and operates Mortgage Choice Manuka, the Canberra practice he runs under his own Hayes Financial Group. Over more than ten years in finance, he and his team have worked with Canberra families and investors across first home buyers, refinancing, guarantor and low deposit lending, and investment finance. His approach starts with listening: understanding a client’s life and goals, not just their numbers, then drawing on a panel of more than sixty lenders to match the right solution. Based in Manuka, he serves clients across Canberra with a particular focus on his local community, and is equipped to help anywhere in Australia. Matthew is a credit representative (481447) of Mortgage Choice under Australian Credit Licence 382869.",
    facts: {
      basedIn: "Manuka, ACT",
      serves: "Canberra and Australia wide",
      focus: "Home, investment and wealth creation lending",
    },
    website: "https://hayesfinancialgroup.com.au/",
    instagram: "https://www.instagram.com/mhayes.mh/",
    facebook: "https://www.facebook.com/MatthewHayesFinance/",
    linkedin: "https://www.linkedin.com/in/matthew-hayes-a927808b/",
    servicesLabel: "Where Matthew helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "First home buyers",
      "Guarantor and low deposit loans",
      "Investment and portfolio finance",
      "Refinancing and loan structuring",
    ],
    joined: "2026",
  },
  {
    slug: "tristina-haines",
    kind: "finance",
    roleLabel: "Mortgage broker",
    name: "Tristina Haines",
    monogram: "TH",
    portrait: "/partners/tristina-haines/portrait.jpg",
    institution: {
      name: "More Than Mortgages",
      role: "Mortgage broker",
      note: "Credit representative 538497 under Australian Credit Licence 387025",
      logo: "/partners/tristina-haines/more-than-mortgages.png",
    },
    suburb: "Deakin",
    state: "ACT",
    tagline:
      "With 15 years in finance and a decade inside banking, Tristina knows how to structure and present a loan application to give it the strongest possible chance.",
    disciplines: ["Construction loans", "First home buyers", "Complex and self-employed"],
    google: { rating: 5, reviews: 231 },
    why: "Tristina is the kind of broker people want beside them when their situation is not straightforward. Her years at Bendigo Bank were not only spent lending: she coached and accredited the managers and lenders coming through, so she has taught other people how a lending decision gets made. That is an unusual vantage point for a broker to work from.\n\nIt shows most in the awkward cases: self-employed income, construction lending, a property decision made in the middle of a separation. She explains the process clearly, handles difficult conversations with discretion and looks for a practical way forward rather than listing the obstacles. The practice behind her was founded by Deanna Ezzy, one of the most decorated brokers in the ACT, who now mentors its brokers rather than writing loans herself.",
    about:
      "Tristina Haines is a mortgage broker with More Than Mortgages in Deakin, three years with the practice. She started out as a bank teller and loans officer before moving into lending, and holds a Diploma in Finance and Broking. An experienced client partner and processing team work alongside her, carrying each application from preparation through to settlement.",
    aboutLabel: "About Tristina",
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "231 reviews, More Than Mortgages" },
      { label: "In finance", value: "15 yrs", sub: "five of them broking" },
      { label: "On your file", value: "3", sub: "broker, partner, processor" },
    ],
    awards: [
      {
        label: "Top 20 High Achiever, ACT and New South Wales",
        sub: "Specialist Finance Group · 2026",
      },
      {
        label: "ACT Broker of the Year",
        sub: "finalist · Specialist Finance Group, 2024 and 2025",
      },
      {
        label: "Regional Broker of the Year",
        sub: "finalist · Australian Broking Awards 2025",
      },
    ],
    awardsMore: [
      "Innovator of the Year, Metro Broker · finalist, Broker Innovation Awards 2026",
      "Innovator of the Year, Regional Broker · finalist, Broker Innovation Awards 2025",
      "ACT Brokerage of the Year · winner, Specialist Finance Group 2024 and 2025, as More Than Mortgages",
    ],
    accolade: {
      label: "Deanna Ezzy, founder and mentor",
      sub: "ACT Mortgage Broker of the Year 2023 · six years the ACT’s number one female broker · eight years in MPA’s national Top 100",
      tag: "The practice",
    },
    facts: {
      experience: "15 years in finance",
      basedIn: "Deakin, ACT",
      serves: "Canberra and beyond",
      focus: "Home, investment and construction lending",
    },
    website: "https://www.morethanmortgages.com.au/team/tristina-haines/",
    instagram: "https://www.instagram.com/morethanmortgages/",
    facebook: "https://www.facebook.com/morethanmortgagesaustralia",
    linkedin: "https://www.linkedin.com/in/tristina-haines/",
    servicesLabel: "Where Tristina helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "First home buyers",
      "Investment and portfolio finance",
      "Self-employed and complex income",
      "Refinancing and SMSF lending",
    ],
    joined: "2026",
  },
  {
    slug: "william-kiln",
    kind: "finance",
    roleLabel: "Finance broker",
    name: "William Kiln",
    monogram: "WK",
    portrait: "/partners/william-kiln/portrait.jpg",
    suburb: "Lower North Shore",
    state: "NSW",
    tagline:
      "A broker who spent fifteen years building and pricing the major banks’ own mortgage products, now using that inside knowledge to structure lending on the client’s side.",
    disciplines: ["Loan structuring", "Investment lending", "Commercial and development"],
    google: { rating: 5.0, reviews: 10 },
    institution: {
      name: "Cumulus Capital",
      role: "Managing director",
      note: "MFAA and AFCA member",
      logo: "/partners/william-kiln/cumulus-capital.png",
    },
    stats: [
      { label: "Google rating", value: "5.0", star: true, sub: "10 reviews" },
      {
        label: "In banking and finance",
        value: "15+ yrs",
        sub: "product and pricing side",
      },
      { label: "Lenders on the panel", value: "40+" },
    ],
    why:
      "Will spent more than fifteen years on the inside of Australian lending, in product and pricing roles at Commonwealth Bank, Westpac and Macquarie, and as Head of Mortgages at ING, where the job was to build the lending products and set the pricing that brokers and borrowers later work with. He went on to co-found a lending fintech before opening his own brokerage.\n\nFew brokers understand as precisely how a lender weighs risk, structures credit and arrives at a yes, because he helped design those systems from the inside. On a development or construction facility, where far more sits at the credit officer’s discretion, that reading is worth more still. Whether it is an owner financing a build or a developer funding a site, how the deal is structured often decides what gets approved, and having sat on the bank’s side of the table is a genuine advantage.",
    aboutLabel: "About Will",
    about:
      "William Kiln is the managing director of Cumulus Capital, a finance brokerage on Sydney’s Lower North Shore that he built around a straightforward idea: that lending should be clear, well structured and made to hold up over time, rather than rushed toward whatever product is quickest to place. The practice runs on two sides. Its mortgage broking works with homeowners, property investors and business owners, from a first purchase through to refinancing and portfolio lending, across a bank-agnostic panel of more than forty lenders; Will weighs the trade-offs as carefully as arranging the loan, reviews each client’s position every six months so the structure still fits as circumstances change, and, as an MFAA approved broker paid by the lender on settlement, offers that advice at no cost to the client. Its other side is debt structuring for builders and developers, on the two facilities that shape a project, the land and the build: funding pre-DA and DA-approved sites and testing their feasibility, then arranging construction debt across senior, stretch-senior and mezzanine positions, with presale cover and QS-certified drawdowns set up to carry a project through to completion rather than refinance it mid-build. Having set credit policy and pricing on the lender’s side, Will knows where a deal will be tested before it gets there. Commercial and development finance may involve a fee, agreed upfront; Cumulus holds credit authorisation under Australian Credit Licence 389328.",
    facts: {
      basedIn: "Lower North Shore, Sydney",
      serves: "Sydney and nationwide",
      focus: "Home, investment and commercial lending",
    },
    website: "https://www.cumuluscapital.com.au/",
    linkedin: "https://www.linkedin.com/in/willkiln/",
    servicesLabel: "Where Will helps",
    services: [
      "Construction loans and progress payments",
      "Pre-approval before you go to tender",
      "Home loans, first purchase to refinance",
      "Investment and portfolio lending",
      "Development site and construction debt",
      "Senior, stretch-senior and mezzanine facilities",
    ],
    joined: "2026",
  },
];

// Public listings exclude drafts (partners still under review).
export const ARCHITECT_PARTNERS = PARTNERS.filter(
  (p) => p.kind === "architect" && !p.draft,
);
export const BUILDER_PARTNERS = PARTNERS.filter(
  (p) => p.kind === "builder" && !p.draft,
);
export const FINANCE_PARTNERS = PARTNERS.filter(
  (p) => p.kind === "finance" && !p.draft,
);
export const CONVEYANCER_PARTNERS = PARTNERS.filter(
  (p) => p.kind === "conveyancer" && !p.draft,
);

/** Every state a partner practises in — `states` when set, else `[state]`. */
export function partnerStates(p: Partner): string[] {
  return p.states ?? [p.state];
}

export function getPartner(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug);
}

/**
 * The partner whose curated page should stand in for an in-app builder
 * profile, looked up by the builder_profiles.slug the app links to.
 *
 * `draft` is deliberately NOT consulted. The two flags govern different
 * doors: `draft` decides whether a partner is listed in, and reachable
 * through, the Preferred Partner directory; `builderProfileSlug`
 * decides whether their curated page is also their own public profile.
 * A builder can be the second without being the first, which is what
 * happens while we are still courting them — the page is theirs and
 * better than the register could assemble, but the network they are
 * not yet part of does not advertise them.
 *
 * The caller is responsible for the consequences of a draft: no
 * directory links out, and no structured data claiming a /partners URL
 * that would 404. See the /b/[slug] route.
 */
export function getPartnerForBuilderSlug(
  builderProfileSlug: string,
): Partner | undefined {
  return PARTNERS.find((p) => p.builderProfileSlug === builderProfileSlug);
}

/**
 * Types for the header "Our Partners" dropdown.
 *
 * The menu lists DISCIPLINES, never individual partners: a nav is
 * wayfinding, and the register (with its state map and filters) is the
 * place to find a person. That also keeps the panel a fixed size as the
 * network grows, and keeps inclusion out of the menu as a status
 * signal. Counts are the proof; names are one click away.
 *
 * Computed on the server (pages pass the result down as a prop) so the
 * client bundle never carries the register content.
 */
export type PartnerNavType = {
  /** Plural discipline name, e.g. "Design partners". */
  label: string;
  /** One line on who they are. */
  sub: string;
  /** Live partners in this discipline. */
  count: number;
  href: string;
};

export function partnerNavTypes(): PartnerNavType[] {
  return [
    {
      label: "Design partners",
      sub: "Architects and building designers",
      count: ARCHITECT_PARTNERS.length,
      href: "/partners/architects",
    },
    {
      label: "Builder partners",
      sub: "Builders whose work we know first hand",
      count: BUILDER_PARTNERS.length,
      href: "/partners/builders",
    },
    {
      label: "Finance partners",
      sub: "Brokers who know construction lending",
      count: FINANCE_PARTNERS.length,
      href: "/partners/finance-brokers",
    },
    {
      label: "Conveyancing partners",
      sub: "Conveyancers who read the title before you commit",
      count: CONVEYANCER_PARTNERS.length,
      href: "/partners/conveyancers",
    },
    // Engineers, lawyers and consultants join here as the register
    // widens. Empty disciplines are filtered out below, so a type can
    // be added before its first partner goes live.
  ].filter((t) => t.count > 0);
}

export type PartnerLogo = {
  slug: string;
  /** Accessible name — the practice, or the broker's firm. */
  name: string;
  src: string;
  /** Pre-normalised floating mark (logoFloat) — render as-is. */
  norm: boolean;
  /** Fallback only: light-on-dark source mark, invert before floating. */
  dark: boolean;
  /** Optional per-mark size multiplier for optical balance in the
   *  marquee (1 = standard row height). */
  scale?: number;
};

/**
 * The homepage trust strip is HAND-CURATED (2026-07-21 decision): a
 * partner going live does NOT add their mark to the marquee any more.
 * Curate deliberately — one mark per brand, the array order is the
 * display order, `scale` balances optical weight. Slugs still link to
 * each partner's public profile. Full-colour lockups prepared for the
 * marquee live in /public/marquee; single-ink floats stay in each
 * partner's asset dir. This list affects ONLY the homepage marquee —
 * partner profiles render their own logos independently.
 */
export const MARQUEE_LOGOS: PartnerLogo[] = [
  {
    slug: "house-design-solutions",
    name: "House Design Solutions",
    src: "/partners/house-design-solutions/logo-float-v2.png",
    norm: true,
    dark: false,
  },
  {
    slug: "luke-brodie",
    name: "BetterLend",
    src: "/marquee/betterlend.png",
    norm: true,
    dark: false,
  },
  {
    slug: "evoka-studio",
    name: "Evoka Studio",
    src: "/partners/evoka-studio/logo-float-v2.png",
    norm: true,
    dark: false,
  },
  {
    slug: "maninder-kaur",
    name: "Evergrow Finance",
    src: "/partners/maninder-kaur/logo-float-v2.png",
    norm: true,
    dark: false,
    scale: 1.15,
  },
  {
    slug: "metro-building-designers",
    name: "Metro Building Designers",
    src: "/partners/metro-building-designers/logo-float-v2.png",
    norm: true,
    dark: false,
  },
  {
    slug: "julie-judge",
    name: "Mortgage Pass",
    src: "/marquee/mortgage-pass.png",
    norm: true,
    dark: false,
  },
  {
    slug: "levan-design",
    name: "Levan Design",
    src: "/partners/levan-design/logo-float-v2.png",
    norm: true,
    dark: false,
  },
  {
    slug: "ed-akgun",
    name: "RateOne",
    src: "/partners/ed-akgun/logo-float-v2.png",
    norm: true,
    dark: false,
    scale: 1.15,
  },
  {
    slug: "dna-architects",
    name: "DNA Architects",
    src: "/marquee/dna-architects.png",
    norm: true,
    dark: false,
  },
  {
    slug: "de-lune-construction",
    name: "de Lune Construction",
    src: "/partners/de-lune-construction/logo-float-v2.png",
    norm: true,
    dark: false,
  },
  {
    slug: "summerhill-building-designers",
    name: "Summerhill Building Designers",
    src: "/partners/summerhill-building-designers/logo-float-v2.png",
    norm: true,
    dark: false,
  },
  {
    slug: "tim-murphy",
    name: "Mortgage Choice",
    src: "/partners/tim-murphy/logo-float-v4.png",
    norm: true,
    dark: false,
  },
  {
    slug: "silverpoint-design-and-planning",
    name: "SilverPoint Design and Planning",
    src: "/partners/silverpoint-design-and-planning/logo-float-v2.png",
    norm: true,
    dark: false,
  },
  {
    slug: "billy-chok",
    name: "Cloud Financial Group",
    src: "/partners/billy-chok/logo-float-v2.png",
    norm: true,
    dark: false,
  },
  {
    slug: "praeditos-designs",
    name: "Praeditos Designs",
    src: "/partners/praeditos-designs/logo-float-v2.png",
    norm: true,
    dark: false,
  },
  {
    slug: "dawes-design",
    name: "Dawes Design",
    src: "/partners/dawes-design/logo-float-v2.png",
    norm: true,
    dark: false,
  },
  {
    slug: "jason-pogorelec",
    name: "Inovayt",
    src: "/partners/jason-pogorelec/logo-float-v2.png",
    norm: true,
    dark: false,
  },
  {
    slug: "elite-building-design",
    name: "Elite Building Design",
    src: "/partners/elite-building-design/logo-float-v2.png",
    norm: true,
    dark: false,
  },
  {
    slug: "design-plus-drafting",
    name: "Design Plus Drafting",
    src: "/partners/design-plus-drafting/logo-float-v2.png",
    norm: true,
    dark: false,
  },
];

/** The curated homepage marquee set (see MARQUEE_LOGOS). Kept as a
 *  function so existing consumers stay untouched. */
export function livePartnerLogos(): PartnerLogo[] {
  return MARQUEE_LOGOS;
}
