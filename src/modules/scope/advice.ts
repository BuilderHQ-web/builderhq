/**
 * Scope advice — pure judgement rules layered on the Scope Standard.
 *
 * Two kinds of judgement the pack review needs and the ontology can
 * ground honestly:
 *
 * WHO MAY SET AN ALLOWANCE. A client allowance locks a figure every
 * builder must carry, so it only belongs on lines a client can
 * sensibly cost: selections and cosmetic works (tapware, appliances,
 * tiles, joinery, landscaping). It must never be offered on
 * fundamentals — structure, ground works, preliminaries — where a
 * client's guess would distort every quote. The rule reads straight
 * off the Standard: prime-cost items are selections by definition;
 * provisional-sum items qualify only in the garden-and-joinery
 * divisions, never where the risk is structural.
 *
 * WHICH DOCUMENTS ARE WORTH ADDING. Deterministic advisories derived
 * from what the classifier saw versus what the evidence implies:
 * missing engineering, a joinery package the architect's plans only
 * gesture at, no soil report on a new build. Advice, never blockers.
 *
 * Pure and client-safe. No model calls: every rule is explainable to
 * a client in one sentence, which is the bar for advice that carries
 * the BuilderHQ name.
 */

import { getScopeItem } from "./index";

/* ── owner allowance eligibility ────────────────────────────────────── */

/** PS divisions where a client-set figure is still a sensible act. */
const PS_ALLOWANCE_DIVISIONS = new Set([
  "landscaping",
  "external-works",
  "joinery",
]);

/**
 * May the CLIENT lock an allowance on this line? Prime-cost items
 * always (they are selections: a client choosing to carry $8,000 of
 * appliances is pricing their own taste). Provisional sums only in
 * the cosmetic divisions. Everything else — structure, earthworks,
 * preliminaries, services — is the builders' to price.
 */
export function ownerAllowanceEligible(itemId: string): boolean {
  const item = getScopeItem(itemId);
  if (!item?.allowance) return false;
  if (item.allowance === "pc") return true;
  return PS_ALLOWANCE_DIVISIONS.has(item.division);
}

/* ── owner-suppliable documents ─────────────────────────────────────── */

/**
 * Approvals-division lines whose missing document is the CLIENT'S to
 * supply (or commission). Everything else in that division — permits
 * the builder obtains, occupancy certificates, handover manuals,
 * mandatory inspections — is builder work the tender itself asks
 * about, and must never be presented to a client as paperwork they
 * owe.
 */
export const OWNER_DOC_ITEMS = new Set([
  "approvals.soil-geotech",
  "approvals.engineering-design",
  "approvals.acoustic-report",
  "approvals.development-conditions",
  "approvals.bushfire-compliance",
  "approvals.energy-report",
]);

export function isOwnerDocGap(itemId: string): boolean {
  return OWNER_DOC_ITEMS.has(itemId);
}

/* ── document advisories ────────────────────────────────────────────── */

export interface DocumentAdvice {
  key: string;
  title: string;
  /** One plain sentence: why this document earns its place. */
  why: string;
  severity: "recommended" | "worth_noting";
}

export interface AdviceInput {
  /** Classifier kinds present on the register ("architectural", ...). */
  registerKinds: string[];
  /** Division ids with at least one evidenced line. */
  evidencedDivisions: string[];
  /**
   * Division id → the register kinds its evidence cites. Lets a rule
   * notice a division that exists ONLY on the architect's drawings.
   */
  divisionSources: Record<string, string[]>;
  projectType: string;
}

/**
 * The curated advisory list — deliberately short. Every rule is
 * deterministic and reads from the register and the evidence, so the
 * advice never speculates beyond what the pack itself shows.
 */
