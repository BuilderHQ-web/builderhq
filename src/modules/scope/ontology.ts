/**
 * scope · the Scope Standard, version 1.
 *
 * The fixed vocabulary of Australian residential construction as
 * BuilderHQ tenders it: 31 divisions in build-sequence order, ~250
 * canonical items. Authored against AU practice (NCC terminology,
 * NatSpec work-section language, HIA/MBA contract conventions for
 * PC and PS items) and reconciled 1:1 to the platform's 28-trade
 * cost catalogue.
 *
 * RULES OF THE LIBRARY
 *   - Ids are permanent. An item may be superseded, never renamed:
 *     citations, confirmations and allowances hang off the id.
 *   - Every item carries the homeowner layer (`plain`) — one honest
 *     sentence, no unexplained jargon, no em dashes.
 *   - `aliases` exist for extraction, not for display: the words AU
 *     drawings and specifications actually print.
 *   - Growth is versioned. Additions bump the minor version; any
 *     change to an existing item's meaning bumps the major and is a
 *     deliberate event.
 */

import type { ScopeAlternativeGroup, ScopeDivision, ScopeItem } from "./types";

/** Semantic version of the library. Projects pin the version they
 *  were prepared under. */
export const SCOPE_STANDARD_VERSION = "1.3.0";

// ── divisions — the build in reading order ──────────────────────────────

export const SCOPE_DIVISIONS: ScopeDivision[] = [
  {
    id: "preliminaries",
    label: "Preliminaries and site establishment",
    order: 1,
    plain:
      "Everything needed to run the site safely before and during the build: fencing, amenities, supervision, insurances and clean-up.",
  },
  {
    id: "approvals",
    label: "Approvals, certification and compliance",
    order: 2,
    plain:
      "The permits, inspections, reports and certificates the law requires before, during and after the build.",
  },
  {
    id: "demolition",
    label: "Demolition and strip-out",
    order: 3,
    plain:
      "Taking down or gutting existing structures and clearing what the new work replaces.",
  },
  {
    id: "alterations",
    label: "Structural alterations to the existing building",
    order: 4,
    plain:
      "Changes to the existing structure: new openings, removed walls, propping and tying new work into old.",
    appliesTo: ["renovation", "extension"],
  },
  {
    id: "earthworks",
    label: "Earthworks and excavation",
    order: 5,
    plain:
      "Shaping the ground: cutting, filling, digging for footings and services, and carting spoil away.",
  },
  {
    id: "site-services",
    label: "Site services and connections",
    order: 6,
    plain:
      "Connecting the home to the world: sewer, stormwater, water, power, gas and data.",
  },
  {
    id: "footings-slab",
    label: "Footings and ground floor structure",
    order: 7,
    plain:
      "The concrete and steel the whole building stands on, engineered for the soil it sits in.",
  },
  {
    id: "retaining",
    label: "Retaining walls and ground structures",
    order: 8,
    plain:
      "Walls that hold back earth where the site changes level, and the drainage that keeps them standing.",
  },
  {
    id: "steel",
    label: "Structural steel",
    order: 9,
    plain:
      "Steel beams, columns and lintels where timber alone cannot carry the load.",
  },
  {
    id: "framing",
    label: "Framing",
    order: 10,
    plain:
      "The skeleton of walls, floors and roof, in timber or steel, that every other trade builds on.",
  },
  {
    id: "roofing",
    label: "Roofing and roof plumbing",
    order: 11,
    plain:
      "The roof covering and everything that sheds water: sarking, gutters, downpipes and flashings.",
  },
  {
    id: "external-walls",
    label: "External walls and cladding",
    order: 12,
    plain:
      "The outside skin of the building: brick, cladding, render or block, and the details that keep weather out.",
  },
  {
    id: "windows",
    label: "Windows and external glazing",
    order: 13,
    plain:
      "The window and glazed door units in the external walls, and the glass specification that sets comfort and compliance.",
  },
  {
    id: "external-doors",
    label: "External doors",
    order: 14,
    plain:
      "The doors in and out of the home, including the garage door, and their locks and hardware.",
  },
  {
    id: "insulation",
    label: "Insulation and wraps",
    order: 15,
    plain:
      "The layers inside walls, ceilings and floors that keep heat, cold and noise where they belong.",
  },
  {
    id: "lining",
    label: "Internal linings and plaster",
    order: 16,
    plain:
      "The plasterboard walls and ceilings, cornices and bulkheads that turn a frame into rooms.",
  },
  {
    id: "internal-doors",
    label: "Internal doors",
    order: 17,
    plain:
      "The doors between rooms, their frames, and the handles and hinges on them.",
  },
  {
    id: "fixout",
    label: "Fix-out carpentry",
    order: 18,
    plain:
      "The finishing timberwork: skirting boards, architraves, shelving and trim.",
  },
  {
    id: "stairs",
    label: "Stairs and balustrades",
    order: 19,
    plain:
      "Staircases, handrails and the balustrades that make edges and voids safe.",
  },
  {
    id: "joinery",
    label: "Joinery and cabinetry",
    order: 20,
    plain:
      "The built-in cabinetry: kitchen, bathroom vanities, laundry, robes and any custom pieces.",
  },
  {
    id: "waterproofing",
    label: "Waterproofing",
    order: 21,
    plain:
      "The membranes under tiles and behind walls in wet areas and on balconies, and the certificate that proves them.",
  },
  {
    id: "tiling",
    label: "Tiling",
    order: 22,
    plain:
      "Floor and wall tiles in wet areas and beyond: the tiles themselves and the laying of them.",
  },
  {
    id: "flooring",
    label: "Floor coverings",
    order: 23,
    plain:
      "The finished floors you walk on: timber, laminate, carpet or polished concrete.",
  },
  {
    id: "painting",
    label: "Painting and coatings",
    order: 24,
    plain:
      "Preparation and paint, inside and out, and any special coatings.",
  },
  {
    id: "plumbing",
    label: "Plumbing and gas",
    order: 25,
    plain:
      "The pipes behind the walls and the fixtures on them: water, drainage, gas and hot water.",
  },
  {
    id: "electrical",
    label: "Electrical and data",
    order: 26,
    plain:
      "The wiring, switchboard, points and lights, plus data, TV and any solar or vehicle charging provision.",
  },
  {
    id: "hvac",
    label: "Heating, cooling and ventilation",
    order: 27,
    plain:
      "The systems that condition and move air: ducted or split systems, heaters and exhaust fans.",
  },
  {
    id: "fire-services",
    label: "Fire services",
    order: 28,
    plain:
      "The fire protection a multi-dwelling building must carry: sprinklers, hydrants, rated doors and detection.",
    appliesTo: ["multi_dwelling"],
  },
  {
    id: "appliances",
    label: "Appliances",
    order: 29,
    plain:
      "The kitchen and laundry machines built into the home, usually chosen by you and carried as prime cost items.",
  },
  {
    id: "external-works",
    label: "External works",
    order: 30,
    plain:
      "The built outdoor elements: driveway, paths, decks, pergolas, fences and gates.",
  },
  {
    id: "landscaping",
    label: "Landscaping and pool",
    order: 31,
    plain:
      "Gardens, turf, irrigation and swimming pools, usually carried as provisional sums until designed.",
  },
];

// ── the items ───────────────────────────────────────────────────────────
//
// Grouped by division in build order. Read top to bottom, this IS a
// scope of works for an Australian home.

