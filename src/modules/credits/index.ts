/**
 * @module credits
 *
 * Public surface for the credits module (Founding Builder Access).
 * Outsiders MUST import from `@/modules/credits` — never reach into
 * `./service`, `./schema`, or `./policies` directly.
 */

export { fbaGrants, fbaSourceEnum } from "./schema";
export type { FbaGrantRow, FbaGrantInsert } from "./schema";

export type { FbaGrant, FbaStatus, FbaCycleHistory } from "./types";

export {
  // grants
  getCurrentGrant,
  grantFba,
  maybeAutoGrantFounding,
  revokeGrant,
  // status / consumption
  getStatus,
  checkCreditAvailable,
  // cycle math
  currentCycleFor,
  // history + meta
  recentCycleHistory,
  foundingSeatsAvailable,
  // exposed constants for the UI banner
  FOUNDING_CUTOFF,
  FOUNDING_CAP,
} from "./service";

export { canReadStatus, canGrant, canRevoke } from "./policies";
export type { ActorContext } from "./policies";
