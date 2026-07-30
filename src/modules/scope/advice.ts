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