export function adviseMissingDocuments(input: AdviceInput): DocumentAdvice[] {
  const kinds = new Set(input.registerKinds);
  const evidenced = new Set(input.evidencedDivisions);
  const out: DocumentAdvice[] = [];
  const newBuild =
    input.projectType === "single_dwelling" ||
    input.projectType === "multi_dwelling";

  if (!kinds.has("structural")) {
    out.push({
      key: "structural",
      title: "Structural engineering drawings",
      why: "Footings, framing and steel are being priced from the architectural set alone. Certified engineering removes the assumptions builders would otherwise price in.",
      severity: "recommended",
    });
  }
  if (!kinds.has("soil") && newBuild) {
    out.push({
      key: "soil",
      title: "Soil report (geotechnical)",
      why: "Without a site classification, every builder must assume the ground conditions, and assumed ground is where prices move later.",
      severity: "recommended",
    });
  }
  if (!kinds.has("civil") && input.projectType === "multi_dwelling") {
    out.push({
      key: "civil",
      title: "Civil and stormwater design",
      why: "Multi-dwelling drainage usually needs its own engineered design; councils and builders both look for it.",
      severity: "recommended",
    });
  }
  if (!kinds.has("energy")) {
    out.push({
      key: "energy",
      title: "Energy assessment",
      why: "The NatHERS or equivalent report confirms what the thermal performance requires; without it, insulation and glazing are priced on assumption.",
      severity: "worth_noting",
    });
  }
  if (!kinds.has("specification")) {
    out.push({
      key: "specification",
      title: "Specifications and finishes schedule",
      why: "A written specification pins the products and finishes the drawings cannot, and cuts the allowances builders must otherwise carry.",
      severity: "worth_noting",
    });
  }
  if (!kinds.has("survey") && newBuild) {
    out.push({
      key: "survey",
      title: "Feature and level survey",
      why: "Set-out and site levels come from the survey; builders price siteworks with more certainty when it is in the set.",
      severity: "worth_noting",
    });
  }

  // The joinery-package rule: kitchens and cabinetry evidenced, but
  // every citation points at the architectural drawings. The intent
  // is real; the detail a joiner prices from is not in the set.
  const joinerySources = input.divisionSources["joinery"] ?? [];
  if (
    evidenced.has("joinery") &&
    joinerySources.length > 0 &&
    joinerySources.every((k) => k === "architectural")
  ) {
    out.push({
      key: "joinery-package",
      title: "Joinery package",
      why: "Your cabinetry appears only on the architectural drawings. A joinery package with elevations and finishes lets builders price it exactly rather than by allowance.",
      severity: "worth_noting",
    });
  }

  // Same shape for windows: schedules beat floor-plan symbols.
  const windowSources = input.divisionSources["windows"] ?? [];
  if (
    evidenced.has("windows") &&
    windowSources.length > 0 &&
    windowSources.every((k) => k === "architectural") &&
    !kinds.has("specification")
  ) {
    out.push({
      key: "window-schedule",
      title: "Window and door schedule",
      why: "Windows are drawn but not scheduled. Sizes, glazing and frames in a schedule tighten every quote's biggest openings line.",
      severity: "worth_noting",
    });
  }

  return out;
}

/* ── what the OWNER is actually asked ───────────────────────────────── */

/**
 * The demolition division earns one simple question on renovations
 * and extensions: is the builder demolishing, or has the client
 * arranged it separately? Two answers, both already in the
 * vocabulary (builders price it / excluded).
 */
export function isDemolitionGap(itemId: string): boolean {
  return getScopeItem(itemId)?.division === "demolition";
}

/**
 * Does this gap need the CLIENT at all? Three shapes do:
 * a cosmetic selection (allowance packages), a client-suppliable
 * document, or the demolition question. EVERYTHING else is builders'
 * work: it auto-resolves to builder-priced at ops approval and is
 * shown to the client as information, never as a task.
 */
export function isOwnerAskableGap(itemId: string): boolean {
  return (
    ownerAllowanceEligible(itemId) ||
    isOwnerDocGap(itemId) ||
    isDemolitionGap(itemId)
  );
}

/* ── allowance packages ─────────────────────────────────────────────── */

/**
 * The cosmetic gaps, grouped the way real tenders group them: one
 * package, one figure, one decision. A client answers "Appliances"
 * once instead of oven, cooktop, rangehood and dishwasher four times;
 * the figure distributes across the constituent lines by weight so
 * every builder still prices the same per-line schedule.
 *
 * Benchmarks are stated as a share of the build budget — honest
 * industry rules of thumb for Australian residential work, shown to
 * the client AS guidance and never applied without their tap.
 */
export interface AllowancePackageDef {
  key: string;
  title: string;
  /** One sentence of what the package covers, client-grade. */
  covers: string;
  /** Which gap item ids fold into this package. */
  match: (itemId: string) => boolean;
  /** Typical share of build budget, as a [low, high] percent range. */
  pctRange: [number, number];
  /**
   * Relative weights for splitting the package figure across specific
   * items; unlisted items share equally in the remainder.
   */
  weights?: Record<string, number>;
}

