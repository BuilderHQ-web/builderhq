/**
 * Shared serialiser for the mobile tender payload.
 *
 * Every tender-related endpoint (create, get, patch, set-cost-lines,
 * submit) returns the same shape so the mobile screen can hydrate
 * from any response identically. Centralised here so the field set
 * stays in lockstep across routes.
 */

import { computeReadiness, type Tender } from "@/modules/tenders";
import type { TenderWithLines } from "@/modules/tenders";

export interface MobileTenderCostLine {
  id: string;
  trade: string;
  label: string | null;
  amountAud: number;
  sortOrder: number;
}

export interface MobileTenderPayload {
  id: string;
  projectId: string;
  builderId: string;
  status: string;
  totalPriceAud: number | null;
  durationWeeks: number | null;
  validityDays: number | null;
  proposedStartMonth: string | null;
  exclusions: string[] | null;
  conditions: string | null;
  pitch: string | null;
  costLines: MobileTenderCostLine[];
  /** Server-computed readiness — UI uses this for the completeness
   *  ring + the variance hint without recomputing. */
  readiness: {
    canSubmit: boolean;
    missing: string[];
    variance: number | null;
  };
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

export function tenderToPayload(t: TenderWithLines): MobileTenderPayload {
  const readiness = computeReadiness(
    t as Tender,
    t.costLines,
  );
  return {
    id: t.id,
    projectId: t.projectId,
    builderId: t.builderId,
    status: t.status,
    totalPriceAud: t.totalPriceAud,
    durationWeeks: t.durationWeeks,
    validityDays: t.validityDays,
    proposedStartMonth: t.proposedStartMonth,
    exclusions: t.exclusions,
    conditions: t.conditions,
    pitch: t.pitch,
    costLines: t.costLines.map((l) => ({
      id: l.id,
      trade: l.trade,
      label: l.label,
      amountAud: l.amountAud,
      sortOrder: l.sortOrder,
    })),
    readiness,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    submittedAt: t.submittedAt ? t.submittedAt.toISOString() : null,
  };
}
