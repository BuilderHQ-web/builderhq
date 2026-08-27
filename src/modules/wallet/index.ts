/**
 * wallet · public surface.
 *
 * Builder account credit, in whole Australian dollars. Distinct from
 * `modules/credits`, which is Founding Builder Access (free unlock
 * attempts per cycle) and is being retired.
 */

export {
  balanceFor,
  unacknowledgedGrantsFor,
  acknowledgeGrants,
  grantCredit,
  unlockWithCredits,
  monthsFromNow,
} from "./service";
export type { GrantCreditInput, UnlockWithCreditsResult } from "./service";

export {
  CREDIT_TERM_MONTHS,
  CREDIT_REASONS,
} from "./types";
export type {
  CreditBalance,
  CreditGrantView,
  CreditRedemptionView,
  CreditReason,
} from "./types";

export { creditGrants, creditRedemptions } from "./schema";
export type {
  CreditGrantRow,
  CreditGrantInsert,
  CreditRedemptionRow,
  CreditRedemptionInsert,
} from "./schema";
