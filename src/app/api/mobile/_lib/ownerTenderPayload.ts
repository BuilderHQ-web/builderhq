/**
 * Shared serialisers for the owner-view tender payloads.
 *
 * The owner side reads tenders in two flavours — comparison list
 * (compact summary, used on the per-project tenders screen) and
 * detail (full pitch + cost breakdown + builder verification chips,
 * used when the owner taps into a single tender). Both flavours mirror
 * `TenderForOwner` from the service but flatten Dates to ISO strings
 * and prune fields the mobile UI doesn't render.
 *
 * Analytics is serialised here too so the list endpoint can return
 * `{ analytics, tenders }` in one round-trip.
 */

import type {
  TenderAnalytics,
  TenderForOwner,
} from "@/modules/tenders";

// ── Types ───────────────────────────────────────────────────────────

export interface MobileOwnerTenderBuilder {
  id: string;
  /** Display preference: companyName → name → "Builder". */
  displayName: string;
  initials: string;
  companyName: string | null;
  slug: string | null;
  state: string | null;
  yearsInOperation: number | null;
  /** Verification chips. Drives the trust badges on each card. */
  abnVerified: boolean;
  anyLicenceVerified: boolean;
  awardedCount: number;
}

export interface MobileOwnerTenderCostLine {
  id: string;
  trade: string;
  label: string | null;
  amountAud: number;
  sortOrder: number;
}

export interface MobileOwnerTenderCompleteness {
  score: number;
  filled: number;
  total: number;
  missing: string[];
}

/**
 * Comparison card shape — what the list endpoint emits per tender.
 * Drops `costLines` (the detail endpoint serves them) to keep the
 * list payload tight even with 20+ tenders.
 */
export interface MobileOwnerTenderSummary {
  id: string;
  status: TenderForOwner["status"];
  totalPriceAud: number | null;
  durationWeeks: number | null;
  validityDays: number | null;
  proposedStartMonth: string | null;
  exclusions: string[] | null;
  conditions: string | null;
  pitch: string | null;
  submittedAtIso: string | null;
  decidedAtIso: string | null;
  documentCount: number;
  builder: MobileOwnerTenderBuilder;
  completeness: MobileOwnerTenderCompleteness;
}

/** Full detail — everything the comparison row has plus cost lines. */
export interface MobileOwnerTenderDetail extends MobileOwnerTenderSummary {
  costLines: MobileOwnerTenderCostLine[];
}

export interface MobileOwnerTenderAnalytics {
  count: number;
  uniqueBuilders: number;
  price: {
    min: number | null;
    median: number | null;
    max: number | null;
    spread: number | null;
  };
  duration: {
    min: number | null;
    median: number | null;
    max: number | null;
  };
  daysLive: number | null;
  daysSinceLatest: number | null;
  verifiedRatio: number;
}

// ── Serialisers ─────────────────────────────────────────────────────

function builderToPayload(
  b: TenderForOwner["builder"],
): MobileOwnerTenderBuilder {
  return {
    id: b.id,
    displayName: b.companyName ?? b.name ?? "Builder",
    initials: b.initials,
    companyName: b.companyName,
    slug: b.slug,
    state: b.state,
    yearsInOperation: b.yearsInOperation,
    abnVerified: b.abnVerified,
    anyLicenceVerified: b.anyLicenceVerified,
    awardedCount: b.awardedCount,
  };
}

export function ownerTenderSummary(
  t: TenderForOwner,
): MobileOwnerTenderSummary {
  return {
    id: t.id,
    status: t.status,
    totalPriceAud: t.totalPriceAud,
    durationWeeks: t.durationWeeks,
    validityDays: t.validityDays,
    proposedStartMonth: t.proposedStartMonth,
    exclusions: t.exclusions,
    conditions: t.conditions,
    pitch: t.pitch,
    submittedAtIso: t.submittedAt ? t.submittedAt.toISOString() : null,
    decidedAtIso: t.decidedAt ? t.decidedAt.toISOString() : null,
    documentCount: t.documentCount,
    builder: builderToPayload(t.builder),
    completeness: t.completeness,
  };
}

export function ownerTenderDetail(
  t: TenderForOwner,
): MobileOwnerTenderDetail {
  return {
    ...ownerTenderSummary(t),
    costLines: t.costLines.map((l) => ({
      id: l.id,
      trade: l.trade,
      label: l.label,
      amountAud: l.amountAud,
      sortOrder: l.sortOrder,
    })),
  };
}

export function analyticsToPayload(
  a: TenderAnalytics,
): MobileOwnerTenderAnalytics {
  return a;
}
