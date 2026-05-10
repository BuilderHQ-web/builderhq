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
    /**
     * Years the builder business has been operating, as declared on
     * their profile. Optional — newer accounts may not have it set.
     */
    yearsInOperation: number | null;
    /** Business state (e.g. VIC) — used to indicate location match
     *  with the project. */
    state: string | null;
    /**
     * Verification snapshot at list time. ABN active in ABR + ≥1
     * builder licence verified active in the relevant state register.
     * Drives the trust chips on each tender card.
     */
    abnVerified: boolean;
    anyLicenceVerified: boolean;
    /** Total awarded tenders this builder has on the platform. Useful
     *  proof-of-track-record signal — "Won 3 projects on BuilderHQ". */
    awardedCount: number;
  };
  documentCount: number;
  /**
   * 0..1 score of how complete the tender is. Calculated server-side
   * so the UI can sort + display without re-running the math each
   * render. The breakdown lists the eight signals that count:
   * total price, duration, validity, proposed start, breakdown rows,
   * exclusions, conditions, pitch, documents.
   */
  completeness: {
    score: number;
    filled: number;
    total: number;
    /** Human-readable list of what's still missing — shown in the UI
     *  on hover / under the completeness bar. */
    missing: string[];
  };
};

/**
 * Comparison-side analytics rolled up across all visible tenders for
 * one project. Computed pure-function from the loaded list, but lives
 * server-side so the page paints with the numbers ready and we can
 * pre-format strings consistently.
 */
export type TenderAnalytics = {
  count: number;
  uniqueBuilders: number;
  /** Tender totals — null when no priced tenders are available. */
  price: {
    min: number | null;
    median: number | null;
    max: number | null;
    /** (max - min) / median — gives owners a "how spread out are they"
     *  read. 0.10 = tight, 0.40 = scattered. Null when n<2 or no median. */
    spread: number | null;
  };
  /** Build-duration spread — same shape as price. */
  duration: {
    min: number | null;
    median: number | null;
    max: number | null;
  };
  /**
   * Days since the project's first publish. Derived from the project
   * row, not the tenders. Useful framing — "Live for 9 days; 4 tenders
   * received".
   */
  daysLive: number | null;
  /** Days since the most recent tender came in. null when none yet. */
  daysSinceLatest: number | null;
  /** Ratio of tenders whose builder has both ABN + licence verified. */
  verifiedRatio: number;
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