const div = (itemId: string) => getScopeItem(itemId)?.division ?? "";

/*
 * CALIBRATION BASIS (reviewed 2026-07). Ranges are shares of the
 * CONSTRUCTION budget for a documented mid-range Australian
 * residential build, assembled from published industry material:
 * HIA kitchens and bathrooms reporting (average new kitchen $26k to
 * $35k installed; bathroom fitout supply $4k to $8k per room),
 * elemental cost-proportion guides of the Rawlinsons kind (finishes
 * and fitout at 25 to 30 percent of new-build cost, higher on
 * renovations), and prevailing supply rates (floor coverings $70 to
 * $160 per square metre laid; tile supply $30 to $90 per square
 * metre; landscaping guidance of 5 to 10 percent of property value,
 * carried here as 4 to 7 percent of build cost). Worked example on a
 * $750k single dwelling: kitchen $30k + vanities $8k + robes $12k +
 * laundry $4k lands joinery at 7 percent. Every figure is guidance a
 * client adjusts, never a number applied for them.
 */
export const ALLOWANCE_PACKAGES: AllowancePackageDef[] = [
  {
    key: "joinery",
    title: "Joinery and cabinetry",
    covers: "Kitchen, vanities, robes, laundry and built-in cabinetry.",
    match: (id) => div(id) === "joinery",
    pctRange: [5, 8],
    weights: {
      "joinery.benchtops": 3,
      "joinery.vanities": 2,
      "joinery.robe-fitouts": 2,
      "joinery.laundry-joinery": 1,
    },
  },
  {
    key: "appliances",
    title: "Appliances",
    covers: "Ovens, cooktops, rangehoods, dishwashers and laundry appliances.",
    match: (id) => div(id) === "appliances",
    pctRange: [1, 2.5],
    weights: {
      "appliances.oven": 3,
      "appliances.cooktop": 2,
      "appliances.dishwasher": 2,
      "appliances.rangehood": 1,
    },
  },
  {
    key: "plumbing-fixtures",
    title: "Bathroom fittings and fixtures",
    covers: "Tapware, sanitary fixtures, shower screens and accessories.",
    match: (id) => div(id) === "plumbing" && ownerAllowanceEligible(id),
    pctRange: [1.5, 3],
    weights: {
      "plumbing.sanitary-fixtures": 3,
      "plumbing.tapware": 2,
    },
  },
  {
    key: "electrical-fittings",
    title: "Light fittings and electrical extras",
    covers: "Feature lighting, fans and the electrical comforts you choose.",
    match: (id) => div(id) === "electrical" && ownerAllowanceEligible(id),
    pctRange: [0.75, 2],
  },
  {
    key: "flooring",
    title: "Floor coverings",
    covers: "Floorboards, carpet, engineered timber and laminate to the areas the drawings show.",
    match: (id) => div(id) === "flooring",
    pctRange: [2, 3.5],
  },
  {
    key: "tiling",
    title: "Tile selections",
    covers: "The tiles themselves; laying is priced by the builders.",
    match: (id) => div(id) === "tiling" && ownerAllowanceEligible(id),
    pctRange: [0.75, 1.5],
  },
  {
    key: "doors-hardware",
    title: "Doors and hardware",
    covers: "Entry and internal door selections, handles and hardware.",
    match: (id) =>
      (div(id) === "internal-doors" || div(id) === "external-doors") &&
      ownerAllowanceEligible(id),
    pctRange: [1, 2],
  },
  {
    key: "stairs-features",
    title: "Staircase features",
    covers: "Balustrades, screens and feature stair elements.",
    match: (id) => div(id) === "stairs" && ownerAllowanceEligible(id),
    pctRange: [1, 2],
  },
  {
    key: "hvac-comfort",
    title: "Heating and cooling comforts",
    covers: "Fireplaces and the comfort systems you select.",
    match: (id) => div(id) === "hvac" && ownerAllowanceEligible(id),
    pctRange: [1, 2.5],
  },
  {
    key: "landscaping",
    title: "Landscaping",
    covers: "Gardens, turf, irrigation and the outdoor finish.",
    match: (id) => div(id) === "landscaping" && ownerAllowanceEligible(id),
    pctRange: [4, 7],
  },
  {
    key: "external-features",
    title: "External features",
    covers: "Fencing, gates, external lighting and garden structures.",
    match: (id) => div(id) === "external-works" && ownerAllowanceEligible(id),
    pctRange: [1.5, 3],
  },
  {
    key: "feature-finishes",
    title: "Feature finishes",
    covers: "Feature stone, skylights, window furnishings and the like.",
    match: (id) => ownerAllowanceEligible(id),
    pctRange: [0.75, 2],
  },
];

