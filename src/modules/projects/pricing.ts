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
  renovation: 49,
  extension: 99,
  single_dwelling: 149,
  multi_dwelling: 199,
};

export function unlockPriceFor(type: ProjectRow["type"]): number {
  return UNLOCK_PRICE_AUD[type];
}

/**
 * Lowercase, mid-sentence-friendly label for a project type — for use
 * in copy like "Your Brunswick single dwelling is ready to publish".
 * Distinct from the Title Case label dispatcher emails use; both
 * shapes have their place.
 */
export function humanProjectTypeLabel(type: ProjectRow["type"]): string {
  switch (type) {
    case "single_dwelling":
      return "single dwelling";
    case "multi_dwelling":
      return "multi-dwelling build";
    case "renovation":
      return "renovation";
    case "extension":
      return "extension";
  }
}
