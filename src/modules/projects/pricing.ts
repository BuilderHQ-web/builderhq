/**
 * projects · pricing.
 *
 * Static pricing table — safe to import from BOTH server and client
 * components (no DB / server-only deps). The runtime numbers come
 * from here; the projects module index re-exports for convenience.
 *
 * Step 5b will swap the "Pay $X" path for a Stripe checkout that
 * reads from this same table; subscription tiers (Phase 4+) will
 * override per-tier-per-month for subscribed users.
 */

import type { ProjectRow } from "./schema";

export const UNLOCK_PRICE_AUD: Record<ProjectRow["type"], number> = {
  renovation: 99,
  extension: 149,
  single_dwelling: 199,
  multi_dwelling: 249,
};

export function unlockPriceFor(type: ProjectRow["type"]): number {
  return UNLOCK_PRICE_AUD[type];
}