/** Midpoints of the wizard's budget bands, whole AUD. */
export const BUDGET_BAND_MIDPOINT: Record<string, number> = {
  under_500k: 400_000,
  "500k_1m": 750_000,
  "1m_1_5m": 1_250_000,
  "1_5m_2m": 1_750_000,
  "2m_3m": 2_500_000,
  "3m_5m": 4_000_000,
  over_5m: 6_000_000,
};

export interface AllowancePackage {
  key: string;
  title: string;
  covers: string;
  itemIds: string[];
  pctRange: [number, number];
  /** Suggested whole-AUD figure, when a budget band is known. */
  suggestedAud: number | null;
  /** "around $1.75m" — the budget the suggestion was drawn from. */
  budgetLabel: string | null;
}

function roundAllowance(n: number): number {
  if (n >= 20_000) return Math.round(n / 1000) * 1000;
  if (n >= 2_000) return Math.round(n / 500) * 500;
  return Math.max(100, Math.round(n / 100) * 100);
}

function budgetLabel(mid: number): string {
  return mid >= 1_000_000
    ? `around $${(mid / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}m`
    : `around $${Math.round(mid / 1000)}k`;
}

/**
 * Fold the cosmetic gaps into packages, first match wins, and price
 * the suggestion from the budget band. No band, no dollar figure —
 * the percent guidance still shows and the input stays open.
 */
/**
 * Finishes and selections carry a larger share of renovation and
 * extension budgets than of new-build budgets (elemental breakdowns
 * put fitout near 35 to 45 percent of renovation cost against 25 to
 * 30 on new work), so suggestions scale up accordingly.
 */
const TYPE_FACTOR: Record<string, number> = {
  renovation: 1.25,
  extension: 1.15,
};

export function buildAllowancePackages(
  gapItemIds: string[],
  budgetBand: string | null,
  projectType: string | null = null,
): AllowancePackage[] {
  const factor = (projectType && TYPE_FACTOR[projectType]) || 1;
  const mid = budgetBand ? (BUDGET_BAND_MIDPOINT[budgetBand] ?? null) : null;
  const eligible = gapItemIds.filter((id) => ownerAllowanceEligible(id));
  const taken = new Set<string>();
  const out: AllowancePackage[] = [];
  for (const def of ALLOWANCE_PACKAGES) {
    const itemIds = eligible.filter((id) => !taken.has(id) && def.match(id));
    if (itemIds.length === 0) continue;
    for (const id of itemIds) taken.add(id);
    const midPct = (def.pctRange[0] + def.pctRange[1]) / 2;
    out.push({
      key: def.key,
      title: def.title,
      covers: def.covers,
      itemIds,
      pctRange: def.pctRange,
      suggestedAud:
        mid !== null ? roundAllowance((mid * midPct * factor) / 100) : null,
      budgetLabel: mid !== null ? budgetLabel(mid) : null,
    });
  }
  return out;
}

/**
 * Split a package figure across its lines by weight, whole dollars,
 * remainder on the heaviest line so the parts always sum exactly.
 */
export function splitPackageAmount(
  packageKey: string,
  itemIds: string[],
  totalAud: number,
): Array<{ itemId: string; amountAud: number }> {
  const def = ALLOWANCE_PACKAGES.find((d) => d.key === packageKey);
  const weights = itemIds.map((id) => def?.weights?.[id] ?? 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const parts = itemIds.map((id, i) => ({
    itemId: id,
    amountAud: Math.floor((totalAud * weights[i]!) / totalWeight),
  }));
  const allocated = parts.reduce((a, p) => a + p.amountAud, 0);
  if (parts.length > 0 && allocated !== totalAud) {
    let heaviest = 0;
    for (let i = 1; i < parts.length; i++) {
      if (weights[i]! > weights[heaviest]!) heaviest = i;
    }
    parts[heaviest]!.amountAud += totalAud - allocated;
  }
  return parts;
}
