/**
 * Owner-side tender review payload shapes.
 *
 * Mirror the responses from /api/mobile/projects/[slug]/tenders and
 * /api/mobile/tenders/[id]/owner 1:1. Field-for-field — drift here
 * and the screens silently mis-render.
 */

export type OwnerTenderStatus =
  | "draft"
  | "submitted"
  | "withdrawn"
  | "shortlisted"
  | "awarded"
  | "rejected";

export interface OwnerTenderBuilder {
  id: string;
  displayName: string;
  initials: string;
  companyName: string | null;
  slug: string | null;
  state: string | null;
  yearsInOperation: number | null;
  abnVerified: boolean;
  anyLicenceVerified: boolean;
  awardedCount: number;
}

export interface OwnerTenderCostLine {
  id: string;
  trade: string;
  label: string | null;
  amountAud: number;
  sortOrder: number;
}

export interface OwnerTenderCompleteness {
  score: number;
  filled: number;
  total: number;
  missing: string[];
}

export interface OwnerTenderSummary {
  id: string;
  status: OwnerTenderStatus;
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
  builder: OwnerTenderBuilder;
  completeness: OwnerTenderCompleteness;
}

export interface OwnerTenderDetail extends OwnerTenderSummary {
  costLines: OwnerTenderCostLine[];
}

export interface OwnerTenderAnalytics {
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

export interface OwnerTenderListPayload {
  projectId: string;
  projectTitle: string;
  analytics: OwnerTenderAnalytics;
  tenders: OwnerTenderSummary[];
}

export interface OwnerTenderDetailPayload {
  tender: OwnerTenderDetail;
}

export type OwnerTenderAction =
  | "shortlist"
  | "award"
  | "reject"
  | "reopen";

export interface OwnerTenderDecisionResponse {
  tender: OwnerTenderDetail;
  /** Award-only fields. Undefined for other actions. */
  rejectedIds?: string[];
  rejectedFailedIds?: string[];
}
