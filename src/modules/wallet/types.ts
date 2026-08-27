/** wallet · public types. Client-safe: no drizzle, no server-only. */

/** One grant, as the builder sees it. */
export interface CreditGrantView {
  id: string;
  amountAud: number;
  /** What is left on this grant after redemptions. */
  remainingAud: number;
  reason: string;
  note: string | null;
  grantedAt: Date;
  expiresAt: Date;
  acknowledgedAt: Date | null;
  /** False once revoked or past expiry. Expired grants still show in history. */
  live: boolean;
}

/** One debit, as the builder sees it. */
export interface CreditRedemptionView {
  id: string;
  amountAud: number;
  projectTitle: string | null;
  projectSlug: string | null;
  createdAt: Date;
}

/** Everything the credits surfaces need, in one read. */
export interface CreditBalance {
  /** Spendable right now, in whole AUD. Never negative. */
  availableAud: number;
  /** Sum of every grant ever made, live or not. */
  grantedAud: number;
  /** Sum of every redemption ever made. */
  spentAud: number;
  /** Value on live grants that will lapse, and when the soonest lapses. */
  expiringAud: number;
  nextExpiryAt: Date | null;
  grants: CreditGrantView[];
  redemptions: CreditRedemptionView[];
}

/**
 * How long a grant lasts unless the caller says otherwise. Six months
 * is long enough that a builder can wait for a round worth entering,
 * and short enough that the liability does not sit open forever.
 */
export const CREDIT_TERM_MONTHS = 6;

/** Cohort keys. Add here rather than passing loose strings at callsites. */
export const CREDIT_REASONS = {
  /** Rounds published before the pack was tender ready. */
  documentationShortfall: "documentation_shortfall",
  /** Discretionary goodwill, explained in the note. */
  goodwill: "goodwill",
} as const;

export type CreditReason =
  (typeof CREDIT_REASONS)[keyof typeof CREDIT_REASONS];
