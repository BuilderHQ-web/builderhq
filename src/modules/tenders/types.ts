/**
 * tenders · public types.
 *
 * Domain-level types exposed to consumers (UI, server actions).
 * DB row types live in schema.ts and are re-exported through index.ts.
 */

import type { TenderRow, TenderCostLineRow } from "./schema";
import type { TradeId } from "./trades";

export type Tender = TenderRow;
export type TenderCostLine = TenderCostLineRow;

/** Tender + its cost lines, joined for display. */
export type TenderWithLines = Tender & {
  costLines: TenderCostLine[];
};

/** Tender + cost lines + builder-side metadata for owner comparison. */
export type TenderForOwner = TenderWithLines & {
  builder: {
    id: string;
    name: string | null;
    companyName: string | null;
    initials: string;
    /** Public profile slug — present once the builder finishes onboarding. */
    slug: string | null;
  };
  documentCount: number;
};

/** Patch applied during autosave. Every field optional. */
export type UpdateTenderInput = Partial<{
  totalPriceAud: number | null;
  durationWeeks: number | null;
  validityDays: number | null;
  proposedStartMonth: string | null;
  exclusions: string[] | null;
  conditions: string | null;
  pitch: string | null;
}>;

/** Single cost-line in a SetCostLines payload. */
export type CostLineInput = {
  trade: TradeId;
  amountAud: number;
  /** Required when trade === "other"; ignored otherwise. */
  label?: string;
};

/**
 * Submission validation report. The form renders this live so the
 * builder sees what's missing without having to click submit.
 */
export type SubmissionReadiness = {
  canSubmit: boolean;
  missing: Array<"total_price" | "duration" | "validity">;
  /** Variance between cost-breakdown sum and tender total, in AUD.
   *  Zero or null = balanced or breakdown empty. Positive = breakdown
   *  exceeds total, negative = breakdown is short. */
  variance: number | null;
};