export const SCOPE_ITEMS: ScopeItem[] = [
  // ── 1 · preliminaries ─────────────────────────────────────────────
  {
    id: "preliminaries.site-establishment",
    division: "preliminaries",
    label: "Site establishment and set-up",
    plain:
      "Setting up the site to work from: access, storage, and getting the block ready for trades.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["site setup", "establishment"],
  },
  {
    id: "preliminaries.temporary-fencing",
    division: "preliminaries",
    label: "Temporary fencing",
    plain:
      "Hire fencing around the site for the whole build, required by law to keep the public out.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["temp fence", "security fencing", "hoarding"],
  },
  {
    id: "preliminaries.site-amenities",
    division: "preliminaries",
    label: "Site amenities",
    plain:
      "A toilet and basic facilities for the people building your home, hired for the duration.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["site toilet", "portaloo", "site shed", "lunch shed"],
  },
  {
    id: "preliminaries.scaffolding",
    division: "preliminaries",
    label: "Scaffolding and edge protection",
    plain:
      "The working platforms and fall protection needed to build anything above one storey safely.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["scaffold", "perimeter scaffold", "handrail protection", "roof rail"],
  },
  {
    id: "preliminaries.waste-management",
    division: "preliminaries",
    label: "Waste bins and rubbish removal",
    plain:
      "Skip bins and tip fees for everything a build throws away, kept off your lawn and street.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["skip bins", "rubbish removal", "tip fees", "waste disposal"],
  },
  {
    id: "preliminaries.survey-setout",
    division: "preliminaries",
    label: "Survey and set-out",
    plain:
      "A licensed surveyor marking exactly where the building sits on the block before anything is dug.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["set out", "site survey", "identification survey", "peg out"],
  },
  {
    id: "preliminaries.temporary-services",
    division: "preliminaries",
    label: "Temporary power and water",
    plain:
      "Builder's power and water on site until the permanent connections are live.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["temp power", "builder's pole", "temporary supply"],
  },
  {
    id: "preliminaries.traffic-management",
    division: "preliminaries",
    label: "Traffic management",
    plain:
      "Managing footpath and road access for deliveries and concrete pours where council requires it.",
    trade: "preliminaries",
    tier: "commercial",
    appliesTo: ["multi_dwelling", "renovation", "extension"],
    aliases: ["traffic control", "road occupancy", "footpath permit"],
  },
  {
    id: "preliminaries.craneage",
    division: "preliminaries",
    label: "Crane and materials handling",
    plain:
      "Crane or pump hire for lifts the site cannot do by hand: trusses, steel, concrete to upper floors.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["crane hire", "concrete pump", "franna"],
  },
  {
    id: "preliminaries.protection-existing",
    division: "preliminaries",
    label: "Protection of existing structures and finishes",
    plain:
      "Covering and protecting the parts of your home and property that stay, while work happens around them.",
    trade: "preliminaries",
    tier: "commercial",
    appliesTo: ["renovation", "extension"],
    aliases: ["floor protection", "dust barriers", "protection works"],
  },
  {
    id: "preliminaries.dilapidation-report",
    division: "preliminaries",
    label: "Dilapidation reports",
    plain:
      "A photographic record of neighbouring properties before work starts, protecting everyone if cracks are claimed later.",
    trade: "preliminaries",
    tier: "commercial",
    appliesTo: ["multi_dwelling", "extension", "renovation"],
    aliases: ["dilap report", "condition report"],
  },
  {
    id: "preliminaries.supervision",
    division: "preliminaries",
    label: "Supervision and project management",
    plain:
      "The builder's supervisor running the job: trades, deliveries, inspections and the program.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["site supervision", "project management", "site management"],
  },
  {
    id: "preliminaries.insurances-warranty",
    division: "preliminaries",
    label: "Insurances and home warranty cover",
    plain:
      "The builder's construction insurance and the home warranty cover the law requires them to take out for you.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["hbcf", "domestic building insurance", "home warranty insurance", "contract works insurance"],
  },
  {
    id: "preliminaries.final-clean",
    division: "preliminaries",
    label: "Builder's cleans and final clean",
    plain:
      "Progressive site clean-ups and the professional clean that hands the home over ready to live in.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["final clean", "builders clean", "handover clean"],
  },

  // ── 2 · approvals and compliance ──────────────────────────────────
  {
    id: "approvals.building-permit",
    division: "approvals",
    label: "Building permit and certifier fees",
    plain:
      "The legal permission to build, issued by a surveyor or certifier who also inspects the work in stages.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["building approval", "construction certificate", "cc", "private certifier", "building surveyor"],
  },
  {
    id: "approvals.engineering-design",
    division: "approvals",
    label: "Structural engineering design and certification",
    plain:
      "The engineer's drawings and sign-off for footings, steel and anything structural.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["structural engineer", "engineering certification", "form 15", "form 16", "compliance certificate"],
  },
  {
    id: "approvals.energy-report",
    division: "approvals",
    label: "Energy efficiency assessment",
    plain:
      "The report proving the design meets the required energy star rating, which drives glazing and insulation choices.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["nathers", "basix", "section j", "energy rating", "6 star", "7 star"],
  },
  {
    id: "approvals.soil-geotech",
    division: "approvals",
    label: "Soil report and geotechnical investigation",
    plain:
      "Testing what the ground is made of, because the soil classification decides how strong the footings must be.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["soil test", "geotechnical report", "site classification", "bore log"],
  },
  {
    id: "approvals.mandatory-inspections",
    division: "approvals",
    label: "Mandatory stage inspections",
    plain:
      "The required inspections at key stages, from footings to frame to final, before work may continue.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["stage inspections", "frame inspection", "final inspection", "waterproofing inspection"],
  },
  {
    id: "approvals.occupancy-certificate",
    division: "approvals",
    label: "Occupancy certificate",
    plain:
      "The certificate at the end that says the home is legal to live in.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["oc", "occupation certificate", "certificate of occupancy", "form 21"],
  },
  {
    id: "approvals.bushfire-compliance",
    division: "approvals",
    label: "Bushfire (BAL) compliance measures",
    plain:
      "The extra construction requirements when a site carries a bushfire attack level rating, from sealed eaves to special glazing.",
    trade: "preliminaries",
    tier: "conditional",
    aliases: ["bal", "bal-12.5", "bal-19", "bal-29", "bal-40", "bal-fz", "bushfire attack level"],
  },
  {
    id: "approvals.acoustic-report",
    division: "approvals",
    label: "Acoustic compliance",
    plain:
      "Sound testing and design where units share walls and floors, or where a busy road requires it.",
    trade: "preliminaries",
    tier: "conditional",
    appliesTo: ["multi_dwelling"],
    aliases: ["acoustic report", "sound insulation", "acoustic certification"],
  },
  {
    id: "approvals.authority-consents",
    division: "approvals",
    label: "Authority consents and easements",
    plain:
      "Permissions the build needs beyond the main permits: building over an easement, the legal point of discharge, crossover and road permits, asset protection.",
    trade: "preliminaries",
    tier: "conditional",
    aliases: [
      "build over easement",
      "building over easement",
      "legal point of discharge",
      "lpod",
      "section 173",
      "road opening permit",
      "asset protection permit",
      "crossover permit",
      "report and consent",
      "regulation 130",
    ],
  },
  {
    id: "approvals.protection-works",
    division: "approvals",
    label: "Protection works for adjoining properties",
    plain:
      "The statutory process and physical measures that protect the neighbours' land and buildings when work happens near a boundary, including notices, agreements and condition surveys.",
    trade: "preliminaries",
    tier: "conditional",
    aliases: [
      "protection work notice",
      "form 7",
      "form 8",
      "adjoining owner",
      "dilapidation survey",
      "condition survey",
      "party wall",
    ],
  },

  // ── 3 · demolition ────────────────────────────────────────────────
  {
    id: "demolition.full-demolition",
    division: "demolition",
    label: "Full demolition of existing structures",
    plain:
      "Taking the existing building down entirely and clearing the block, including the demolition permit.",
    trade: "demolition",
    tier: "conditional",
    aliases: ["demolish existing dwelling", "knock down", "kdr", "remove existing dwelling"],
  },
  {
    id: "demolition.partial-strip-out",
    division: "demolition",
    label: "Partial demolition and internal strip-out",
    plain:
      "Gutting the rooms being renovated: linings, kitchens, bathrooms and finishes out, structure kept.",
    trade: "demolition",
    tier: "core",
    appliesTo: ["renovation", "extension"],
    aliases: ["strip out", "soft strip", "gut", "remove existing finishes"],
  },
  {
    id: "demolition.asbestos-removal",
    division: "demolition",
    label: "Asbestos and hazardous materials",
    plain:
      "A hazardous-materials survey of anything being demolished, then licensed removal and disposal of asbestos or other hazards, priced as an allowance until the extent is proven.",
    trade: "demolition",
    tier: "conditional",
    allowance: "ps",
    aliases: [
      "asbestos",
      "acm removal",
      "friable",
      "fibro removal",
      "clearance certificate",
      "hazardous materials survey",
      "hazmat",
      "division 5 audit",
    ],
  },
  {
    id: "demolition.tree-removal",
    division: "demolition",
    label: "Tree and vegetation removal",
    plain:
      "Removing trees and vegetation in the way of the build, including stumps and any council permits.",
    trade: "demolition",
    tier: "conditional",
    aliases: ["tree lopping", "stump grinding", "vegetation clearing", "arborist"],
  },
  {
    id: "demolition.service-disconnections",
    division: "demolition",
    label: "Service disconnections and abolishment",
    plain:
      "Safely cutting off power, gas, water and sewer to the old structure before demolition.",
    trade: "demolition",
    tier: "conditional",
    aliases: ["disconnection", "abolishment", "meter removal"],
  },
  {
    id: "demolition.salvage",
    division: "demolition",
    label: "Salvage and set-aside of nominated materials",
    plain:
      "Carefully saving nominated items, such as period doors or bricks, for reuse in the new work.",
    trade: "demolition",
    tier: "conditional",
    appliesTo: ["renovation", "extension"],
    aliases: ["salvage", "retain for reuse", "carefully remove"],
  },
  {
    id: "demolition.make-good",
    division: "demolition",
    label: "Make good to retained structure",
    plain:
      "Patching and squaring up the existing building where demolition leaves scars the new work does not cover.",
    trade: "demolition",
    tier: "core",
    appliesTo: ["renovation", "extension"],
    aliases: ["make good", "patch and repair"],
  },

  // ── 4 · structural alterations ────────────────────────────────────
  {
    id: "alterations.new-openings",
    division: "alterations",
    label: "New openings in existing walls",
    plain:
      "Cutting new doorways or windows into existing walls, with the lintels and support that keeps everything above them up.",
    trade: "carpentry",
    tier: "core",
    appliesTo: ["renovation", "extension"],
    aliases: ["new opening", "enlarge opening", "cut new doorway"],
  },
  {
    id: "alterations.wall-removal",
    division: "alterations",
    label: "Removal of load-bearing walls",
    plain:
      "Taking out structural walls and replacing their job with engineered beams, opening rooms into each other.",
    trade: "carpentry",
    tier: "conditional",
    appliesTo: ["renovation", "extension"],
    aliases: ["remove load bearing wall", "install beam over", "open plan conversion"],
  },
  {
    id: "alterations.propping",
    division: "alterations",
    label: "Temporary propping and needling",
    plain:
      "Holding the building up temporarily while its permanent support is changed underneath.",
    trade: "carpentry",
    tier: "conditional",
    appliesTo: ["renovation", "extension"],
    aliases: ["acrow props", "needle and prop", "temporary support"],
  },
  {
    id: "alterations.underpinning",
    division: "alterations",
    label: "Underpinning of existing footings",
    plain:
      "Strengthening the existing footings where they are failing or where new work loads them, priced as an allowance until exposed.",
    trade: "concrete_work",
    tier: "conditional",
    appliesTo: ["renovation", "extension"],
    allowance: "ps",
    aliases: ["underpin", "mass concrete underpinning", "grout injection"],
  },
  {
    id: "alterations.roof-tie-in",
    division: "alterations",
    label: "Roof tie-in to existing",
    plain:
      "Joining the new roof into the old one so the junction is structurally sound and watertight.",
    trade: "carpentry",
    tier: "core",
    appliesTo: ["extension"],
    aliases: ["roof junction", "tie in to existing roof", "match existing roofline"],
  },
  {
    id: "alterations.floor-level-adjustment",
    division: "alterations",
    label: "Floor level adjustments and infill",
    plain:
      "Making new floors meet old ones at the same level, so the finished home has no surprise steps.",
    trade: "carpentry",
    tier: "conditional",
    appliesTo: ["renovation", "extension"],
    aliases: ["match existing floor level", "floor infill", "pack and level"],
  },

  // ── 5 · earthworks ────────────────────────────────────────────────
  {
    id: "earthworks.site-strip",
    division: "earthworks",
    label: "Site strip and topsoil removal",
    plain:
      "Scraping the topsoil and vegetation off the building area down to solid ground.",
    trade: "ground_works",
    tier: "core",
    aliases: ["strip topsoil", "clear and grub", "site scrape"],
  },
  {
    id: "earthworks.bulk-excavation",
    division: "earthworks",
    label: "Bulk excavation, cut and fill",
    plain:
      "The big earthmoving that levels a sloping block into the platforms the home sits on.",
    trade: "ground_works",
    tier: "conditional",
    aliases: ["cut and fill", "bulk earthworks", "benching", "building platform"],
  },
  {
    id: "earthworks.detailed-excavation",
    division: "earthworks",
    label: "Detailed excavation for footings and services",
    plain:
      "The precise trenches and pier holes dug for footings, slabs edges and underground pipes.",
    trade: "ground_works",
    tier: "core",
    aliases: ["trenching", "footing excavation", "pier holes"],
  },
  {
    id: "earthworks.rock-excavation",
    division: "earthworks",
    label: "Rock excavation",
    plain:
      "Breaking through rock if the dig finds it, priced as an allowance because nobody knows how much is down there until digging starts.",
    trade: "ground_works",
    tier: "conditional",
    allowance: "ps",
    aliases: ["rock breaking", "hydraulic hammer", "rock allowance", "floater removal"],
  },
  {
    id: "earthworks.spoil-removal",
    division: "earthworks",
    label: "Spoil removal from site",
    plain:
      "Trucking away the soil the dig produces, priced by the load and the tip that accepts it.",
    trade: "ground_works",
    tier: "core",
    aliases: ["cart away", "spoil off site", "soil removal", "export material"],
  },
  {
    id: "earthworks.imported-fill",
    division: "earthworks",
    label: "Imported and compacted fill",
    plain:
      "Bringing in clean fill and compacting it in layers where the design needs the ground built up.",
    trade: "ground_works",
    tier: "conditional",
    aliases: ["controlled fill", "compacted fill", "select fill", "roadbase"],
  },
  {
    id: "earthworks.dewatering",
    division: "earthworks",
    label: "Dewatering and groundwater control",
    plain:
      "Pumping water out of excavations where the water table interferes, priced as an allowance if conditions are unknown.",
    trade: "ground_works",
    tier: "conditional",
    appliesTo: ["multi_dwelling", "single_dwelling"],
    allowance: "ps",
    aliases: ["dewatering", "spear pumps", "groundwater"],
  },
  {
    id: "earthworks.erosion-control",
    division: "earthworks",
    label: "Erosion and sediment control",
    plain:
      "The silt fences and drains that keep soil on the site and out of the street and stormwater, required by council.",
    trade: "ground_works",
    tier: "core",
    aliases: ["silt fence", "sediment control", "stabilised access"],
  },

  // ── 6 · site services ─────────────────────────────────────────────
  {
    id: "site-services.sewer-connection",
    division: "site-services",
    label: "Sewer drainage and connection",
    plain:
      "The underground sewer pipes from the home to the authority connection point.",
    trade: "hydraulic_services",
    tier: "alternative",
    aliases: ["sewer tie", "sanitary drainage", "sewer junction", "boundary trap"],
  },
  {
    id: "site-services.stormwater",
    division: "site-services",
    label: "Stormwater drainage and connection",
    plain:
      "The pipes and pits that take roof and surface water to the street or the legal discharge point.",
    trade: "hydraulic_services",
    tier: "core",
    aliases: ["stormwater drainage", "kerb adaptor", "rubble pit", "silt pit"],
  },
  {
    id: "site-services.onsite-detention",
    division: "site-services",
    label: "On-site stormwater detention",
    plain:
      "A tank or basin that slows stormwater before it leaves the block, required by many councils.",
    trade: "hydraulic_services",
    tier: "conditional",
    appliesTo: ["multi_dwelling", "single_dwelling", "extension"],
    aliases: ["osd", "detention tank", "retention system"],
  },
  {
    id: "site-services.water-connection",
    division: "site-services",
    label: "Water supply and meter connection",
    plain:
      "The cold water line from the meter into the home, and the meter itself where a new one is needed.",
    trade: "hydraulic_services",
    tier: "core",
    aliases: ["water service", "water meter", "mains connection"],
  },
  {
    id: "site-services.power-connection",
    division: "site-services",
    label: "Electrical mains and consumer connection",
    plain:
      "Bringing power from the street to your switchboard, overhead or underground, including the authority's fees.",
    trade: "electrical_services",
    tier: "core",
    aliases: ["consumer mains", "underground power", "pit and pipe", "point of attachment"],
  },
  {
    id: "site-services.nbn-provision",
    division: "site-services",
    label: "Telecommunications and NBN provision",
    plain:
      "The conduit and lead-in that gets internet and phone service into the home.",
    trade: "electrical_services",
    tier: "core",
    aliases: ["nbn conduit", "lead-in conduit", "telecommunications pit", "comms"],
  },
  {
    id: "site-services.gas-connection",
    division: "site-services",
    label: "Gas service connection",
    plain:
      "The gas line from the main or bottles to the meter, where the home uses gas.",
    trade: "hydraulic_services",
    tier: "conditional",
    aliases: ["gas meter", "gas service", "lpg bottles"],
  },
  {
    id: "site-services.septic-treatment",
    division: "site-services",
    label: "On-site wastewater treatment",
    plain:
      "A septic or treatment system where there is no sewer to connect to, sized and approved for the block.",
    trade: "hydraulic_services",
    tier: "alternative",
    appliesTo: ["single_dwelling", "extension", "renovation"],
    allowance: "ps",
    aliases: ["septic", "aws", "aerated wastewater", "envirocycle", "absorption trenches"],
  },
  {
    id: "site-services.rainwater-tank",
    division: "site-services",
    label: "Rainwater tank and pump",
    plain:
      "The tank that captures roof water and the pump that feeds it to toilets, laundry or garden.",
    trade: "hydraulic_services",
    tier: "conditional",
    aliases: ["water tank", "rainwater harvesting", "tank and pump"],
  },

  // ── 7 · footings and ground floor structure ───────────────────────
  {
    id: "footings-slab.strip-pad-footings",
    division: "footings-slab",
    label: "Strip and pad footings",
    plain:
      "Concrete footings poured in trenches to carry walls and posts, sized by the engineer for your soil.",
    trade: "concrete_work",
    tier: "alternative",
    aliases: ["strip footing", "pad footing", "footing beams"],
  },
  {
    id: "footings-slab.waffle-slab",
    division: "footings-slab",
    label: "Waffle pod slab",
    plain:
      "A concrete slab poured over foam pods that sits on top of the ground, the most common modern house slab.",
    trade: "concrete_work",
    tier: "alternative",
    aliases: ["waffle pod", "pod slab", "waffle raft"],
    /** As raft-slab: a slab on ground has no underfloor void and no timber
     *  subfloor. */
    excludes: ["insulation.underfloor", "footings-slab.subfloor-timber"],
  },
  {
    id: "footings-slab.raft-slab",
    division: "footings-slab",
    label: "Conventional raft slab",
    plain:
      "A concrete slab with thickened edge beams dug into the ground, used where soils or levels demand it.",
    trade: "concrete_work",
    tier: "alternative",
    aliases: ["raft slab", "stiffened raft", "footing slab", "slab on ground"],
    /** A slab on ground has no underfloor void to insulate and no timber
     *  subfloor beneath it. */
    excludes: ["insulation.underfloor", "footings-slab.subfloor-timber"],
  },
  {
    id: "footings-slab.suspended-slab",
    division: "footings-slab",
    label: "Suspended concrete slab",
    plain:
      "A concrete floor spanning between supports, for upper storeys, garages over rooms, or steep sites.",
    trade: "concrete_work",
    tier: "conditional",
    aliases: ["suspended slab", "bondek", "formwork slab", "ultrafloor"],
  },
  {
    id: "footings-slab.piers-piles",
    division: "footings-slab",
    label: "Piers and screw piles",
    plain:
      "Deep supports drilled or screwed down to solid ground where the surface soil cannot carry the home, often an allowance until depths are proven.",
    trade: "concrete_work",
    tier: "conditional",
    allowance: "ps",
    aliases: ["screw piles", "bored piers", "concrete piers", "pier and beam", "founding depth"],
  },
  {
    id: "footings-slab.termite-management",
    division: "footings-slab",
    label: "Termite management system",
    plain:
      "The barrier or treatment that protects the home from termites, required and certified under the code.",
    trade: "concrete_work",
    tier: "core",
    aliases: ["termite barrier", "termimesh", "kordon", "part a treatment", "physical barrier"],
  },
  {
    id: "footings-slab.vapour-barrier",
    division: "footings-slab",
    label: "Vapour barrier and slab preparation",
    plain:
      "The plastic membrane and sand bed under the slab that stops ground moisture rising into the home.",
    trade: "concrete_work",
    tier: "core",
    aliases: ["damp proof membrane", "polythene", "fortecon", "sand bed"],
  },
  {
    id: "footings-slab.subfloor-timber",
    division: "footings-slab",
    label: "Timber subfloor structure",
    plain:
      "Stumps, bearers and joists carrying a timber ground floor, the traditional alternative to a slab.",
    trade: "carpentry",
    tier: "alternative",
    aliases: ["stumps", "bearers and joists", "subfloor frame", "restumping"],
  },
  {
    id: "footings-slab.slab-setdowns",
    division: "footings-slab",
    label: "Slab set-downs and rebates",
    plain:
      "The lowered slab zones under showers, garages and porches that make falls and finishes work.",
    trade: "concrete_work",
    tier: "core",
    aliases: ["setdown", "rebate", "shower recess", "garage step down"],
  },
  {
    id: "footings-slab.underslab-drainage",
    division: "footings-slab",
    label: "Under-slab plumbing rough-in",
    plain:
      "The drainage pipes laid in the ground before the slab covers them, put exactly where bathrooms and kitchens will land.",
    trade: "hydraulic_services",
    tier: "core",
    aliases: ["under slab drainage", "in-slab plumbing", "prelay"],
  },

  // ── 8 · retaining ─────────────────────────────────────────────────
  {
    id: "retaining.engineered-concrete-block",
    division: "retaining",
    label: "Engineered concrete and block retaining walls",
    plain:
      "Structural walls holding back earth, engineered and drained, usually where cuts exceed about a metre.",
    trade: "concrete_work",
    tier: "conditional",
    aliases: ["besser block retaining", "core filled", "cantilever retaining", "crib wall"],
  },
  {
    id: "retaining.timber-sleeper",
    division: "retaining",
    label: "Timber and sleeper retaining walls",
    plain:
      "Treated timber or concrete sleeper walls for smaller level changes around the block.",
    trade: "external_works",
    tier: "conditional",
    aliases: ["sleeper wall", "treated pine retaining", "concrete sleepers"],
  },
  {
    id: "retaining.subsoil-drainage",
    division: "retaining",
    label: "Sub-soil drainage behind walls",
    plain:
      "The gravel and slotted pipe behind every retaining wall that lets water escape instead of pushing the wall over.",
    trade: "hydraulic_services",
    tier: "conditional",
    aliases: ["agi drain", "ag pipe", "subsoil drain", "geofabric"],
  },
  {
    id: "retaining.shoring",
    division: "retaining",
    label: "Temporary shoring and batters",
    plain:
      "Temporarily supporting deep excavation faces so work beside them is safe, priced as an allowance where ground is unproven.",
    trade: "ground_works",
    tier: "conditional",
    appliesTo: ["multi_dwelling", "single_dwelling"],
    allowance: "ps",
    aliases: [
      "shoring",
      "soldier piles",
      "shotcrete",
      "batter",
      "temporary works",
      "temporary bracing",
      "propping",
      "back-propping",
      "needle propping",
      "temporary retention",
    ],
  },

  // ── 9 · structural steel ──────────────────────────────────────────
  {
    id: "steel.beams-columns",
    division: "steel",
    label: "Steel beams and columns",
    plain:
      "The steel members that carry big spans and open corners, supplied, delivered and installed to the engineer's design.",
    trade: "structural_steelwork",
    tier: "conditional",
    aliases: ["ub", "uc", "pfc", "shs", "rhs", "universal beam", "steel post"],
  },
  {
    id: "steel.portal-garage-frames",
    division: "steel",
    label: "Portal and garage frames",
    plain:
      "Steel frames for wide garage openings and large clear spans.",
    trade: "structural_steelwork",
    tier: "conditional",
    aliases: ["portal frame", "garage portal"],
  },
  {
    id: "steel.lintels",
    division: "steel",
    label: "Steel lintels and angles",
    plain:
      "The steel over windows and doors in brickwork that carries the bricks above the opening.",
    trade: "structural_steelwork",
    tier: "conditional",
    aliases: ["lintel", "galintel", "angle lintel", "t-bar"],
  },
  {
    id: "steel.connections-fixings",
    division: "steel",
    label: "Steel connections, plates and bolts",
    plain:
      "The engineered plates, brackets and bolts that tie steel to concrete and timber.",
    trade: "structural_steelwork",
    tier: "conditional",
    aliases: ["cleat", "base plate", "chemset", "hold down bolts"],
  },
  {
    id: "steel.protective-coating",
    division: "steel",
    label: "Galvanising and protective coatings",
    plain:
      "The rust protection on structural steel, from primer inside to hot-dip galvanising near the coast.",
    trade: "structural_steelwork",
    tier: "conditional",
    aliases: ["hot dip galvanised", "hdg", "zinc primer", "duplex coating"],
  },

  // ── 10 · framing ──────────────────────────────────────────────────
  {
    id: "framing.wall-frames",
    division: "framing",
    label: "Wall framing",
    plain:
      "The timber or steel wall frames of every room, prefabricated or built on site.",
    trade: "carpentry",
    tier: "core",
    aliases: ["wall frames", "stud walls", "prefab frames", "90x45", "mgp10"],
  },
  {
    id: "framing.roof-trusses",
    division: "framing",
    label: "Roof trusses",
    plain:
      "Engineered roof trusses made to the roof design and lifted into place.",
    trade: "carpentry",
    tier: "alternative",
    aliases: ["trusses", "truss layout", "girder truss"],
  },
  {
    id: "framing.stick-roof",
    division: "framing",
    label: "Conventional (stick) roof framing",
    plain:
      "A roof cut and built rafter by rafter on site, used for complex rooflines and cathedral ceilings.",
    trade: "carpentry",
    tier: "alternative",
    aliases: ["pitched on site", "rafters", "cut roof", "ridge beam"],
  },
  {
    id: "framing.floor-joists",
    division: "framing",
    label: "Upper floor joists and flooring",
    plain:
      "The engineered joists and sheet flooring that make the upper storey's floor.",
    trade: "carpentry",
    tier: "conditional",
    aliases: ["posi-strut", "i-joist", "ljl", "yellow tongue", "particleboard flooring", "sturdifloor"],
  },
  {
    id: "framing.engineered-beams",
    division: "framing",
    label: "Engineered timber beams (LVL, glulam)",
    plain:
      "Laminated timber beams that carry loads over openings and long spans where steel is not needed.",
    trade: "carpentry",
    tier: "core",
    aliases: ["lvl", "glulam", "hyspan", "smartframe", "laminated beam"],
  },
  {
    id: "framing.steel-framing",
    division: "framing",
    label: "Light gauge steel framing",
    plain:
      "Steel wall and roof framing as an alternative to timber, straight and termite-proof.",
    trade: "carpentry",
    tier: "conditional",
    aliases: ["steel frame", "truecore", "light gauge steel"],
  },
  {
    id: "framing.cathedral-raked",
    division: "framing",
    label: "Raked and cathedral ceiling framing",
    plain:
      "The extra structure that lets a ceiling follow the roofline instead of sitting flat.",
    trade: "carpentry",
    tier: "conditional",
    aliases: ["raked ceiling", "cathedral ceiling", "exposed rafters"],
  },
  {
    id: "framing.party-walls",
    division: "framing",
    label: "Party and inter-tenancy walls",
    plain:
      "The fire and sound rated walls that separate one dwelling from the next.",
    trade: "carpentry",
    tier: "core",
    appliesTo: ["multi_dwelling"],
    aliases: ["party wall", "intertenancy wall", "separating wall", "hebel powerpanel"],
  },
  {
    id: "framing.hardware-bracing",
    division: "framing",
    label: "Frame bracing and tie-down",
    plain:
      "The bracing, straps and bolts that make frames rigid and hold the roof down in wind, all to the engineer's schedule.",
    trade: "carpentry",
    tier: "core",
    aliases: ["bracing", "tie down", "cyclone rods", "speedbrace", "shear wall"],
  },

  // ── 11 · roofing ──────────────────────────────────────────────────
  {
    id: "roofing.metal-roof",
    division: "roofing",
    label: "Metal roof sheeting",
    plain:
      "Colorbond or zincalume steel roofing, screwed to battens over the whole roof.",
    trade: "roofing",
    tier: "alternative",
    aliases: ["colorbond", "corrugated", "klip-lok", "trimdek", "custom orb", "zincalume"],
  },
  {
    id: "roofing.tile-roof",
    division: "roofing",
    label: "Roof tiles",
    plain:
      "Concrete or terracotta roof tiles, laid, pointed and ridge-capped.",
    trade: "roofing",
    tier: "alternative",
    aliases: ["concrete tiles", "terracotta tiles", "ridge capping", "repointing"],
  },
  {
    id: "roofing.sarking-battens",
    division: "roofing",
    label: "Roof sarking and battens",
    plain:
      "The reflective blanket under the roof covering and the battens it fixes to.",
    trade: "roofing",
    tier: "core",
    aliases: ["sarking", "anticon", "roof blanket", "roof battens", "top hats"],
  },
  {
    id: "roofing.fascia-gutter",
    division: "roofing",
    label: "Fascia and gutters",
    plain:
      "The boards that finish the roof edge and the gutters that catch the rain off it.",
    trade: "roofing",
    tier: "core",
    aliases: ["fascia", "quad gutter", "half round", "eaves gutter", "gutter guard"],
  },
  {
    id: "roofing.downpipes",
    division: "roofing",
    label: "Downpipes",
    plain:
      "The pipes that take roof water from the gutters down to the stormwater drains.",
    trade: "roofing",
    tier: "core",
    aliases: ["downpipe", "dp", "rain head", "spreader"],
  },
  {
    id: "roofing.flashings",
    division: "roofing",
    label: "Flashings and cappings",
    plain:
      "The folded metal at every roof junction, wall and penetration that keeps water out for the life of the roof.",
    trade: "roofing",
    tier: "core",
    aliases: ["flashing", "apron", "barge capping", "parapet capping", "penetration flashing"],
  },
  {
    id: "roofing.box-gutters",
    division: "roofing",
    label: "Box gutters and sumps",
    plain:
      "Internal gutters where roof sections meet, engineered with overflows because a blocked one floods the house.",
    trade: "roofing",
    tier: "conditional",
    aliases: ["box gutter", "sump", "overflow", "rainhead"],
    /** Box gutters sit behind parapet capping, so there is no eave and no
     *  soffit to line. Ratified 27 Aug 2026 after both the engine and an
     *  independent auditor called the missing soffit a finish gap. */
    excludes: ["external-walls.eaves-soffits"],
  },
  {
    id: "roofing.skylights",
    division: "roofing",
    label: "Skylights and roof windows",
    plain:
      "Natural light through the roof, from fixed skylights to opening roof windows, flashed into the roofing.",
    trade: "roofing",
    tier: "conditional",
    allowance: "pc",
    aliases: ["skylight", "velux", "solatube", "roof window"],
  },
  {
    id: "roofing.roof-ventilation",
    division: "roofing",
    label: "Roof space ventilation",
    plain:
      "Vents or powered fans that let hot air out of the roof space.",
    trade: "roofing",
    tier: "conditional",
    aliases: ["whirlybird", "roof vent", "ridge vent", "solar fan"],
  },

  // ── 12 · external walls ───────────────────────────────────────────
  {
    id: "external-walls.brick-veneer",
    division: "external-walls",
    label: "Brick veneer walls",
    plain:
      "A single skin of bricks outside the frame, the most common Australian external wall.",
    trade: "brickwork_and_blockwork",
    tier: "alternative",
    aliases: ["face brick", "brick veneer", "common bricks", "brickwork"],
  },
  {
    id: "external-walls.double-brick",
    division: "external-walls",
    label: "Double brick and cavity walls",
    plain:
      "Two skins of masonry with a cavity between, standard in some states and prized for solidity.",
    trade: "brickwork_and_blockwork",
    tier: "alternative",
    aliases: ["double brick", "cavity brick", "full brick"],
  },
  {
    id: "external-walls.blockwork",
    division: "external-walls",
    label: "Concrete blockwork walls",
    plain:
      "Concrete block walls, often core-filled with steel and concrete, common for garages, basements and boundary walls.",
    trade: "brickwork_and_blockwork",
    tier: "alternative",
    aliases: ["besser block", "core filled blockwork", "cmu", "rendered blockwork"],
  },
  {
    id: "external-walls.fc-cladding",
    division: "external-walls",
    label: "Fibre cement and panel cladding",
    plain:
      "Sheet and plank cladding systems fixed over the frame, from weatherboard looks to crisp panel facades.",
    trade: "external_finishes",
    tier: "alternative",
    aliases: ["scyon", "axon", "linea", "matrix", "hardie", "fc sheet", "blueboard"],
  },
  {
    id: "external-walls.metal-cladding",
    division: "external-walls",
    label: "Metal wall cladding",
    plain:
      "Metal sheet cladding to external walls: Colorbond profiles, standing seam, interlocking panels or weathering steel, with its trims and flashings.",
    trade: "external_finishes",
    tier: "alternative",
    aliases: [
      "colorbond cladding",
      "colorbond longline",
      "longline",
      "standing seam",
      "interlocking panel",
      "snaplock",
      "nailstrip",
      "corten",
      "corten steel cladding",
      "weathering steel",
      "metal wall cladding",
      "zincalume cladding",
    ],
  },
  {
    id: "external-walls.timber-composite-cladding",
    division: "external-walls",
    label: "Timber and composite cladding",
    plain:
      "Natural timber or composite boards as the feature skin of the building.",
    trade: "external_finishes",
    tier: "alternative",
    aliases: ["shiplap", "weatherboard", "silvertop ash", "spotted gum cladding", "composite cladding"],
  },
  {
    id: "external-walls.render-systems",
    division: "external-walls",
    label: "Render and texture coating systems",
    plain:
      "Rendered finishes over brick, block or foam, from cement render to acrylic texture systems.",
    trade: "external_finishes",
    tier: "conditional",
    aliases: ["acrylic render", "cement render", "texture coat", "unitex", "granosite"],
  },
  {
    id: "external-walls.lightweight-panel",
    division: "external-walls",
    label: "Lightweight panel systems (AAC, EPS)",
    plain:
      "Aerated concrete or insulated foam panel walls, rendered to finish, light and quick to build.",
    trade: "external_finishes",
    tier: "alternative",
    aliases: ["hebel", "aac panel", "eps panel", "nrg", "exsulite"],
  },
  {
    id: "external-walls.cavity-components",
    division: "external-walls",
    label: "Cavity components, ties and weepholes",
    plain:
      "The hidden hardware in masonry walls: ties holding skins together, flashings and weepholes letting moisture escape.",
    trade: "brickwork_and_blockwork",
    tier: "conditional",
    aliases: ["brick ties", "weepholes", "cavity flashing", "dpc", "damp course"],
  },
  {
    id: "external-walls.control-joints",
    division: "external-walls",
    label: "Articulation and control joints",
    plain:
      "The deliberate joints that let walls move with the ground instead of cracking.",
    trade: "brickwork_and_blockwork",
    tier: "conditional",
    aliases: ["articulation joint", "expansion joint", "control joint"],
  },
  {
    id: "external-walls.eaves-soffits",
    division: "external-walls",
    label: "Eaves and soffit linings",
    plain:
      "The lined underside of the roof overhang around the home.",
    trade: "external_finishes",
    tier: "core",
    aliases: ["eaves lining", "soffit", "villaboard eaves", "boxed eaves"],
  },

  // ── 13 · windows and glazing ──────────────────────────────────────
  {
    id: "windows.aluminium-windows",
    division: "windows",
    label: "Aluminium windows and sliding doors",
    plain:
      "The standard aluminium-framed windows and sliding glass doors throughout the home, made to the window schedule.",
    trade: "windows_and_curtain_wall",
    tier: "alternative",
    aliases: ["window schedule", "awning windows", "sliding windows", "stacker door", "sliding door"],
  },
  {
    id: "windows.timber-composite-windows",
    division: "windows",
    label: "Timber and composite windows",
    plain:
      "Timber or timber-look window frames where the design calls for warmth or heritage character.",
    trade: "windows_and_curtain_wall",
    tier: "alternative",
    allowance: "pc",
    aliases: ["timber windows", "cedar windows", "double hung", "upvc windows"],
  },
  {
    id: "windows.bifold-corner-units",
    division: "windows",
    label: "Bi-fold and special opening units",
    plain:
      "Bi-fold doors, corner-opening units and other large-format glazing that opens the home right up.",
    trade: "windows_and_curtain_wall",
    tier: "conditional",
    allowance: "pc",
    aliases: ["bifold", "corner stacker", "servery window", "louvre windows"],
  },
  {
    id: "windows.glazing-performance",
    division: "windows",
    label: "Glazing performance specification",
    plain:
      "The glass itself: single, double glazed or low-e, chosen to hit the energy rating and comfort the design promises.",
    trade: "glazing",
    tier: "core",
    aliases: ["double glazing", "igu", "low-e", "u-value", "shgc", "comfortplus"],
  },
  {
    id: "windows.safety-obscure-glass",
    division: "windows",
    label: "Safety and obscure glazing",
    plain:
      "Toughened glass where the code demands it and frosted glass where privacy needs it.",
    trade: "glazing",
    tier: "core",
    aliases: ["toughened", "grade a safety glass", "obscure", "translucent"],
  },
  {
    id: "windows.flyscreens",
    division: "windows",
    label: "Flyscreens",
    plain:
      "Insect screens to opening windows and sliding doors.",
    trade: "windows_and_curtain_wall",
    tier: "core",
    aliases: ["insect screens", "midge mesh"],
  },
  {
    id: "windows.window-reveals",
    division: "windows",
    label: "Reveals, sills and window trim",
    plain:
      "The timber linings and sills that finish each window into the wall.",
    trade: "carpentry",
    tier: "core",
    aliases: ["reveals", "window sill", "sill board"],
  },

  // ── 14 · external doors ───────────────────────────────────────────
  {
    id: "external-doors.entry-door",
    division: "external-doors",
    label: "Entry door and frame",
    plain:
      "The front door: the statement piece of the facade, hung in its frame with seals and a proper lock.",
    trade: "doors",
    tier: "core",
    allowance: "pc",
    aliases: ["entrance door", "pivot door", "front door", "entry frame"],
  },
  {
    id: "external-doors.external-hardware",
    division: "external-doors",
    label: "External door hardware and locks",
    plain:
      "Handles, deadlocks and smart locks on the doors in and out of the home.",
    trade: "fixtures_and_fittings",
    tier: "core",
    allowance: "pc",
    aliases: ["entrance set", "deadlock", "smart lock", "lever set"],
  },
  {
    id: "external-doors.hinged-french-doors",
    division: "external-doors",
    label: "Hinged and French external doors",
    plain:
      "Glazed hinged doors to outdoor areas, secondary entries and laundries.",
    trade: "doors",
    tier: "conditional",
    aliases: ["french doors", "laundry door", "glazed external door"],
  },
  {
    id: "external-doors.garage-door",
    division: "external-doors",
    label: "Garage door",
    plain:
      "The sectional or panel-lift garage door, colour matched to the facade.",
    trade: "doors",
    tier: "conditional",
    allowance: "pc",
    aliases: ["sectional door", "panel lift", "roller door", "b&d"],
  },
  {
    id: "external-doors.garage-motor",
    division: "external-doors",
    label: "Garage door opener",
    plain:
      "The motor and remotes that drive the garage door.",
    trade: "doors",
    tier: "conditional",
    aliases: ["garage motor", "auto opener", "merlin", "remote"],
  },
  {
    id: "external-doors.screen-doors",
    division: "external-doors",
    label: "Security and screen doors",
    plain:
      "Security screen doors to entries and sliding doors, letting air in and keeping everything else out.",
    trade: "doors",
    tier: "conditional",
    allowance: "pc",
    aliases: ["security door", "crimsafe", "screen door", "barrier door"],
  },

  // ── 15 · insulation ───────────────────────────────────────────────
  {
    id: "insulation.ceiling",
    division: "insulation",
    label: "Ceiling insulation",
    plain:
      "The batts above the ceiling that do the heaviest lifting for comfort and energy bills.",
    trade: "carpentry",
    tier: "core",
    aliases: ["ceiling batts", "r4.0", "r5.0", "r6.0", "glasswool", "earthwool"],
  },
  {
    id: "insulation.external-walls",
    division: "insulation",
    label: "External wall insulation",
    plain:
      "Batts in every external wall, at the rating the energy report requires.",
    trade: "carpentry",
    tier: "core",
    aliases: ["wall batts", "r2.5", "r2.7", "wall insulation"],
  },
  {
    id: "insulation.internal-acoustic",
    division: "insulation",
    label: "Internal and acoustic insulation",
    plain:
      "Sound batts in the walls around bedrooms, bathrooms and between floors, for a quieter home.",
    trade: "carpentry",
    tier: "conditional",
    aliases: ["acoustic batts", "sound screen", "soundcheck", "internal wall insulation"],
  },
  {
    id: "insulation.underfloor",
    division: "insulation",
    label: "Underfloor insulation",
    plain:
      "Insulation under suspended timber floors, closing off the cold from below.",
    trade: "carpentry",
    tier: "conditional",
    aliases: ["underfloor batts", "expol", "subfloor insulation"],
  },
  {
    id: "insulation.wall-wrap",
    division: "insulation",
    label: "Wall wrap and vapour membranes",
    plain:
      "The breather membrane around the frame behind the cladding, managing wind and moisture.",
    trade: "carpentry",
    tier: "core",
    aliases: ["wall wrap", "sisalation", "vapour permeable membrane", "proctorwrap"],
  },
  {
    id: "insulation.party-wall-acoustic",
    division: "insulation",
    label: "Party wall acoustic systems",
    plain:
      "The rated insulation systems inside walls shared between dwellings.",
    trade: "carpentry",
    tier: "core",
    appliesTo: ["multi_dwelling"],
    aliases: ["party wall batts", "rw rating", "discontinuous construction"],
  },

  // ── 16 · internal linings ─────────────────────────────────────────
  {
    id: "lining.wall-plasterboard",
    division: "lining",
    label: "Wall plasterboard",
    plain:
      "The plasterboard on every internal wall face, stopped and sanded ready for paint.",
    trade: "partitions_and_ceilings",
    tier: "core",
    aliases: ["gyprock", "plasterboard", "10mm board", "level 4 finish"],
  },
  {
    id: "lining.ceiling-plasterboard",
    division: "lining",
    label: "Ceiling linings",
    plain:
      "The plasterboard ceilings through the home, fixed to battens or directly to the structure.",
    trade: "partitions_and_ceilings",
    tier: "core",
    aliases: ["ceiling board", "13mm ceiling", "supaceil", "furring channel"],
  },
  {
    id: "lining.wet-area-board",
    division: "lining",
    label: "Wet area linings",
    plain:
      "The moisture-resistant board behind tiles in bathrooms and laundries.",
    trade: "partitions_and_ceilings",
    tier: "core",
    aliases: ["aquachek", "wet area board", "villaboard", "cement sheet lining"],
  },
  {
    id: "lining.cornice",
    division: "lining",
    label: "Cornice",
    plain:
      "The moulding where walls meet ceilings, from simple cove to period profiles.",
    trade: "partitions_and_ceilings",
    tier: "alternative",
    aliases: ["cove cornice", "75mm cornice", "decorative cornice"],
  },
  {
    id: "lining.square-set",
    division: "lining",
    label: "Square set finish",
    plain:
      "The crisp cornice-free junction between wall and ceiling, a modern detail that takes extra plastering care.",
    trade: "partitions_and_ceilings",
    tier: "alternative",
    aliases: ["square set", "shadowline ceiling", "no cornice"],
  },
  {
    id: "lining.bulkheads-features",
    division: "lining",
    label: "Bulkheads and ceiling features",
    plain:
      "Dropped ceiling sections over kitchens and robes, and any recessed or feature ceiling details.",
    trade: "partitions_and_ceilings",
    tier: "conditional",
    aliases: ["bulkhead", "dropped ceiling", "recessed ceiling", "shadowline bulkhead"],
  },
  {
    id: "lining.access-panels",
    division: "lining",
    label: "Ceiling access panels",
    plain:
      "The hatch into the roof space and access panels where services need reaching.",
    trade: "partitions_and_ceilings",
    tier: "core",
    aliases: ["manhole", "access hatch", "roof access"],
  },

  // ── 17 · internal doors ───────────────────────────────────────────
  {
    id: "internal-doors.flush-doors",
    division: "internal-doors",
    label: "Flush internal doors",
    plain:
      "The standard smooth doors to bedrooms, bathrooms and living spaces, hung and fitted.",
    trade: "doors",
    tier: "core",
    aliases: ["flush panel", "hollow core", "solid core", "redicote"],
  },
  {
    id: "internal-doors.feature-doors",
    division: "internal-doors",
    label: "Feature and panelled doors",
    plain:
      "Profiled, glazed or oversized doors where the design makes a moment of a doorway.",
    trade: "doors",
    tier: "conditional",
    allowance: "pc",
    aliases: ["barn door", "pivot internal", "glazed internal door", "panelled door"],
  },
  {
    id: "internal-doors.cavity-sliders",
    division: "internal-doors",
    label: "Cavity sliding doors",
    plain:
      "Doors that slide away inside the wall, saving space at robes, pantries and ensuites.",
    trade: "doors",
    tier: "conditional",
    aliases: ["cavity slider", "cs unit", "pocket door"],
  },
  {
    id: "internal-doors.door-hardware",
    division: "internal-doors",
    label: "Internal door hardware",
    plain:
      "The handles, hinges, latches and privacy sets on every internal door.",
    trade: "fixtures_and_fittings",
    tier: "core",
    allowance: "pc",
    aliases: ["passage set", "privacy set", "lever handles", "flush pulls", "hinges"],
  },
  {
    id: "internal-doors.jambs-stops",
    division: "internal-doors",
    label: "Door jambs and stops",
    plain:
      "The frames each internal door hangs in, set square so doors close cleanly for years.",
    trade: "carpentry",
    tier: "core",
    aliases: ["door jamb", "single rebate", "split jamb", "door stop"],
  },
  {
    id: "internal-doors.robe-doors",
    division: "internal-doors",
    label: "Robe sliding and mirror doors",
    plain:
      "The sliding panels across built-in robes, mirrored or panelled.",
    trade: "doors",
    tier: "conditional",
    allowance: "pc",
    aliases: ["robe doors", "mirror sliders", "vinyl sliding doors"],
  },

  // ── 18 · fix-out carpentry ────────────────────────────────────────
  {
    id: "fixout.skirting",
    division: "fixout",
    label: "Skirting boards",
    plain:
      "The boards along the bottom of every wall, finishing the junction with the floor.",
    trade: "internal_finishes",
    tier: "core",
    aliases: ["skirting", "67mm skirt", "lambs tongue", "colonial skirting", "pencil round"],
  },
  {
    id: "fixout.architraves",
    division: "fixout",
    label: "Architraves",
    plain:
      "The trim around every door and window opening inside the home.",
    trade: "internal_finishes",
    tier: "core",
    aliases: ["architrave", "arch and skirt", "42mm architrave"],
  },
  {
    id: "fixout.shelving",
    division: "fixout",
    label: "Shelving to robes, linen and pantry",
    plain:
      "The basic shelves and rails in robes, linen cupboards and the pantry, before any upgraded fit-outs.",
    trade: "carpentry",
    tier: "core",
    aliases: ["melamine shelving", "shelf and rail", "linen shelving", "pantry shelving"],
  },
  {
    id: "fixout.feature-trim",
    division: "fixout",
    label: "Feature mouldings and wall panelling",
    plain:
      "Wainscoting, VJ panelling, picture rails and the decorative timberwork that gives rooms character.",
    trade: "internal_finishes",
    tier: "conditional",
    aliases: ["vj panelling", "wainscoting", "wall panelling", "dado rail", "batten feature wall"],
  },
  {
    id: "fixout.timber-sills-benches",
    division: "fixout",
    label: "Window seats and timber benches",
    plain:
      "Built-in timber seats and bench tops made by the carpenter rather than the cabinet maker.",
    trade: "carpentry",
    tier: "conditional",
    aliases: ["window seat", "bench seat", "day bed"],
  },

  // ── 19 · stairs and balustrades ───────────────────────────────────
  {
    id: "stairs.internal-staircase",
    division: "stairs",
    label: "Internal staircase",
    plain:
      "The staircase itself: treads, risers and stringers, in the timber or construction the design specifies.",
    trade: "carpentry",
    tier: "conditional",
    allowance: "pc",
    aliases: ["staircase", "stair stringers", "treads and risers", "mdf stairs", "victorian ash stairs"],
  },
  {
    id: "stairs.internal-balustrade",
    division: "stairs",
    label: "Internal balustrade and handrail",
    plain:
      "The balustrade up the stairs and around voids, in timber, steel or glass, built to the height the code requires.",
    trade: "metalwork",
    tier: "conditional",
    allowance: "pc",
    aliases: ["balustrade", "handrail", "glass balustrade", "stainless wire", "void balustrade"],
  },
  {
    id: "stairs.external-balustrade",
    division: "stairs",
    label: "External balustrades",
    plain:
      "Balustrades to balconies, decks and external stairs, weatherproof and to code heights.",
    trade: "metalwork",
    tier: "conditional",
    aliases: ["balcony balustrade", "deck balustrade", "external handrail"],
  },
  {
    id: "stairs.external-stairs",
    division: "stairs",
    label: "External stairs",
    plain:
      "Outdoor steps in concrete, timber or steel connecting levels around the home.",
    trade: "external_works",
    tier: "conditional",
    aliases: ["external steps", "concrete steps", "timber stairs external"],
  },
  {
    id: "stairs.feature-screens",
    division: "stairs",
    label: "Feature screens and battens",
    plain:
      "Timber or metal screens beside stairs and voids that divide space without closing it.",
    trade: "metalwork",
    tier: "conditional",
    allowance: "pc",
    aliases: ["batten screen", "stair screen", "slatted screen"],
  },
  {
    id: "stairs.residential-lift",
    division: "stairs",
    label: "Residential lift",
    plain:
      "A home lift between floors: the shaft and pit the structure provides, and the lift unit itself with its power, doors, commissioning and certification.",
    trade: "special_provisions",
    tier: "conditional",
    allowance: "ps",
    aliases: [
      "lift",
      "elevator",
      "home lift",
      "platform lift",
      "lift shaft",
      "lift pit",
      "lift overrun",
      "dumbwaiter",
    ],
  },

  // ── 20 · joinery ──────────────────────────────────────────────────
  {
    id: "joinery.kitchen-cabinetry",
    division: "joinery",
    label: "Kitchen cabinetry",
    plain:
      "The kitchen's base and overhead cupboards, drawers, panels and kickboards, made and installed to the kitchen drawings.",
    trade: "joinery",
    tier: "core",
    aliases: ["kitchen joinery", "base units", "overheads", "soft close", "polyurethane doors", "laminate doors"],
  },
  {
    id: "joinery.benchtops",
    division: "joinery",
    label: "Benchtops",
    plain:
      "The kitchen and vanity tops, from laminate to engineered stone to natural stone, templated and installed.",
    trade: "joinery",
    tier: "core",
    allowance: "pc",
    aliases: ["stone benchtop", "20mm stone", "40mm stone", "caesarstone", "laminate benchtop", "waterfall end"],
  },
  {
    id: "joinery.island-bench",
    division: "joinery",
    label: "Island bench and breakfast bar",
    plain:
      "The freestanding island with its cabinetry, panels and seating overhang.",
    trade: "joinery",
    tier: "conditional",
    aliases: ["island", "breakfast bar", "island panels"],
  },
  {
    id: "joinery.butlers-pantry",
    division: "joinery",
    label: "Butler's pantry and scullery fit-out",
    plain:
      "The second working kitchen behind the kitchen: benches, shelving and cabinetry in the pantry room.",
    trade: "joinery",
    tier: "conditional",
    aliases: ["butlers pantry", "scullery", "walk in pantry fitout", "wip"],
  },
  {
    id: "joinery.vanities",
    division: "joinery",
    label: "Bathroom vanities",
    plain:
      "The vanity units in each bathroom and powder room, wall hung or floor standing, with their tops.",
    trade: "joinery",
    tier: "core",
    allowance: "pc",
    aliases: ["vanity", "wall hung vanity", "vanity unit"],
  },
  {
    id: "joinery.laundry-joinery",
    division: "joinery",
    label: "Laundry cabinetry",
    plain:
      "The laundry's benches, cupboards and tall storage built around the trough and machines.",
    trade: "joinery",
    tier: "core",
    aliases: ["laundry cupboards", "laundry bench", "broom cupboard"],
  },
  {
    id: "joinery.robe-fitouts",
    division: "joinery",
    label: "Wardrobe fit-outs",
    plain:
      "The upgraded internals of robes: drawers, shelves, hanging in a walk-in or built-in configuration.",
    trade: "joinery",
    tier: "conditional",
    allowance: "pc",
    aliases: ["wir fitout", "walk in robe", "robe internals", "bir fitout"],
  },
  {
    id: "joinery.entertainment-study",
    division: "joinery",
    label: "Entertainment units and study joinery",
    plain:
      "Built-in TV units, bookshelves and desks made to the joinery drawings.",
    trade: "joinery",
    tier: "conditional",
    allowance: "pc",
    aliases: ["tv unit", "study nook", "built in desk", "bookshelf joinery"],
  },
  {
    id: "joinery.custom-features",
    division: "joinery",
    label: "Custom feature joinery",
    plain:
      "One-off cabinetry pieces beyond the standard rooms, carried as an allowance until detailed.",
    trade: "joinery",
    tier: "conditional",
    allowance: "ps",
    aliases: ["custom joinery", "bar joinery", "wine display", "mudroom joinery"],
  },

  // ── 21 · waterproofing ────────────────────────────────────────────
  {
    id: "waterproofing.wet-areas",
    division: "waterproofing",
    label: "Internal wet area waterproofing",
    plain:
      "The membrane under and around showers, baths and laundry floors, applied by a licensed applicator to the standard.",
    trade: "tiling",
    tier: "core",
    aliases: ["wet seal", "membrane", "as 3740", "shower waterproofing", "bathroom membrane"],
  },
  {
    id: "waterproofing.balconies",
    division: "waterproofing",
    label: "Balcony and external deck waterproofing",
    plain:
      "The external-grade membrane on balconies over rooms, the single detail most worth doing perfectly.",
    trade: "tiling",
    tier: "conditional",
    aliases: ["balcony membrane", "external waterproofing", "as 4654"],
  },
  {
    id: "waterproofing.planter-tanking",
    division: "waterproofing",
    label: "Planter box and below-ground tanking",
    plain:
      "Waterproofing to planter boxes and walls below ground level.",
    trade: "tiling",
    tier: "conditional",
    appliesTo: ["multi_dwelling", "single_dwelling"],
    aliases: ["tanking", "planter waterproofing", "retaining tanking"],
  },
  {
    id: "waterproofing.shower-systems",
    division: "waterproofing",
    label: "Shower hobs, niches and falls",
    plain:
      "The screeds, hobs and recessed niches that shape each shower before it is tiled.",
    trade: "tiling",
    tier: "core",
    aliases: ["shower hob", "hobless shower", "niche", "shower base screed"],
  },
  {
    id: "waterproofing.certification",
    division: "waterproofing",
    label: "Waterproofing certification",
    plain:
      "The applicator's certificate for every membrane, kept on record because this work disappears under tiles.",
    trade: "tiling",
    tier: "commercial",
    aliases: ["waterproofing certificate", "form 43", "compliance certificate waterproofing"],
  },

  // ── 22 · tiling ───────────────────────────────────────────────────
  {
    id: "tiling.floor-tiles-supply",
    division: "tiling",
    label: "Floor tiles supply",
    plain:
      "The floor tiles themselves, carried at a rate per square metre until you choose them.",
    trade: "tiling",
    tier: "core",
    allowance: "pc",
    aliases: ["floor tile pc", "tile allowance", "porcelain floor tiles", "600x600"],
  },
  {
    id: "tiling.wall-tiles-supply",
    division: "tiling",
    label: "Wall tiles supply",
    plain:
      "The wall tiles for bathrooms, splashbacks and features, carried at a rate until selected.",
    trade: "tiling",
    tier: "core",
    allowance: "pc",
    aliases: ["wall tile pc", "subway tiles", "splashback tiles", "feature tiles"],
  },
  {
    id: "tiling.floor-laying",
    division: "tiling",
    label: "Floor tile laying",
    plain:
      "Laying the floor tiles: preparation, adhesive, cutting, grouting and sealing.",
    trade: "tiling",
    tier: "core",
    aliases: ["floor tiling labour", "lay floor tiles", "tile laying"],
  },
  {
    id: "tiling.wall-laying",
    division: "tiling",
    label: "Wall tile laying",
    plain:
      "Fixing wall tiles to the heights on the drawings, from splashbacks to full-height bathroom walls.",
    trade: "tiling",
    tier: "core",
    aliases: ["wall tiling labour", "tile to ceiling", "half height tiling"],
  },
  {
    id: "tiling.features-niches",
    division: "tiling",
    label: "Feature tiling, niches and mitres",
    plain:
      "The detailed tiling work: niches, mitred edges, herringbone patterns and mosaic features.",
    trade: "tiling",
    tier: "conditional",
    aliases: ["mitred edge", "herringbone", "mosaic", "niche tiling"],
  },
  {
    id: "tiling.screeds-prep",
    division: "tiling",
    label: "Screeds and falls",
    plain:
      "The mortar beds that create falls to floor wastes so water goes where it should.",
    trade: "tiling",
    tier: "core",
    aliases: ["screed", "fall to waste", "bed and fall"],
  },
  {
    id: "tiling.trims-movement",
    division: "tiling",
    label: "Tile trims, angles and movement joints",
    plain:
      "The metal edges, corners and flexible joints that finish tiled surfaces properly.",
    trade: "tiling",
    tier: "core",
    aliases: ["tile trim", "aluminium angle", "movement joint", "silicone junctions"],
  },

  // ── 23 · floor coverings ──────────────────────────────────────────
  {
    id: "flooring.engineered-timber",
    division: "flooring",
    label: "Engineered and solid timber flooring",
    plain:
      "Timber floors through the living spaces, floating or glued, in the species and width you select.",
    trade: "internal_finishes",
    tier: "alternative",
    allowance: "pc",
    aliases: ["engineered oak", "solid timber floor", "herringbone timber", "floating floor"],
  },
  {
    id: "flooring.laminate-hybrid",
    division: "flooring",
    label: "Laminate and hybrid flooring",
    plain:
      "Hard-wearing laminate or waterproof hybrid planks as a practical alternative to timber.",
    trade: "internal_finishes",
    tier: "alternative",
    allowance: "pc",
    aliases: ["hybrid flooring", "laminate", "spc", "vinyl plank"],
  },
  {
    id: "flooring.carpet",
    division: "flooring",
    label: "Carpet and underlay",
    plain:
      "Carpet to bedrooms and quiet rooms, with underlay, at a rate until you choose it.",
    trade: "internal_finishes",
    tier: "conditional",
    allowance: "pc",
    aliases: ["carpet pc", "wool carpet", "underlay", "carpet to bedrooms"],
  },
  {
    id: "flooring.polished-concrete",
    division: "flooring",
    label: "Polished and honed concrete floors",
    plain:
      "The slab itself ground and sealed as the finished floor, planned before the concrete is even poured.",
    trade: "concrete_work",
    tier: "alternative",
    aliases: ["polished concrete", "honed concrete", "grind and seal", "mechanically polished"],
  },
  {
    id: "flooring.sanding-existing",
    division: "flooring",
    label: "Sanding and finishing existing timber floors",
    plain:
      "Bringing existing floorboards back: sanding, repairs and coating.",
    trade: "internal_finishes",
    tier: "conditional",
    appliesTo: ["renovation", "extension"],
    aliases: ["sand and polish", "floor sanding", "refinish floorboards"],
  },
  {
    id: "flooring.levelling",
    division: "flooring",
    label: "Floor preparation and levelling",
    plain:
      "Grinding and self-levelling compounds that make substrates flat enough for the finished floor.",
    trade: "internal_finishes",
    tier: "conditional",
    aliases: ["self leveller", "ardit", "floor prep", "grinding"],
  },

  // ── 24 · painting ─────────────────────────────────────────────────
  {
    id: "painting.internal-walls-ceilings",
    division: "painting",
    label: "Internal walls and ceilings",
    plain:
      "Preparation and a full paint system to every internal wall and ceiling, in your chosen colours.",
    trade: "painting",
    tier: "core",
    aliases: ["three coat system", "internal painting", "ceiling white", "low sheen"],
  },
  {
    id: "painting.doors-trim",
    division: "painting",
    label: "Doors, frames and trim enamel",
    plain:
      "The durable enamel finish on doors, skirtings, architraves and window trim.",
    trade: "painting",
    tier: "core",
    aliases: ["enamel", "gloss trim", "semi gloss", "doors and jambs"],
  },
  {
    id: "painting.external-painting",
    division: "painting",
    label: "External painting",
    plain:
      "Painting the outside: render, cladding, eaves and external timberwork in exterior-grade systems.",
    trade: "painting",
    tier: "core",
    aliases: ["external paint", "render paint", "weathershield", "eaves paint"],
  },
  {
    id: "painting.timber-metal-finishes",
    division: "painting",
    label: "Clear finishes and stains",
    plain:
      "Stains, oils and clear coats on feature timber inside and out.",
    trade: "painting",
    tier: "conditional",
    aliases: ["stain", "decking oil", "clear coat", "cutek", "intergrain"],
  },
  {
    id: "painting.special-coatings",
    division: "painting",
    label: "Special and epoxy coatings",
    plain:
      "Garage floor epoxy and any special-purpose coatings beyond standard paint.",
    trade: "painting",
    tier: "conditional",
    aliases: ["epoxy floor", "garage epoxy", "flake floor"],
  },

  // ── 25 · plumbing and gas ─────────────────────────────────────────
  {
    id: "plumbing.rough-in",
    division: "plumbing",
    label: "Plumbing rough-in",
    plain:
      "All the water and drainage pipework inside walls and floors, run before linings close them in.",
    trade: "hydraulic_services",
    tier: "core",
    aliases: ["rough in", "pipework", "pex", "stack work"],
  },
  {
    id: "plumbing.fit-off",
    division: "plumbing",
    label: "Plumbing fit-off",
    plain:
      "Connecting and commissioning every fixture and tap at the end of the build.",
    trade: "hydraulic_services",
    tier: "core",
    aliases: ["fit off", "fixture installation", "commissioning"],
  },
  {
    id: "plumbing.sanitary-fixtures",
    division: "plumbing",
    label: "Sanitary fixtures",
    plain:
      "The toilets, basins, baths and sinks themselves, carried as prime cost items until you select them.",
    trade: "fixtures_and_fittings",
    tier: "core",
    allowance: "pc",
    aliases: ["toilet suite", "back to wall", "freestanding bath", "undermount sink", "basin"],
  },
  {
    id: "plumbing.tapware",
    division: "plumbing",
    label: "Tapware and showers",
    plain:
      "The taps, mixers, shower rails and outlets throughout, carried as prime cost items until selected.",
    trade: "fixtures_and_fittings",
    tier: "core",
    allowance: "pc",
    aliases: ["mixers", "shower rail", "rain shower", "wall spout", "tapware pc"],
  },
  {
    id: "plumbing.shower-screens",
    division: "plumbing",
    label: "Shower screens and mirrors",
    plain:
      "The glass screens to each shower and the mirrors above vanities, measured and fitted near handover.",
    trade: "glazing",
    tier: "core",
    allowance: "pc",
    aliases: ["frameless screen", "semi frameless", "fixed panel", "mirror"],
  },
  {
    id: "plumbing.hot-water",
    division: "plumbing",
    label: "Hot water system",
    plain:
      "The unit that heats the home's water: heat pump, gas continuous flow, electric or solar.",
    trade: "hydraulic_services",
    tier: "core",
    allowance: "pc",
    aliases: ["heat pump", "continuous flow", "instantaneous", "hws", "solar hot water"],
  },
  {
    id: "plumbing.gas-lines",
    division: "plumbing",
    label: "Internal gas lines",
    plain:
      "Gas runs to the cooktop, heater and any outdoor point.",
    trade: "hydraulic_services",
    tier: "conditional",
    aliases: ["gas point", "gas cooktop line", "bayonet"],
  },
  {
    id: "plumbing.floor-wastes",
    division: "plumbing",
    label: "Floor wastes and drainage fittings",
    plain:
      "The drains in bathroom and laundry floors, including linear strip drains where specified.",
    trade: "hydraulic_services",
    tier: "core",
    aliases: ["floor waste", "strip drain", "linear drain", "puddle flange"],
  },
  {
    id: "plumbing.appliance-connections",
    division: "plumbing",
    label: "Appliance water connections",
    plain:
      "Water points for the fridge, dishwasher and washing machine.",
    trade: "hydraulic_services",
    tier: "core",
    aliases: ["fridge point", "dishwasher point", "washing machine taps"],
  },
  {
    id: "plumbing.external-taps",
    division: "plumbing",
    label: "External taps and hose points",
    plain:
      "Garden taps around the home and any outdoor kitchen or pool top-up points.",
    trade: "hydraulic_services",
    tier: "core",
    aliases: ["hose cock", "garden tap", "external tap"],
  },

  // ── 26 · electrical and data ──────────────────────────────────────
  {
    id: "electrical.rough-in",
    division: "electrical",
    label: "Electrical rough-in",
    plain:
      "All the cabling through the frame before linings: circuits, points and switch runs.",
    trade: "electrical_services",
    tier: "core",
    aliases: ["electrical rough in", "cabling", "prewire"],
  },
  {
    id: "electrical.fit-off",
    division: "electrical",
    label: "Electrical fit-off",
    plain:
      "Installing the visible electrical parts and making every circuit live and tested.",
    trade: "electrical_services",
    tier: "core",
    aliases: ["electrical fit off", "switch plates", "testing and certification"],
  },
  {
    id: "electrical.switchboard",
    division: "electrical",
    label: "Switchboard and safety switches",
    plain:
      "The home's electrical heart, with the safety switches and circuit protection the code requires.",
    trade: "electrical_services",
    tier: "core",
    aliases: ["switchboard", "rcbo", "main switch", "meter box"],
  },
  {
    id: "electrical.power-points",
    division: "electrical",
    label: "Power points",
    plain:
      "The general power outlets through the home, counted on the electrical plan.",
    trade: "electrical_services",
    tier: "core",
    aliases: ["gpo", "double power point", "usb outlet", "power point count"],
  },
  {
    id: "electrical.lighting-points",
    division: "electrical",
    label: "Lighting points and switching",
    plain:
      "The light positions and their switches, including two-way switching where the plan shows it.",
    trade: "electrical_services",
    tier: "core",
    aliases: ["light point", "batten point", "downlight", "two way switching", "dimmer"],
  },
  {
    id: "electrical.light-fittings",
    division: "electrical",
    label: "Light fittings supply",
    plain:
      "The actual fittings: downlights, pendants and wall lights, carried as prime cost items until you choose them.",
    trade: "electrical_services",
    tier: "core",
    allowance: "pc",
    aliases: ["light fittings pc", "pendants", "feature lighting", "led downlights"],
  },
  {
    id: "electrical.smoke-alarms",
    division: "electrical",
    label: "Smoke alarms",
    plain:
      "Interconnected smoke alarms in the positions the law requires.",
    trade: "electrical_services",
    tier: "core",
    aliases: ["interconnected smoke alarms", "photoelectric", "240v smoke detector"],
  },
  {
    id: "electrical.data-tv",
    division: "electrical",
    label: "Data, TV and communications points",
    plain:
      "Network and television points, plus the antenna, wired where screens and desks will live.",
    trade: "electrical_services",
    tier: "core",
    aliases: ["data point", "cat6", "tv point", "antenna"],
  },
  {
    id: "electrical.security-intercom",
    division: "electrical",
    label: "Security, CCTV and intercom provision",
    plain:
      "Prewiring or full fit-out for alarms, cameras and video intercoms.",
    trade: "electrical_services",
    tier: "conditional",
    allowance: "pc",
    aliases: ["alarm prewire", "cctv", "video intercom", "security system"],
  },
  {
    id: "electrical.ceiling-fans",
    division: "electrical",
    label: "Ceiling fans",
    plain:
      "Ceiling fans to bedrooms and living areas, supplied and installed.",
    trade: "electrical_services",
    tier: "conditional",
    allowance: "pc",
    aliases: ["ceiling fan", "fan with light"],
  },
  {
    id: "electrical.solar-pv",
    division: "electrical",
    label: "Solar power system",
    plain:
      "Rooftop solar panels and inverter, with battery provision if specified.",
    trade: "electrical_services",
    tier: "conditional",
    allowance: "pc",
    aliases: ["solar panels", "pv system", "inverter", "battery ready"],
  },
  {
    id: "electrical.ev-charger",
    division: "electrical",
    label: "Electric vehicle charging provision",
    plain:
      "The dedicated circuit, and optionally the charger, for an electric car in the garage.",
    trade: "electrical_services",
    tier: "conditional",
    aliases: ["ev charger", "ev provision", "32a circuit", "type 2"],
  },

  // ── 27 · hvac ─────────────────────────────────────────────────────
  {
    id: "hvac.ducted-system",
    division: "hvac",
    label: "Ducted heating and cooling",
    plain:
      "A whole-home ducted reverse cycle system, zoned so you condition only the rooms in use.",
    trade: "mechanical_services",
    tier: "alternative",
    allowance: "pc",
    aliases: ["ducted reverse cycle", "zoned aircon", "ducted ac", "refrigerated cooling"],
  },
  {
    id: "hvac.split-systems",
    division: "hvac",
    label: "Split system air conditioners",
    plain:
      "Individual wall units heating and cooling specific rooms.",
    trade: "mechanical_services",
    tier: "alternative",
    allowance: "pc",
    aliases: ["split system", "wall split", "multi head"],
  },
  {
    id: "hvac.hydronic-gas-heating",
    division: "hvac",
    label: "Hydronic and gas heating",
    plain:
      "Radiator or in-slab hydronic heating, or flued gas heaters, where the design calls for them.",
    trade: "mechanical_services",
    tier: "conditional",
    allowance: "pc",
    aliases: ["hydronic", "in slab heating", "radiators", "gas log fire"],
  },
  {
    id: "hvac.exhaust-fans",
    division: "hvac",
    label: "Exhaust fans and ducting",
    plain:
      "Bathroom, toilet and rangehood exhausts, ducted to outside air as the code requires.",
    trade: "mechanical_services",
    tier: "core",
    aliases: ["exhaust fan", "ducted to atmosphere", "rangehood duct", "ixl"],
  },
  {
    id: "hvac.ventilation-systems",
    division: "hvac",
    label: "Whole-home ventilation",
    plain:
      "Heat recovery or supply ventilation systems for airtight, energy-efficient homes.",
    trade: "mechanical_services",
    tier: "conditional",
    aliases: ["hrv", "erv", "mechanical ventilation", "fresh air system"],
  },
  {
    id: "hvac.fireplace",
    division: "hvac",
    label: "Fireplace and flue",
    plain:
      "A wood or gas fireplace with its flue, hearth and clearances built to the rules.",
    trade: "mechanical_services",
    tier: "conditional",
    allowance: "pc",
    aliases: ["wood heater", "gas fireplace", "flue kit", "hearth"],
  },

  // ── 28 · fire services (multi-dwelling) ───────────────────────────
  {
    id: "fire-services.sprinklers",
    division: "fire-services",
    label: "Fire sprinkler system",
    plain:
      "Sprinkler protection through the building where its class and height require it.",
    trade: "fire_protection_services",
    tier: "conditional",
    appliesTo: ["multi_dwelling"],
    aliases: ["fire sprinklers", "residential sprinklers", "fpaa101d"],
  },
  {
    id: "fire-services.hydrants-hose-reels",
    division: "fire-services",
    label: "Fire hydrants and hose reels",
    plain:
      "The hydrant boosters and hose reels firefighters rely on, tested and certified.",
    trade: "fire_protection_services",
    tier: "conditional",
    appliesTo: ["multi_dwelling"],
    aliases: ["fire hydrant", "booster", "hose reel"],
  },
  {
    id: "fire-services.fire-doors",
    division: "fire-services",
    label: "Fire rated doors and penetrations",
    plain:
      "Fire doors and sealed service penetrations that hold a fire inside its compartment.",
    trade: "fire_protection_services",
    tier: "conditional",
    appliesTo: ["multi_dwelling"],
    aliases: ["fire door", "fire collar", "fire dampers", "penetration sealing"],
  },
  {
    id: "fire-services.detection-ewis",
    division: "fire-services",
    label: "Fire detection and warning systems",
    plain:
      "The building-wide detection and occupant warning system beyond household smoke alarms.",
    trade: "fire_protection_services",
    tier: "conditional",
    appliesTo: ["multi_dwelling"],
    aliases: ["fire panel", "ewis", "fip", "detection system"],
  },
  {
    id: "fire-services.extinguishers-signage",
    division: "fire-services",
    label: "Extinguishers, blankets and exit signage",
    plain:
      "The portable fire equipment and illuminated exit signs common areas must carry.",
    trade: "fire_protection_services",
    tier: "conditional",
    appliesTo: ["multi_dwelling"],
    aliases: ["extinguisher", "fire blanket", "exit sign", "emergency lighting"],
  },

  // ── 29 · appliances ───────────────────────────────────────────────
  {
    id: "appliances.oven",
    division: "appliances",
    label: "Oven",
    plain:
      "The built-in oven, carried as a prime cost item until you choose the brand and model.",
    trade: "fixtures_and_fittings",
    tier: "core",
    allowance: "pc",
    aliases: ["wall oven", "600mm oven", "900mm oven", "pyrolytic"],
  },
  {
    id: "appliances.cooktop",
    division: "appliances",
    label: "Cooktop",
    plain:
      "The gas or induction cooktop, carried as a prime cost item until selected.",
    trade: "fixtures_and_fittings",
    tier: "core",
    allowance: "pc",
    aliases: ["induction cooktop", "gas cooktop", "900mm cooktop"],
  },
  {
    id: "appliances.rangehood",
    division: "appliances",
    label: "Rangehood",
    plain:
      "The rangehood over the cooktop, ducted outside, carried as a prime cost item.",
    trade: "fixtures_and_fittings",
    tier: "core",
    allowance: "pc",
    aliases: ["undermount rangehood", "canopy rangehood", "concealed rangehood"],
  },
  {
    id: "appliances.dishwasher",
    division: "appliances",
    label: "Dishwasher",
    plain:
      "The dishwasher, integrated or freestanding, carried as a prime cost item.",
    trade: "fixtures_and_fittings",
    tier: "core",
    allowance: "pc",
    aliases: ["integrated dishwasher", "dishdrawer"],
  },
  {
    id: "appliances.microwave-provision",
    division: "appliances",
    label: "Microwave and small appliance provision",
    plain:
      "The trim kit, shelf and point for a built-in microwave or appliance cupboard.",
    trade: "fixtures_and_fittings",
    tier: "conditional",
    allowance: "pc",
    aliases: ["microwave trim kit", "appliance cupboard"],
  },
  {
    id: "appliances.laundry-appliances",
    division: "appliances",
    label: "Laundry appliances",
    plain:
      "Washer and dryer where the build includes them, carried as prime cost items.",
    trade: "fixtures_and_fittings",
    tier: "conditional",
    allowance: "pc",
    aliases: ["washing machine", "dryer", "washer dryer combo"],
  },
  {
    id: "appliances.outdoor-kitchen",
    division: "appliances",
    label: "Outdoor kitchen appliances",
    plain:
      "The built-in barbecue and outdoor fridge where an alfresco kitchen is specified.",
    trade: "fixtures_and_fittings",
    tier: "conditional",
    allowance: "pc",
    aliases: ["built in bbq", "outdoor fridge", "alfresco kitchen"],
  },

  // ── 30 · external works ───────────────────────────────────────────
  {
    id: "external-works.driveway",
    division: "external-works",
    label: "Driveway",
    plain:
      "The driveway from street to garage, in plain, coloured or exposed aggregate concrete, including the council crossover.",
    trade: "external_works",
    tier: "core",
    aliases: ["exposed aggregate", "coloured concrete", "crossover", "layback"],
  },
  {
    id: "external-works.paths-paving",
    division: "external-works",
    label: "Paths and paving",
    plain:
      "Concrete paths and paved areas around the home.",
    trade: "external_works",
    tier: "core",
    aliases: ["concrete path", "pavers", "stepping stones", "porcelain paving"],
  },
  {
    id: "external-works.deck",
    division: "external-works",
    label: "Timber and composite decks",
    plain:
      "The deck structure and boards, in hardwood or composite, with its footings.",
    trade: "external_works",
    tier: "conditional",
    aliases: ["merbau deck", "spotted gum decking", "composite decking", "deck subframe"],
  },
  {
    id: "external-works.pergola-alfresco",
    division: "external-works",
    label: "Pergolas and alfresco ceilings",
    plain:
      "Roofed outdoor structures and the lined ceiling of the alfresco under the main roof.",
    trade: "external_works",
    tier: "conditional",
    aliases: ["pergola", "alfresco lining", "insulated patio roof", "vergola"],
  },
  {
    id: "external-works.fencing",
    division: "external-works",
    label: "Fencing",
    plain:
      "Boundary and feature fencing, from timber paling to aluminium slat, with half-share notes where boundaries are shared.",
    trade: "external_works",
    tier: "conditional",
    allowance: "ps",
    aliases: ["paling fence", "colorbond fence", "slat fence", "boundary fence"],
  },
  {
    id: "external-works.gates",
    division: "external-works",
    label: "Gates and automation",
    plain:
      "Pedestrian and driveway gates, with motors where automated.",
    trade: "external_works",
    tier: "conditional",
    allowance: "pc",
    aliases: ["sliding gate", "swing gate", "gate motor", "pedestrian gate"],
  },
  {
    id: "external-works.letterbox-clothesline",
    division: "external-works",
    label: "Letterbox and clothesline",
    plain:
      "The letterbox and the clothesline, small items the handover checklist always finds.",
    trade: "external_works",
    tier: "core",
    aliases: ["letterbox", "clothesline", "fold down line"],
  },
  {
    id: "external-works.external-lighting",
    division: "external-works",
    label: "External and garden lighting",
    plain:
      "Lighting to the facade, alfresco, paths and garden beds.",
    trade: "electrical_services",
    tier: "core",
    allowance: "pc",
    aliases: ["garden lights", "up lights", "step lights", "facade lighting"],
  },
  {
    id: "external-works.balcony-structures",
    division: "external-works",
    label: "Balconies and external terraces",
    plain:
      "The structure and finish of balconies and terraces off upper rooms.",
    trade: "external_works",
    tier: "conditional",
    aliases: ["balcony", "terrace", "juliet balcony"],
  },

  // ── 31 · landscaping and pool ─────────────────────────────────────
  {
    id: "landscaping.soft-landscaping",
    division: "landscaping",
    label: "Garden beds and planting",
    plain:
      "Soil, plants and mulch, carried as a provisional sum until a landscape design exists.",
    trade: "external_works",
    tier: "conditional",
    allowance: "ps",
    aliases: ["planting", "garden beds", "mulch", "landscape allowance"],
  },
  {
    id: "landscaping.turf",
    division: "landscaping",
    label: "Turf and lawn areas",
    plain:
      "Prepared and laid lawn, natural or synthetic.",
    trade: "external_works",
    tier: "conditional",
    allowance: "ps",
    aliases: ["turf", "sir walter", "synthetic grass", "artificial lawn"],
  },
  {
    id: "landscaping.irrigation",
    division: "landscaping",
    label: "Irrigation",
    plain:
      "Watering systems to lawns and beds, from simple drippers to automated zones.",
    trade: "external_works",
    tier: "conditional",
    allowance: "ps",
    aliases: ["drip line", "pop up sprinklers"],
  },
  {
    id: "landscaping.pool",
    division: "landscaping",
    label: "Swimming pool and spa",
    plain:
      "The pool itself: shell, filtration and finishes, carried as a provisional sum until the pool design is settled.",
    trade: "external_works",
    tier: "conditional",
    allowance: "ps",
    aliases: ["concrete pool", "fibreglass pool", "plunge pool", "spa"],
  },
  {
    id: "landscaping.pool-fencing",
    division: "landscaping",
    label: "Pool fencing and compliance",
    plain:
      "The compliant barrier around any pool, glass or aluminium, certified before water goes in.",
    trade: "external_works",
    tier: "conditional",
    aliases: ["glass pool fence", "pool barrier", "pool certificate"],
  },
  {
    id: "landscaping.pool-plant",
    division: "landscaping",
    label: "Pool plant, filtration and heating",
    plain:
      "The machinery that runs the pool: filtration, pumps, sanitation, heating, controls and the electrical bonding that makes it safe, with its plant space and commissioning.",
    trade: "external_works",
    tier: "conditional",
    allowance: "ps",
    aliases: [
      "pool filtration",
      "pool pump",
      "pool heating",
      "pool equipment",
      "pool plant room",
      "chlorinator",
      "pool bonding",
      "skimmer",
      "backwash",
    ],
  },
  {
    id: "landscaping.tree-protection",
    division: "landscaping",
    label: "Tree protection and arborist controls",
    plain:
      "Protecting the trees that stay: arborist reports, protection-zone fencing, root-sensitive digging near them and the supervision the council's permit requires.",
    trade: "external_works",
    tier: "conditional",
    aliases: [
      "tree protection zone",
      "tpz",
      "srz",
      "tree protection management plan",
      "tpmp",
      "arborist report",
      "arborist supervision",
      "root barrier",
    ],
  },
  {
    id: "landscaping.water-features",
    division: "landscaping",
    label: "Water features and ponds",
    plain:
      "Decorative water elements, carried as a provisional sum until designed.",
    trade: "external_works",
    tier: "conditional",
    allowance: "ps",
    aliases: ["water feature", "pond", "water wall"],
  },
  {
    id: "landscaping.planter-boxes",
    division: "landscaping",
    label: "Built planter boxes",
    plain:
      "Masonry or steel planters built as part of the landscape, drained and waterproofed.",
    trade: "external_works",
    tier: "conditional",
    aliases: ["planter box", "corten planter", "raised beds"],
  },

  // ── late additions: the items whose absence surprises owners ──────
  {
    id: "approvals.development-conditions",
    division: "approvals",
    label: "Planning permit condition compliance",
    plain:
      "The specific conditions your council attached to the approval, each one a piece of work or paperwork someone must do.",
    trade: "preliminaries",
    tier: "conditional",
    aliases: ["da conditions", "planning conditions", "condition 1", "prior to occupation"],
  },
  {
    id: "approvals.handover-documentation",
    division: "approvals",
    label: "Handover manuals and warranties",
    plain:
      "The pack you receive at the end: appliance manuals, warranties, certificates and maintenance guidance.",
    trade: "preliminaries",
    tier: "commercial",
    aliases: ["handover pack", "operation and maintenance", "warranty documentation", "as built"],
  },
  {
    id: "demolition.pest-damage-repair",
    division: "demolition",
    label: "Termite and rot damage rectification",
    plain:
      "Repairing hidden termite or rot damage found once walls open up, priced as an allowance because nobody can see it beforehand.",
    trade: "carpentry",
    tier: "conditional",
    appliesTo: ["renovation", "extension"],
    allowance: "ps",
    aliases: ["termite damage", "rot repair", "replace damaged timbers", "latent conditions"],
  },
  {
    id: "demolition.temporary-weather-protection",
    division: "demolition",
    label: "Temporary weather protection",
    plain:
      "Tarps and temporary roofing that keep your home dry while it is opened up in stages.",
    trade: "preliminaries",
    tier: "conditional",
    appliesTo: ["renovation", "extension"],
    aliases: ["temporary roof", "tarp", "weather protection"],
  },
  {
    id: "earthworks.contaminated-soil",
    division: "earthworks",
    label: "Contaminated soil management",
    plain:
      "Testing and disposing of contaminated soil if the dig finds it, an allowance because tips charge by what the soil contains.",
    trade: "ground_works",
    tier: "conditional",
    allowance: "ps",
    aliases: ["contaminated fill", "asbestos in soil", "classification testing", "vendec"],
  },
  {
    id: "site-services.sewer-pump",
    division: "site-services",
    label: "Sewer pump station",
    plain:
      "A pump system where the home sits below the sewer and gravity cannot do the job.",
    trade: "hydraulic_services",
    tier: "conditional",
    aliases: ["pump station", "macerator", "pressure sewer", "grinder pump"],
  },
  {
    id: "site-services.fire-main-connection",
    division: "site-services",
    label: "Fire service water connection",
    plain:
      "The dedicated water connection sized for the building's fire systems.",
    trade: "fire_protection_services",
    tier: "conditional",
    appliesTo: ["multi_dwelling"],
    aliases: ["fire main", "fire service connection"],
  },
  {
    id: "footings-slab.slab-edge-insulation",
    division: "footings-slab",
    label: "Slab and edge insulation",
    plain:
      "Insulation under or around the slab edge, increasingly required to hit higher energy ratings.",
    trade: "concrete_work",
    tier: "conditional",
    aliases: ["waffle pod insulation", "edge insulation", "under slab insulation", "thermal break"],
  },
  {
    id: "footings-slab.restumping",
    division: "footings-slab",
    label: "Restumping and releveling",
    plain:
      "Replacing failed stumps under an existing floor and bringing it back to level.",
    trade: "carpentry",
    tier: "conditional",
    appliesTo: ["renovation", "extension"],
    allowance: "ps",
    aliases: ["restump", "reblock", "relevel", "jack and pack"],
  },
  {
    id: "external-walls.feature-stone",
    division: "external-walls",
    label: "Feature stone cladding",
    plain:
      "Natural or manufactured stone as a facade feature, carried as a prime cost item until the stone is chosen.",
    trade: "stonework",
    tier: "conditional",
    allowance: "pc",
    aliases: ["stone cladding", "stack stone", "travertine cladding", "stone veneer"],
  },
  {
    id: "windows.window-furnishings",
    division: "windows",
    label: "Window furnishings",
    plain:
      "Blinds, curtains and shutters. Often excluded from building contracts, so this line makes the answer explicit either way.",
    trade: "fixtures_and_fittings",
    tier: "conditional",
    allowance: "pc",
    aliases: ["blinds", "roller blinds", "plantation shutters", "curtains", "sheer curtains"],
  },
  {
    id: "plumbing.bathroom-accessories",
    division: "plumbing",
    label: "Bathroom accessories",
    plain:
      "Towel rails, toilet roll holders, robe hooks and shelves, carried as prime cost items until selected.",
    trade: "fixtures_and_fittings",
    tier: "core",
    allowance: "pc",
    aliases: ["towel rail", "heated towel rail", "toilet roll holder", "robe hook", "accessories pc"],
  },
  {
    id: "plumbing.water-filtration",
    division: "plumbing",
    label: "Water filtration",
    plain:
      "A filtered drinking water tap or whole-home filtration where specified.",
    trade: "hydraulic_services",
    tier: "conditional",
    allowance: "pc",
    aliases: ["water filter", "filtered tap", "zip tap", "under sink filter"],
  },
  {
    id: "joinery.mirror-cabinets",
    division: "joinery",
    label: "Mirrored shaving cabinets",
    plain:
      "The mirrored storage cabinets above vanities, recessed or surface mounted.",
    trade: "joinery",
    tier: "conditional",
    allowance: "pc",
    aliases: ["shaving cabinet", "mirror cabinet", "recessed cabinet"],
  },
  {
    id: "electrical.underfloor-heating",
    division: "electrical",
    label: "Electric underfloor heating",
    plain:
      "Heated floors in bathrooms or living areas, laid under the tiles with a wall thermostat.",
    trade: "electrical_services",
    tier: "conditional",
    allowance: "pc",
    aliases: ["underfloor heating", "undertile heating", "heated floor"],
  },
  {
    id: "electrical.home-automation",
    division: "electrical",
    label: "Home automation provision",
    plain:
      "Smart switching, hubs and the wiring that lets the home be controlled from a phone.",
    trade: "electrical_services",
    tier: "conditional",
    allowance: "pc",
    aliases: ["smart home", "cbus", "automation", "smart switches"],
  },
  {
    id: "electrical.separate-metering",
    division: "electrical",
    label: "Separate metering per dwelling",
    plain:
      "Individual power and water metering so each dwelling pays its own way.",
    trade: "electrical_services",
    tier: "core",
    appliesTo: ["multi_dwelling"],
    aliases: ["separate meters", "sub metering", "individual metering"],
  },
  {
    id: "hvac.ducted-vacuum",
    division: "hvac",
    label: "Ducted vacuum system",
    plain:
      "A built-in vacuum system with wall inlets through the home.",
    trade: "mechanical_services",
    tier: "conditional",
    allowance: "pc",
    aliases: ["ducted vacuum", "vacuum inlets", "hide a hose"],
  },
  {
    id: "external-works.privacy-screens",
    division: "external-works",
    label: "Privacy and overlooking screens",
    plain:
      "Fixed screens to windows and balconies where planning rules protect neighbours from being overlooked.",
    trade: "metalwork",
    tier: "conditional",
    aliases: ["overlooking screen", "privacy screen", "obscure screen", "highlight screening"],
  },
  {
    id: "external-works.retaining-garden",
    division: "external-works",
    label: "Garden edging and low retaining",
    plain:
      "The low garden walls and edging under a metre that shape beds and lawns.",
    trade: "external_works",
    tier: "conditional",
    allowance: "ps",
    aliases: ["garden edging", "low retaining", "garden wall"],
  },
  {
    id: "landscaping.landscape-plan-compliance",
    division: "landscaping",
    label: "Landscape plan compliance works",
    plain:
      "The specific planting and works your planning approval's landscape plan requires before sign-off.",
    trade: "external_works",
    tier: "conditional",
    allowance: "ps",
    aliases: ["landscape plan", "approved landscape", "street tree"],
  },
];

