/**
 * Shared shapes for the mobile tender composer.
 *
 * Mirrors the JSON returned by every /api/mobile/tenders/* endpoint
 * (createDraft, get, patch, set-cost-lines, submit). One type → one
 * shape across every roundtrip.
 */

export interface TenderCostLine {
  id: string;
  trade: string;
  label: string | null;
  amountAud: number;
  sortOrder: number;
}

export interface TenderReadiness {
  canSubmit: boolean;
  /** Subset of "total_price" | "duration" | "validity". */
  missing: string[];
  /** Null when no breakdown rows. Otherwise sum(lines) - totalPriceAud. */
  variance: number | null;
}

export interface TenderPayload {
  id: string;
  projectId: string;
  builderId: string;
  status: string;
  totalPriceAud: number | null;
  durationWeeks: number | null;
  validityDays: number | null;
  proposedStartMonth: string | null;
  exclusions: string[] | null;
  conditions: string | null;
  pitch: string | null;
  costLines: TenderCostLine[];
  readiness: TenderReadiness;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

/** The full set of patchable fields the autosave dispatches. */
export interface TenderPatch {
  totalPriceAud?: number | null;
  durationWeeks?: number | null;
  validityDays?: 7 | 14 | 30 | 60 | 90 | null;
  proposedStartMonth?: string | null;
  exclusions?: string[] | null;
  conditions?: string | null;
  pitch?: string | null;
}

export interface CostLineInput {
  trade: string;
  amountAud: number;
  label?: string;
}
