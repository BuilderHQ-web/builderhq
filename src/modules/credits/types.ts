/**
 * credits · public types.
 *
 * Domain-level types exposed to consumers (UI + other modules). DB
 * row types live in schema.ts and are re-exported through index.ts.
 */

import type { FbaGrantRow } from "./schema";

export type FbaGrant = FbaGrantRow;

/**
 * Snapshot of a builder's FBA state at a point in time. Cheap to
 * compute from the active grant + recent unlocks; the dashboard +
 * project-detail page render almost everything from this.
 */
export type FbaStatus =
  | { active: false; reason: "no_grant" | "expired" | "revoked" }
  | {
      active: true;
      grant: FbaGrantRow;
      /** Index of the cycle the builder is currently in (0-based). */
      cycleIndex: number;
      /** Number of cycles in the grant total (e.g. 3 months → 3). */
      totalCycles: number;
      /** Start of the current 30-day cycle. */
      cycleStart: Date;
      /** End of the current 30-day cycle (exclusive). */
      cycleEnd: Date;
      /** Free credits per cycle (mirrors grant.monthlyQuota). */
      monthlyQuota: number;
      /** Credits used in the current cycle. */
      usedThisCycle: number;
      /** Credits remaining in the current cycle. */
      remainingThisCycle: number;
      /** Days until the next cycle refresh. */
      daysToRefresh: number;
      /** Days until the grant fully ends. */
      daysToGrantEnd: number;
      /** Total AUD saved across this grant's lifetime. */
      totalSavedAud: number;
      /** Lifetime credits used across all cycles in this grant. */
      lifetimeUsed: number;
    };

/**
 * Per-cycle history row — rendered on the dashboard "past cycles"
 * panel once the builder is in cycle 2+.
 */
export type FbaCycleHistory = {
  cycleIndex: number;
  cycleStart: Date;
  cycleEnd: Date;
  used: number;
  quota: number;
  savedAud: number;
  isCurrent: boolean;
};