/**
 * Sets where choosing one member settles the rest.
 *
 * A house has a metal roof or a tiled one. The unchosen sibling is not
 * missing from the design, and raising it as a gap asks an owner about
 * a decision they already made. Only the whole group being absent is
 * ever a question, and even then only for the groups every project must
 * answer.
 *
 * The membership lists are the ratified tiering table's, and every
 * member is tier "alternative" — a test holds the two in step, because
 * a member that drifted out of the tier would quietly start gapping
 * again.
 */
export const SCOPE_ALTERNATIVE_GROUPS: ScopeAlternativeGroup[] = [
  {
    id: "sewage-disposal",
    label: "Sewage disposal",
    members: ["site-services.sewer-connection", "site-services.septic-treatment"],
    // Every house disposes of sewage somehow. Neither present is a
    // real hole, not a style choice nobody made.
    requiredWhenAllAbsent: true,
  },
  {
    id: "ground-floor-system",
    label: "Ground floor system",
    members: [
      "footings-slab.waffle-slab",
      "footings-slab.raft-slab",
      "footings-slab.strip-pad-footings",
      "footings-slab.subfloor-timber",
    ],
    // Strip and pad footings pair with the timber subfloor path; the
    // slabs stand alone. Every building stands on something, so all
    // four absent is a genuine hole.
    requiredWhenAllAbsent: true,
  },
  {
    id: "roof-structure",
    label: "Roof structure",
    members: ["framing.roof-trusses", "framing.stick-roof"],
    requiredWhenAllAbsent: true,
  },
  {
    id: "roof-covering",
    label: "Roof covering",
    members: ["roofing.metal-roof", "roofing.tile-roof"],
    requiredWhenAllAbsent: true,
  },
  {
    id: "external-wall-system",
    label: "External wall system",
    members: [
      "external-walls.brick-veneer",
      "external-walls.double-brick",
      "external-walls.blockwork",
      "external-walls.fc-cladding",
      "external-walls.metal-cladding",
      "external-walls.timber-composite-cladding",
      "external-walls.lightweight-panel",
    ],
    requiredWhenAllAbsent: true,
  },
  {
    id: "window-system",
    label: "Window system",
    members: ["windows.aluminium-windows", "windows.timber-composite-windows"],
    requiredWhenAllAbsent: true,
  },
  {
    id: "wall-ceiling-junction",
    label: "Wall and ceiling junction",
    members: ["lining.cornice", "lining.square-set"],
    requiredWhenAllAbsent: true,
  },
  {
    id: "hard-floor-finish",
    label: "Hard floor finish",
    members: [
      "flooring.engineered-timber",
      "flooring.laminate-hybrid",
      "flooring.polished-concrete",
    ],
    // A tile-throughout home satisfies this from the tiling division
    // instead, so all three absent is not by itself a hole.
    requiredWhenAllAbsent: false,
  },
  {
    id: "climate-system",
    label: "Climate system",
    members: ["hvac.ducted-system", "hvac.split-systems"],
    requiredWhenAllAbsent: false,
  },
];
