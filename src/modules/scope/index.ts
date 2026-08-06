/**
 * @module scope
 *
 * The Scope Standard: BuilderHQ's fixed vocabulary of Australian
 * residential construction. Client-safe — pure data and pure
 * functions, no DB, no server-only imports. The extraction pipeline,
 * the ops review surface, the owner review, the instrument's scope
 * module and the browse overview all speak THIS vocabulary.
 */

import {
  SCOPE_DIVISIONS,
  SCOPE_ITEMS,
  SCOPE_STANDARD_VERSION,
} from "./ontology";
import type {
  AllowanceClass,
  ScopeDivision,
  ScopeItem,
  ScopeProjectType,
  ScopeSelectionEntry,
} from "./types";

export { SCOPE_DIVISIONS, SCOPE_ITEMS, SCOPE_STANDARD_VERSION };
export type {
  AllowanceClass,
  ScopeDivision,
  ScopeItem,
  ScopeProjectType,
  ScopeSelectionEntry,
};

const DIVISION_BY_ID = new Map(SCOPE_DIVISIONS.map((d) => [d.id, d]));
const ITEM_BY_ID = new Map(SCOPE_ITEMS.map((i) => [i.id, i]));

export function getScopeDivision(id: string): ScopeDivision | null {
  return DIVISION_BY_ID.get(id) ?? null;
}

export function getScopeItem(id: string): ScopeItem | null {
  return ITEM_BY_ID.get(id) ?? null;
}

/** Items of one division, in authored order. */
export function itemsForDivision(divisionId: string): ScopeItem[] {
  return SCOPE_ITEMS.filter((i) => i.division === divisionId);
}

function appliesTo(
  entry: { appliesTo?: ScopeProjectType[] },
  type: ScopeProjectType,
): boolean {
  return !entry.appliesTo || entry.appliesTo.includes(type);
}

/** Divisions applicable to a project type, in build order. */
export function divisionsFor(type: ScopeProjectType): ScopeDivision[] {
  return SCOPE_DIVISIONS.filter((d) => appliesTo(d, type)).sort(
    (a, b) => a.order - b.order,
  );
}

/**
 * The candidate vocabulary for one project type: every item whose own
 * applicability AND whose division's applicability include the type.
 * This is the pool extraction searches and gap detection measures
 * against — a project's instantiated selection is a SUBSET of this.
 */
export function itemsFor(type: ScopeProjectType): ScopeItem[] {
  const divisionIds = new Set(divisionsFor(type).map((d) => d.id));
  return SCOPE_ITEMS.filter(
    (i) => divisionIds.has(i.division) && appliesTo(i, type),
  );
}

/** Classic allowance candidates for a type — the starting point for
 *  an owner's PS/PC schedule. */
export function allowanceCandidatesFor(
  type: ScopeProjectType,
  klass?: AllowanceClass,
): ScopeItem[] {
  return itemsFor(type).filter((i) =>
    klass ? i.allowance === klass : i.allowance != null,
  );
}

/** Library shape summary — powers the validator and any admin view. */
export function scopeStats(): {
  version: string;
  divisions: number;
  items: number;
  byType: Record<ScopeProjectType, number>;
  pcItems: number;
  psItems: number;
} {
  const types: ScopeProjectType[] = [
    "single_dwelling",
    "multi_dwelling",
    "renovation",
    "extension",
  ];
  return {
    version: SCOPE_STANDARD_VERSION,
    divisions: SCOPE_DIVISIONS.length,
    items: SCOPE_ITEMS.length,
    byType: Object.fromEntries(
      types.map((t) => [t, itemsFor(t).length]),
    ) as Record<ScopeProjectType, number>,
    pcItems: SCOPE_ITEMS.filter((i) => i.allowance === "pc").length,
    psItems: SCOPE_ITEMS.filter((i) => i.allowance === "ps").length,
  };
}

// The golden set — label format + pure scorer for the extraction
// pipeline's permanent report card. Packages live in
// eval/scope-golden/; see its README for the intake process.
export {
  scoreGoldenPackage,
  aggregateGoldenScores,
} from "./golden";
export type {
  GoldenPackage,
  GoldenExpectedDocument,
  GoldenExpectedItem,
  ExtractionResultForScoring,
  GoldenScore,
} from "./golden";

export {
  ownerAllowanceEligible,
  isOwnerDocGap,
  isDemolitionGap,
  isOwnerAskableGap,
  adviseMissingDocuments,
  buildAllowancePackages,
  splitPackageAmount,
  coveredSelectionPackages,
  selectionPackageKey,
  OWNER_DOC_ITEMS,
  ALLOWANCE_PACKAGES,
  BUDGET_BAND_MIDPOINT,
  type DocumentAdvice,
  type AdviceInput,
  type AllowancePackage,
  type AllowancePackageDef,
  type RegisterDocSignal,
} from "./advice";

export {
  DIVISION_GROUPS,
  groupPackDivisions,
  type ScopeGroup,
} from "./groups";

export {
  DOC_KIND_STANDARD_NAME,
  DOC_KIND_ORDER,
  registerImportance,
  standardDocumentName,
  resolveRegisterNames,
} from "./doc-names";
