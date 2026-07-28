/**
 * tenders · service layer.
 *
 * Owns the entire tender lifecycle: builder drafts a tender on an
 * unlocked project, autosaves through fill-out, finalises with
 * submit, can withdraw to start over. Owner moves submitted tenders
 * through shortlist → award (or rejects them).
 *
 * Server-only: hits the DB and reads the unlocks table to gate
 * tender creation.
 */

import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";

import {
  tenders,
  tenderCostLines,
  type TenderRow,
  type TenderCostLineRow,
} from "./schema";
import {
  tenderBuilderInvites,
  tenderResponses,
  type TenderBuilderInviteRow,
  type TenderResponseRow,
} from "./schema";
import type {
  CostLineInput,
  SubmissionReadiness,
  Tender,
  TenderAnalytics,
  TenderCostLine,
  TenderForOwner,
  TenderWithLines,
  UpdateTenderInput,
} from "./types";
import type { ChecklistProgress } from "./types";

import { unlocks } from "@/modules/unlocks/schema";
import { recordProjectEvent } from "@/modules/projects";
import { projects } from "@/modules/projects/schema";
import { users } from "@/modules/users";
import { builderProfiles, architectProfiles } from "@/modules/profiles/schema";
import { documents } from "@/modules/documents/schema";

import { dispatchTenderEvent, dispatchBuilderInvite } from "./dispatch";
import {
  INSTRUMENT_VERSION,
  getQuestion,
  requiredQuestionIds,
  isValidAnswerShape,
  isAnswerComplete,
} from "./instrument";
import {
  getOrCreateConversation,
  postTenderSubmittedSystemMessage,
} from "@/modules/messaging";

// ── reads ────────────────────────────────────────────────────────────────

/**
 * Hot-path: get the builder's *active* tender for a project. Active
 * means non-withdrawn, non-deleted — withdrawn tenders are kept for
 * audit but a new one can be created.
 */
export async function getActiveTenderForBuilder(
  builderId: string,
  projectId: string,
): Promise<TenderWithLines | null> {
  const [t] = await db
    .select()
    .from(tenders)
    .where(
      and(
        eq(tenders.builderId, builderId),
        eq(tenders.projectId, projectId),
        isNull(tenders.deletedAt),
        inArray(tenders.status, [
          "draft",
          "submitted",
          "shortlisted",
          "awarded",
        ]),
      ),
    )
    .orderBy(desc(tenders.createdAt))
    .limit(1);
  if (!t) return null;
  const lines = await db
    .select()
    .from(tenderCostLines)
    .where(eq(tenderCostLines.tenderId, t.id))
    .orderBy(asc(tenderCostLines.sortOrder));
  return { ...t, costLines: lines };
}

/** Builder's full tender list (drafts + submitted + decided). */
export async function listTendersForBuilder(
  builderId: string,
): Promise<Tender[]> {
  return db
    .select()
    .from(tenders)
    .where(and(eq(tenders.builderId, builderId), isNull(tenders.deletedAt)))
    .orderBy(desc(tenders.updatedAt));
}

/**
 * Owner-side: list all *visible* tenders for a project (everything
 * except draft + withdrawn + soft-deleted), joined with the builder's
 * profile + document count + verification chips + per-tender
 * completeness for the comparison view.
 *
 * Verification chips are pulled in one batch query against the
 * builder_verifications audit log — we read the latest row per
 * (builder, kind) and consider it "verified" only when status='verified'
 * AND the subject_value still matches the builder's current ABN /
 * licence. This is the same logic the verification module's
 * hasFullVerificationForApproval uses; we inline a batched version
 * here so the comparison page can paint with chips ready.
 */
export async function listTendersForOwner(
  projectId: string,
): Promise<TenderForOwner[]> {
  const rows = await db
    .select({
      id: tenders.id,
      builderId: tenders.builderId,
      projectId: tenders.projectId,
      status: tenders.status,
      totalPriceAud: tenders.totalPriceAud,
      instrumentVersion: tenders.instrumentVersion,
      durationWeeks: tenders.durationWeeks,
      validityDays: tenders.validityDays,
      proposedStartMonth: tenders.proposedStartMonth,
      exclusions: tenders.exclusions,
      conditions: tenders.conditions,
      pitch: tenders.pitch,
      createdAt: tenders.createdAt,
      updatedAt: tenders.updatedAt,
      submittedAt: tenders.submittedAt,
      withdrawnAt: tenders.withdrawnAt,
      decidedAt: tenders.decidedAt,
      deletedAt: tenders.deletedAt,
      builderUserId: users.id,
      builderName: users.name,
      builderFirstName: users.firstName,
      builderLastName: users.lastName,
      builderCompanyName: builderProfiles.companyName,
      builderSlug: builderProfiles.slug,
      builderYearsInOperation: builderProfiles.yearsInOperation,
      builderState: builderProfiles.businessState,
    })
    .from(tenders)
    .innerJoin(users, eq(users.id, tenders.builderId))
    .leftJoin(builderProfiles, eq(builderProfiles.userId, users.id))
    .where(
      and(
        eq(tenders.projectId, projectId),
        isNull(tenders.deletedAt),
        inArray(tenders.status, [
          "submitted",
          "shortlisted",
          "awarded",
          "rejected",
        ]),
      ),
    )
    .orderBy(desc(tenders.submittedAt));

  if (rows.length === 0) return [];
  const tenderIds = rows.map((r) => r.id);
  const builderIds = Array.from(new Set(rows.map((r) => r.builderId)));

  // One round-trip for cost lines across all tenders.
  const allLines = await db
    .select()
    .from(tenderCostLines)
    .where(inArray(tenderCostLines.tenderId, tenderIds))
    .orderBy(asc(tenderCostLines.sortOrder));
  const linesByTender = new Map<string, TenderCostLineRow[]>();
  for (const l of allLines) {
    const arr = linesByTender.get(l.tenderId) ?? [];
    arr.push(l);
    linesByTender.set(l.tenderId, arr);
  }

  // One round-trip for active doc counts across all tenders.
  const docCounts = await db
    .select({
      tenderId: documents.tenderId,
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(documents)
    .where(
      and(
        inArray(documents.tenderId, tenderIds),
        eq(documents.status, "active"),
        isNull(documents.deletedAt),
      ),
    )
    .groupBy(documents.tenderId);
  const countsByTender = new Map<string, number>();
  for (const c of docCounts) {
    if (c.tenderId) countsByTender.set(c.tenderId, c.n);
  }

  // Verification + builder-stats batch — both lazy-imported because the
  // verification module is server-only and pulling its public surface
  // here would import too much. Each call is independent, ran in
  // parallel for the unique builder set.
  const [verificationByBuilder, awardedByBuilder] = await Promise.all([
    fetchVerificationChipsBatch(builderIds),
    fetchAwardedCountsBatch(builderIds),
  ]);

  return rows.map((r) => {
    const composed =
      r.builderFirstName && r.builderLastName
        ? `${r.builderFirstName} ${r.builderLastName}`
        : r.builderFirstName ?? r.builderName ?? null;
    const initials = (composed ?? "??")
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
    const lines = linesByTender.get(r.id) ?? [];
    const documentCount = countsByTender.get(r.id) ?? 0;
    const v = verificationByBuilder.get(r.builderId) ?? {
      abnVerified: false,
      anyLicenceVerified: false,
    };

    const completeness = computeTenderCompleteness(
      {
        totalPriceAud: r.totalPriceAud,
        durationWeeks: r.durationWeeks,
        validityDays: r.validityDays,
        proposedStartMonth: r.proposedStartMonth,
        exclusions: r.exclusions,
        conditions: r.conditions,
        pitch: r.pitch,
      },
      lines.length,
      documentCount,
    );

    return {
      id: r.id,
      builderId: r.builderId,
      projectId: r.projectId,
      status: r.status,
      instrumentVersion: r.instrumentVersion,
      totalPriceAud: r.totalPriceAud,
      durationWeeks: r.durationWeeks,
      validityDays: r.validityDays,
      proposedStartMonth: r.proposedStartMonth,
      exclusions: r.exclusions,
      conditions: r.conditions,
      pitch: r.pitch,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      submittedAt: r.submittedAt,
      withdrawnAt: r.withdrawnAt,
      decidedAt: r.decidedAt,
      deletedAt: r.deletedAt,
      costLines: lines,
      builder: {
        id: r.builderUserId,
        name: composed,
        companyName: r.builderCompanyName ?? null,
        initials,
        slug: r.builderSlug ?? null,
        yearsInOperation: r.builderYearsInOperation ?? null,
        state: r.builderState ?? null,
        abnVerified: v.abnVerified,
        anyLicenceVerified: v.anyLicenceVerified,
        awardedCount: awardedByBuilder.get(r.builderId) ?? 0,
      },
      documentCount,
      completeness,
    } satisfies TenderForOwner;
  });
}

/**
 * Eight-dimension tender completeness: totalPriceAud, durationWeeks,
 * validityDays, proposedStartMonth, ≥1 cost-line, ≥1 exclusion or
 * conditions text, pitch text, ≥1 document. Values are unweighted —
 * each dimension counts once. `score` is the fraction filled; the
 * `missing` array spells out what's not.
 */
function computeTenderCompleteness(
  t: {
    totalPriceAud: number | null;
    durationWeeks: number | null;
    validityDays: number | null;
    proposedStartMonth: string | null;
    exclusions: string[] | null;
    conditions: string | null;
    pitch: string | null;
  },
  costLineCount: number,
  documentCount: number,
): TenderForOwner["completeness"] {
  const checks: Array<[boolean, string]> = [
    [t.totalPriceAud != null && t.totalPriceAud > 0, "Total price"],
    [t.durationWeeks != null && t.durationWeeks > 0, "Build duration"],
    [t.validityDays != null && t.validityDays > 0, "Validity period"],
    [!!t.proposedStartMonth, "Proposed start"],
    [costLineCount > 0, "Cost breakdown"],
    [
      (t.exclusions?.length ?? 0) > 0 ||
        Boolean(t.conditions && t.conditions.trim().length > 0),
      "Scope / conditions",
    ],
    [Boolean(t.pitch && t.pitch.trim().length > 0), "Pitch"],
    [documentCount > 0, "Documents"],
  ];
  const filled = checks.filter(([ok]) => ok).length;
  const total = checks.length;
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
  return { score: filled / total, filled, total, missing };
}

/**
 * Verification chips batch. Pulls latest 'verified' row per (builder,
 * kind) where the verification subject still matches the builder's
 * current ABN / licence number. Returns Map<builderId, chips>.
 *
 * Lazy-imports the verification module to avoid import cycles with
 * tenders <-> verification (verification reads tender state for
 * decision audit trails).
 */
async function fetchVerificationChipsBatch(
  builderIds: string[],
): Promise<Map<string, { abnVerified: boolean; anyLicenceVerified: boolean }>> {
  const result = new Map<
    string,
    { abnVerified: boolean; anyLicenceVerified: boolean }
  >();
  if (builderIds.length === 0) return result;
  try {
    const { hasFullVerificationForApproval } = await import(
      "@/modules/verification"
    );
    // Per-builder lookup — there's no batched API on the verification
    // module yet, so we Promise.all the individual checks. For typical
    // project tender counts (5-20) this is fine; if we ever blow past
    // that we'll add a proper batched query.
    const results = await Promise.all(
      builderIds.map(async (id) => {
        try {
          const r = await hasFullVerificationForApproval(id);
          return [
            id,
            {
              abnVerified: r.abnVerified,
              anyLicenceVerified: r.anyLicenceVerified,
            },
          ] as const;
        } catch {
          return [
            id,
            { abnVerified: false, anyLicenceVerified: false },
          ] as const;
        }
      }),
    );
    for (const [id, chips] of results) result.set(id, chips);
  } catch {
    // Verification module unavailable — return empty map; cards will
    // show "pending" chips. Comparison page still works.
  }
  return result;
}

/**
 * Per-builder count of awarded tenders across the platform — proof
 * of track record. Used as a "Won N projects" chip on the card.
 * Counts a builder's own awarded tenders, not the project we're
 * looking at, so it's a real cross-project signal.
 */
async function fetchAwardedCountsBatch(
  builderIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (builderIds.length === 0) return result;
  const rows = await db
    .select({
      builderId: tenders.builderId,
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(tenders)
    .where(
      and(
        inArray(tenders.builderId, builderIds),
        eq(tenders.status, "awarded"),
        isNull(tenders.deletedAt),
      ),
    )
    .groupBy(tenders.builderId);
  for (const r of rows) result.set(r.builderId, r.n);
  return result;
}

/**
 * Public count of a builder's awarded tenders across every project — the
 * "projects won" trust signal shown on their public profile. Mirrors the
 * batch query above for a single builder.
 */
export async function countAwardedForBuilder(builderId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(tenders)
    .where(
      and(
        eq(tenders.builderId, builderId),
        eq(tenders.status, "awarded"),
        isNull(tenders.deletedAt),
      ),
    );
  return row?.n ?? 0;
}

/**
 * Roll-up analytics across the loaded tender list. Pure function —
 * computes synchronously from what the page already loaded, no
 * additional DB hops. Returns null-y fields when there's not enough
 * data (e.g. no priced tenders, or only one tender).
 */
export function computeTenderAnalytics(
  tenders: TenderForOwner[],
  projectPublishedAt: Date | null,
): TenderAnalytics {
  const count = tenders.length;
  const uniqueBuilders = new Set(tenders.map((t) => t.builder.id)).size;

  const prices = tenders
    .map((t) => t.totalPriceAud)
    .filter((n): n is number => n != null && n > 0)
    .sort((a, b) => a - b);
  const durations = tenders
    .map((t) => t.durationWeeks)
    .filter((n): n is number => n != null && n > 0)
    .sort((a, b) => a - b);

  const median = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 === 0
      ? Math.round((arr[mid - 1]! + arr[mid]!) / 2)
      : arr[mid]!;
  };

  const priceMin = prices[0] ?? null;
  const priceMax = prices[prices.length - 1] ?? null;
  const priceMedian = median(prices);
  const priceSpread =
    priceMin != null && priceMax != null && priceMedian && priceMedian > 0
      ? (priceMax - priceMin) / priceMedian
      : null;

  const submittedDates = tenders
    .map((t) => t.submittedAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => b.getTime() - a.getTime());
  const latestSubmitted = submittedDates[0] ?? null;
  const now = Date.now();
  const daysSinceLatest =
    latestSubmitted != null
      ? Math.max(
          0,
          Math.floor((now - latestSubmitted.getTime()) / (24 * 60 * 60 * 1000)),
        )
      : null;
  const daysLive =
    projectPublishedAt != null
      ? Math.max(
          0,
          Math.floor(
            (now - projectPublishedAt.getTime()) / (24 * 60 * 60 * 1000),
          ),
        )
      : null;

  const verifiedCount = tenders.filter(
    (t) => t.builder.abnVerified && t.builder.anyLicenceVerified,
  ).length;
  const verifiedRatio = count > 0 ? verifiedCount / count : 0;

  return {
    count,
    uniqueBuilders,
    price: {
      min: priceMin,
      median: priceMedian,
      max: priceMax,
      spread: priceSpread,
    },
    duration: {
      min: durations[0] ?? null,
      median: median(durations),
      max: durations[durations.length - 1] ?? null,
    },
    daysLive,
    daysSinceLatest,
    verifiedRatio,
  };
}

/** Single-tender owner read (for detail page). */
export async function getTenderForOwner(
  tenderId: string,
): Promise<TenderForOwner | null> {
  const [t] = await db.select().from(tenders).where(eq(tenders.id, tenderId));
  if (!t) return null;
  const list = await listTendersForOwner(t.projectId);
  return list.find((x) => x.id === tenderId) ?? null;
}

/** Single-tender builder read (with lines). */
export async function getTenderForBuilder(
  builderId: string,
  tenderId: string,
): Promise<TenderWithLines | null> {
  const [t] = await db.select().from(tenders).where(eq(tenders.id, tenderId));
  if (!t || t.builderId !== builderId || t.deletedAt) return null;
  const lines = await db
    .select()
    .from(tenderCostLines)
    .where(eq(tenderCostLines.tenderId, t.id))
    .orderBy(asc(tenderCostLines.sortOrder));
  return { ...t, costLines: lines };
}

/** Owner of the project this tender is on (for policy gating). */
export async function getProjectOwnerForTender(
  tenderId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ ownerId: projects.ownerId })
    .from(tenders)
    .innerJoin(projects, eq(projects.id, tenders.projectId))
    .where(eq(tenders.id, tenderId))
    .limit(1);
  return row?.ownerId ?? null;
}

/**
 * Public verification read behind the document seal. Deliberately
 * minimal: enough to confirm a Tender Document is genuine — who
 * prepared it, for which project, when, and its current standing —
 * and nothing of the tender's content. Drafts verify as nothing:
 * the seal only activates on submission.
 */
export async function getTenderVerification(tenderId: string): Promise<{
  ref: string;
  builderEntity: string | null;
  projectTitle: string;
  status: "submitted" | "shortlisted" | "awarded" | "rejected" | "withdrawn";
  submittedAt: Date | null;
} | null> {
  const [row] = await db
    .select({
      id: tenders.id,
      status: tenders.status,
      submittedAt: tenders.submittedAt,
      projectTitle: projects.title,
      builderEntity: builderProfiles.companyName,
    })
    .from(tenders)
    .innerJoin(projects, eq(projects.id, tenders.projectId))
    .leftJoin(builderProfiles, eq(builderProfiles.userId, tenders.builderId))
    .where(and(eq(tenders.id, tenderId), isNull(tenders.deletedAt)))
    .limit(1);
  if (!row || row.status === "draft") return null;
  return {
    ref: `BHQ-${row.id.slice(0, 8).toUpperCase()}`,
    builderEntity: row.builderEntity,
    projectTitle: row.projectTitle,
    status: row.status as
      | "submitted"
      | "shortlisted"
      | "awarded"
      | "rejected"
      | "withdrawn",
    submittedAt: row.submittedAt,
  };
}

// ── readiness / aggregation ──────────────────────────────────────────────

export function computeReadiness(
  t: TenderRow,
  lines: TenderCostLineRow[],
  checklist?: ChecklistProgress | null,
): SubmissionReadiness {
  const missing: SubmissionReadiness["missing"] = [];
  if (!t.totalPriceAud || t.totalPriceAud <= 0) missing.push("total_price");
  if (!t.durationWeeks || t.durationWeeks <= 0) missing.push("duration");
  if (!t.validityDays || t.validityDays <= 0) missing.push("validity");
  if (checklist && !checklist.complete) missing.push("checklist");

  const sum = lines.reduce((s, l) => s + l.amountAud, 0);
  const variance = lines.length === 0 ? null : sum - (t.totalPriceAud ?? 0);

  return {
    canSubmit: missing.length === 0,
    missing,
    variance,
  };
}

// ── writes ───────────────────────────────────────────────────────────────

/**
 * Create a new draft tender for (builder, project). Verifies the
 * builder has unlocked the project; refuses if not. Idempotent —
 * returns the existing active tender if one exists.
 */
export async function createDraft(
  builderId: string,
  projectId: string,
): Promise<Result<TenderWithLines>> {
  // Unlock check — builder must have unlocked this project.
  const [unlocked] = await db
    .select({ id: unlocks.id })
    .from(unlocks)
    .where(
      and(eq(unlocks.builderId, builderId), eq(unlocks.projectId, projectId)),
    )
    .limit(1);
  if (!unlocked) {
    return fail(
      "forbidden",
      "Unlock this project before submitting a tender.",
    );
  }

  // Existing active tender? Idempotent.
  const existing = await getActiveTenderForBuilder(builderId, projectId);
  if (existing) return ok(existing);

  const [row] = await db
    .insert(tenders)
    .values({
      builderId,
      projectId,
      status: "draft",
      // Every new tender answers the current submission instrument.
      instrumentVersion: INSTRUMENT_VERSION,
    })
    .returning();
  if (!row) return fail("internal", "Failed to create tender draft.");

  return ok({ ...row, costLines: [] });
}

/**
 * Legacy drafts predate the submission instrument. The moment a
 * builder opens one to keep working, it adopts the current instrument
 * so every submission from here on carries the checklist. Submitted
 * and decided tenders are never retro-gated. Idempotent.
 */
export async function adoptInstrumentForDraft(
  builderId: string,
  tenderId: string,
): Promise<void> {
  await db
    .update(tenders)
    .set({ instrumentVersion: INSTRUMENT_VERSION })
    .where(
      and(
        eq(tenders.id, tenderId),
        eq(tenders.builderId, builderId),
        eq(tenders.status, "draft"),
        isNull(tenders.instrumentVersion),
      ),
    );
}

/** Patch a tender. Only allowed while draft. */
export async function updateDraft(
  builderId: string,
  tenderId: string,
  patch: UpdateTenderInput,
): Promise<Result<TenderWithLines>> {
  const [row] = await db
    .select()
    .from(tenders)
    .where(eq(tenders.id, tenderId));
  if (!row || row.deletedAt) return fail("not_found", "Tender not found.");
  if (row.builderId !== builderId) return fail("forbidden", "Not your tender.");
  if (row.status !== "draft") {
    return fail("conflict", "Tender has already been submitted.");
  }

  const errors: string[] = [];
  if (patch.totalPriceAud != null && patch.totalPriceAud < 0) {
    errors.push("Total price must be ≥ 0.");
  }
  if (
    patch.durationWeeks != null &&
    (patch.durationWeeks < 1 || patch.durationWeeks > 200)
  ) {
    errors.push("Duration must be between 1 and 200 weeks.");
  }
  if (
    patch.validityDays != null &&
    ![7, 14, 30, 60, 90].includes(patch.validityDays)
  ) {
    errors.push("Validity must be 7, 14, 30, 60, or 90 days.");
  }
  if (
    patch.proposedStartMonth != null &&
    patch.proposedStartMonth.trim() !== "" &&
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(patch.proposedStartMonth)
  ) {
    errors.push("Start month must be YYYY-MM.");
  }
  if (errors.length > 0) {
    return fail("validation", errors.join(" "), { errors });
  }

  const [updated] = await db
    .update(tenders)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(tenders.id, tenderId))
    .returning();

  const lines = await db
    .select()
    .from(tenderCostLines)
    .where(eq(tenderCostLines.tenderId, tenderId))
    .orderBy(asc(tenderCostLines.sortOrder));

  return ok({ ...updated!, costLines: lines });
}

/**
 * Replace the cost-line set on a draft tender. Atomic: deletes
 * existing rows + inserts the new ones in a single transaction.
 */
export async function setCostLines(
  builderId: string,
  tenderId: string,
  rawLines: CostLineInput[],
): Promise<Result<TenderCostLine[]>> {
  const [row] = await db
    .select()
    .from(tenders)
    .where(eq(tenders.id, tenderId));
  if (!row) return fail("not_found", "Tender not found.");
  if (row.builderId !== builderId) return fail("forbidden", "Not your tender.");
  if (row.status !== "draft") {
    return fail("conflict", "Tender has already been submitted.");
  }

  // Validate every line.
  const cleaned: CostLineInput[] = [];
  for (const l of rawLines) {
    if (!Number.isFinite(l.amountAud) || l.amountAud < 0) {
      return fail("validation", `Amount for ${l.trade} must be ≥ 0.`);
    }
    if (l.trade === "other" && !(l.label && l.label.trim())) {
      return fail("validation", `"Other" rows require a label.`);
    }
    if (l.amountAud === 0 && l.trade !== "other") continue; // skip empties
    cleaned.push(l);
  }

  const inserted = await db.transaction(async (tx) => {
    await tx
      .delete(tenderCostLines)
      .where(eq(tenderCostLines.tenderId, tenderId));
    if (cleaned.length === 0) return [] as TenderCostLineRow[];
    const rows = await tx
      .insert(tenderCostLines)
      .values(
        cleaned.map((l, i) => ({
          tenderId,
          trade: l.trade,
          amountAud: Math.round(l.amountAud),
          label: l.trade === "other" ? l.label?.trim() ?? null : null,
          sortOrder: i,
        })),
      )
      .returning();
    return rows;
  });

  await db
    .update(tenders)
    .set({ updatedAt: new Date() })
    .where(eq(tenders.id, tenderId));

  return ok(inserted);
}

/**
 * Submit a draft. Re-validates required fields. Auto-balances the
 * cost breakdown if the variance is non-zero (per the spec): adjusts
 * the most-recent "other" row to absorb the gap, or creates one.
 */
export async function submit(
  builderId: string,
  tenderId: string,
): Promise<Result<TenderWithLines>> {
  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(tenders)
      .where(eq(tenders.id, tenderId));
    if (!row) return fail("not_found", "Tender not found.");
    if (row.builderId !== builderId) {
      return fail("forbidden", "Not your tender.");
    }
    if (row.status !== "draft") {
      return fail("conflict", "Tender has already been submitted.");
    }

    const lines = await tx
      .select()
      .from(tenderCostLines)
      .where(eq(tenderCostLines.tenderId, tenderId))
      .orderBy(asc(tenderCostLines.sortOrder));

    const checklistRows =
      row.instrumentVersion != null
        ? await tx
            .select()
            .from(tenderResponses)
            .where(eq(tenderResponses.tenderId, tenderId))
        : [];
    const checklist =
      row.instrumentVersion != null
        ? checklistProgress(row, checklistRows)
        : null;

    const readiness = computeReadiness(row, lines, checklist);
    if (!readiness.canSubmit) {
      return fail(
        "validation",
        readiness.missing.includes("checklist")
          ? "Complete the submission checklist before submitting."
          : "Tender is missing required fields.",
        { missing: readiness.missing },
      );
    }

    // Auto-balance into "other" if breakdown has any rows but variance ≠ 0.
    if (
      lines.length > 0 &&
      readiness.variance !== null &&
      readiness.variance !== 0
    ) {
      // variance = sum(lines) - total. If positive, lines exceed total
      // → reduce/remove an Other line. If negative, lines short of total
      // → add to an Other line (creating one if needed).
      const correction = -readiness.variance; // dollars to add to Other
      const lastOther = [...lines]
        .reverse()
        .find((l) => l.trade === "other");
      if (lastOther) {
        const next = lastOther.amountAud + correction;
        if (next <= 0) {
          await tx
            .delete(tenderCostLines)
            .where(eq(tenderCostLines.id, lastOther.id));
        } else {
          await tx
            .update(tenderCostLines)
            .set({ amountAud: next })
            .where(eq(tenderCostLines.id, lastOther.id));
        }
      } else if (correction > 0) {
        await tx.insert(tenderCostLines).values({
          tenderId,
          trade: "other",
          label: "Builder's margin",
          amountAud: correction,
          sortOrder: lines.length,
        });
      }
      // (If correction <= 0 and no Other row, breakdown sum already
      //  exceeds the total — leave it; owner sees the gap and can ask.)
    }

    const [updated] = await tx
      .update(tenders)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenders.id, tenderId))
      .returning();

    const finalLines = await tx
      .select()
      .from(tenderCostLines)
      .where(eq(tenderCostLines.tenderId, tenderId))
      .orderBy(asc(tenderCostLines.sortOrder));

    return ok({ ...updated!, costLines: finalLines });
  });

  // Side effects outside the transaction so flaky external calls can't
  // roll back the submit. Both dispatch + chat-message helpers swallow
  // and log their own errors.
  if (result.ok) {
    await dispatchTenderEvent("submitted", tenderId);

    // Drop a system message into the (project × builder) conversation
    // so the owner sees the activity inline in chat. The conversation
    // already exists from the unlock hook — get-or-create is idempotent.
    try {
      const conv = await getOrCreateConversation(
        result.value.projectId,
        builderId,
      );
      if (conv.ok) {
        await postTenderSubmittedSystemMessage(
          conv.value.id,
          builderId,
          tenderId,
        );
      }
    } catch {
      /* swallowed — chat is best-effort */
    }
  }
  return result;
}

/** Builder pulls a submitted/shortlisted tender back. Terminal. */
export async function withdraw(
  builderId: string,
  tenderId: string,
): Promise<Result<TenderRow>> {
  const [row] = await db
    .select()
    .from(tenders)
    .where(eq(tenders.id, tenderId));
  if (!row) return fail("not_found", "Tender not found.");
  if (row.builderId !== builderId) {
    return fail("forbidden", "Not your tender.");
  }
  if (row.status !== "submitted" && row.status !== "shortlisted") {
    return fail(
      "conflict",
      "Only submitted or shortlisted tenders can be withdrawn.",
    );
  }

  const [updated] = await db
    .update(tenders)
    .set({
      status: "withdrawn",
      withdrawnAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tenders.id, tenderId))
    .returning();

  await dispatchTenderEvent("withdrawn", tenderId);
  return ok(updated!);
}

// ── owner decisions ──────────────────────────────────────────────────────

export async function shortlist(
  ownerId: string,
  tenderId: string,
): Promise<Result<TenderRow>> {
  return decisionTransition(ownerId, tenderId, ["submitted"], "shortlisted");
}

export async function award(
  ownerId: string,
  tenderId: string,
): Promise<Result<TenderRow>> {
  return decisionTransition(
    ownerId,
    tenderId,
    ["submitted", "shortlisted"],
    "awarded",
  );
}

export async function reject(
  ownerId: string,
  tenderId: string,
): Promise<Result<TenderRow>> {
  return decisionTransition(
    ownerId,
    tenderId,
    ["submitted", "shortlisted", "awarded"],
    "rejected",
  );
}

export async function moveBackToSubmitted(
  ownerId: string,
  tenderId: string,
): Promise<Result<TenderRow>> {
  return decisionTransition(
    ownerId,
    tenderId,
    ["shortlisted", "awarded", "rejected"],
    "submitted",
  );
}

async function decisionTransition(
  ownerId: string,
  tenderId: string,
  allowedFrom: TenderRow["status"][],
  to: TenderRow["status"],
): Promise<Result<TenderRow>> {
  const [row] = await db
    .select({
      tender: tenders,
      projectOwnerId: projects.ownerId,
    })
    .from(tenders)
    .innerJoin(projects, eq(projects.id, tenders.projectId))
    .where(eq(tenders.id, tenderId));
  if (!row) return fail("not_found", "Tender not found.");
  if (row.projectOwnerId !== ownerId) {
    // Not the runner — a joined DECIDER seat carries the decision too
    // (the architect's client shortlisting and awarding on their own
    // build). Viewers and everyone else stay out.
    const { getProjectAccess } = await import("@/modules/projects");
    const access = await getProjectAccess(row.tender.projectId, ownerId);
    if (!(access?.kind === "participant" && access.role === "decider")) {
      return fail("forbidden", "Not your project.");
    }
  }
  if (!allowedFrom.includes(row.tender.status)) {
    return fail(
      "conflict",
      `Cannot move from ${row.tender.status} to ${to}.`,
    );
  }
  const [updated] = await db
    .update(tenders)
    .set({
      status: to,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tenders.id, tenderId))
    .returning();

  // Only the forward-going transitions notify. Roll-backs to "submitted"
  // are silent — the original "submitted" notification was already sent
  // and a second one would just be confusing. The actor rides along so
  // the owner-side fan-out can say who decided and skip notifying them.
  if (to === "shortlisted" || to === "awarded" || to === "rejected") {
    await dispatchTenderEvent(to, tenderId, { actorId: ownerId });
  } else if (to === "submitted") {
    // Silent for inboxes, never for the record.
    await recordProjectEvent({
      projectId: row.tender.projectId,
      actorId: ownerId,
      kind: "tender.reopened",
      subjectId: tenderId,
      summary: `A ${row.tender.status} tender was moved back to submitted.`,
    });
  }

  return ok(updated!);
}

// ── KPIs ─────────────────────────────────────────────────────────────────

export async function countTendersReceivedForOwner(
  ownerId: string,
): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(tenders)
    .innerJoin(projects, eq(projects.id, tenders.projectId))
    .where(
      and(
        eq(projects.ownerId, ownerId),
        isNull(tenders.deletedAt),
        inArray(tenders.status, ["submitted", "shortlisted", "awarded"]),
      ),
    );
  return rows[0]?.n ?? 0;
}

export async function countTendersForProject(
  projectId: string,
): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(tenders)
    .where(
      and(
        eq(tenders.projectId, projectId),
        isNull(tenders.deletedAt),
        inArray(tenders.status, ["submitted", "shortlisted", "awarded"]),
      ),
    );
  return rows[0]?.n ?? 0;
}

// ── submission checklist (the instrument) ────────────────────────────────

/**
 * Progress of a tender's structured submission against its instrument
 * version. Conditional questions (showIf) only count when their gate
 * answer makes them visible.
 */
export function checklistProgress(
  t: Pick<TenderRow, "instrumentVersion">,
  responses: Array<Pick<TenderResponseRow, "qid" | "value">>,
): ChecklistProgress | null {
  if (t.instrumentVersion == null) return null;
  const answers = new Map(responses.map((r) => [r.qid, r.value]));
  const required = requiredQuestionIds(answers, t.instrumentVersion);
  // An answer only counts when it FULLY answers the question (every
  // matrix row marked, every items row filled) — same definition the
  // checklist UI uses, so client "complete" and the submit gate agree.
  const answered = required.filter((qid) => {
    const q = getQuestion(qid);
    if (!q) return false;
    const raw = answers.get(qid);
    const v =
      typeof raw === "object" && raw !== null && "v" in raw
        ? (raw as { v: unknown }).v
        : raw;
    return isAnswerComplete(q, v);
  }).length;
  return {
    version: t.instrumentVersion,
    required: required.length,
    answered,
    complete: answered >= required.length,
  };
}

export async function listResponsesForTender(
  builderId: string,
  tenderId: string,
): Promise<Result<TenderResponseRow[]>> {
  const [row] = await db
    .select({ builderId: tenders.builderId })
    .from(tenders)
    .where(eq(tenders.id, tenderId))
    .limit(1);
  if (!row) return fail("not_found", "Tender not found.");
  if (row.builderId !== builderId) return fail("forbidden", "Not your tender.");

  const rows = await db
    .select()
    .from(tenderResponses)
    .where(eq(tenderResponses.tenderId, tenderId));
  return ok(rows);
}

/**
 * Upsert a batch of checklist answers. Only the tender's builder can
 * write, only while the tender is a draft, and only for question ids
 * the instrument actually defines — unknown ids are rejected so the
 * response store can never drift from the instrument.
 */
export async function saveTenderResponses(
  builderId: string,
  tenderId: string,
  entries: Array<{ qid: string; value: unknown }>,
): Promise<Result<{ saved: number; checklist: ChecklistProgress | null }>> {
  if (entries.length === 0) {
    return fail("validation", "Nothing to save.");
  }
  if (entries.length > 200) {
    return fail("validation", "Too many answers in one batch.");
  }
  for (const e of entries) {
    const q = getQuestion(e.qid);
    if (!q) {
      return fail("validation", `Unknown question: ${e.qid}`);
    }
    // Shape-check every value against its question type so the
    // response store only ever holds well-formed answers (partial is
    // fine — completeness is judged at the submit gate, not here).
    if (!isValidAnswerShape(q, e.value ?? null)) {
      return fail("validation", `Invalid answer for ${e.qid}.`);
    }
  }

  const [row] = await db
    .select()
    .from(tenders)
    .where(eq(tenders.id, tenderId))
    .limit(1);
  if (!row) return fail("not_found", "Tender not found.");
  if (row.builderId !== builderId) return fail("forbidden", "Not your tender.");
  if (row.status !== "draft") {
    return fail("conflict", "The checklist is locked after submission.");
  }

  const now = new Date();
  for (const e of entries) {
    await db
      .insert(tenderResponses)
      .values({ tenderId, qid: e.qid, value: { v: e.value }, updatedAt: now })
      .onConflictDoUpdate({
        target: [tenderResponses.tenderId, tenderResponses.qid],
        set: { value: { v: e.value }, updatedAt: now },
      });
  }

  const all = await db
    .select()
    .from(tenderResponses)
    .where(eq(tenderResponses.tenderId, tenderId));

  // The deck is the single source of truth for the headline figures,
  // so mirror them onto the tender row whenever their answers move.
  // Everything that reads tenders.total_price_aud (owner cards, the
  // comparison baseline, my-tenders) keeps working without knowing
  // the instrument exists. The headline stays GST-INCLUSIVE — the
  // instrument asks ex GST (4.2) plus registration (4.3), and owners
  // read the number they would actually pay.
  const MIRROR_QIDS = new Set([
    "price.total",
    "commercial.gst_registered",
    "programme.duration",
    "price.validity",
    "programme.start",
  ]);
  if (entries.some((e) => MIRROR_QIDS.has(e.qid))) {
    const unwrap = (qid: string): unknown => {
      const r = all.find((x) => x.qid === qid);
      const v = r?.value;
      return typeof v === "object" && v !== null && "v" in v
        ? (v as { v: unknown }).v
        : v;
    };
    const num = (x: unknown): number | null =>
      typeof x === "number" && Number.isFinite(x) ? x : null;

    const priceExGst = num(unwrap("price.total"));
    const gstRegistered = unwrap("commercial.gst_registered");
    const duration = num(unwrap("programme.duration"));
    const validity = num(unwrap("price.validity"));
    const start = unwrap("programme.start");

    await db
      .update(tenders)
      .set({
        totalPriceAud:
          priceExGst === null
            ? null
            : gstRegistered === false
              ? priceExGst
              : Math.round(priceExGst * 1.1),
        durationWeeks: duration,
        validityDays: validity,
        proposedStartMonth:
          typeof start === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(start)
            ? start
            : null,
        updatedAt: now,
      })
      .where(eq(tenders.id, tenderId));
  }

  return ok({ saved: entries.length, checklist: checklistProgress(row, all) });
}

/**
 * All instrument responses for a project's decision-visible tenders
 * (submitted / shortlisted / awarded / rejected) in one query, grouped
 * by tender. Powers the comparison page — no per-tender N+1.
 */
export async function listResponsesForProjectTenders(
  projectId: string,
): Promise<Map<string, Array<{ qid: string; value: unknown }>>> {
  const rows = await db
    .select({
      tenderId: tenderResponses.tenderId,
      qid: tenderResponses.qid,
      value: tenderResponses.value,
    })
    .from(tenderResponses)
    .innerJoin(tenders, eq(tenders.id, tenderResponses.tenderId))
    .where(
      and(
        eq(tenders.projectId, projectId),
        isNull(tenders.deletedAt),
        inArray(tenders.status, [
          "submitted",
          "shortlisted",
          "awarded",
          "rejected",
        ]),
      ),
    );
  const byTender = new Map<string, Array<{ qid: string; value: unknown }>>();
  for (const r of rows) {
    const arr = byTender.get(r.tenderId) ?? [];
    arr.push({ qid: r.qid, value: r.value });
    byTender.set(r.tenderId, arr);
  }
  return byTender;
}

/**
 * Pending round invitations addressed to an on-platform
 * builder — the dashboard's "you have been asked to price this" rows.
 * Unredeemed only: once joined, the project lives in their unlocked
 * list and the invite has done its job.
 */
export async function listInvitesForBuilder(
  builderUserId: string,
  opts: {
    /**
     * The builder's account email. Off-platform invitations are
     * addressed to a mailbox and carry no builderUserId until they are
     * redeemed — matching by email means a freshly signed-up invited
     * builder sees their invitation without having clicked the link's
     * accept step yet.
     */
    email?: string | null;
  } = {},
): Promise<
  Array<{
    inviteId: string;
    inviteToken: string;
    projectTitle: string;
    projectSuburb: string | null;
    projectState: string | null;
    inviterName: string;
    invitedAt: Date;
  }>
> {
  const inviterUsers = users;
  const rows = await db
    .select({
      inviteId: tenderBuilderInvites.id,
      inviteToken: tenderBuilderInvites.inviteToken,
      projectTitle: projects.title,
      projectSuburb: projects.suburb,
      projectState: projects.state,
      inviterName: inviterUsers.name,
      practiceName: architectProfiles.practiceName,
      invitedAt: tenderBuilderInvites.invitedAt,
    })
    .from(tenderBuilderInvites)
    .innerJoin(projects, eq(projects.id, tenderBuilderInvites.projectId))
    .innerJoin(inviterUsers, eq(inviterUsers.id, tenderBuilderInvites.invitedBy))
    .leftJoin(
      architectProfiles,
      eq(architectProfiles.userId, tenderBuilderInvites.invitedBy),
    )
    // A builder who already holds a spot (paid, founding, or an earlier
    // redemption) has nothing pending — the invite row would misstate
    // their standing.
    .leftJoin(
      unlocks,
      and(
        eq(unlocks.projectId, tenderBuilderInvites.projectId),
        eq(unlocks.builderId, builderUserId),
      ),
    )
    .where(
      and(
        opts.email
          ? or(
              eq(tenderBuilderInvites.builderUserId, builderUserId),
              sql`lower(${tenderBuilderInvites.email}) = ${opts.email.toLowerCase()}`,
            )!
          : eq(tenderBuilderInvites.builderUserId, builderUserId),
        eq(tenderBuilderInvites.status, "invited"),
        isNull(unlocks.id),
        isNull(projects.deletedAt),
        inArray(projects.status, ["published", "tendering"]),
      ),
    )
    .orderBy(desc(tenderBuilderInvites.invitedAt));
  return rows.map((r) => ({
    inviteId: r.inviteId,
    inviteToken: r.inviteToken,
    projectTitle: r.projectTitle,
    projectSuburb: r.projectSuburb,
    projectState: r.projectState,
    inviterName: r.practiceName ?? r.inviterName ?? "A project runner",
    invitedAt: r.invitedAt,
  }));
}

/**
 * Nav-level invitation tallies for a builder. `total` counts every
 * invitation ever addressed to this account (any status, matched by
 * userId or email) — the Invitations tab exists once a builder has
 * ever been invited. `pending` mirrors listInvitesForBuilder's
 * actionable set and drives the badge.
 */
export async function countInvitesForBuilderNav(
  builderUserId: string,
  email?: string | null,
): Promise<{ total: number; pending: number }> {
  const addressedToMe = email
    ? or(
        eq(tenderBuilderInvites.builderUserId, builderUserId),
        sql`lower(${tenderBuilderInvites.email}) = ${email.toLowerCase()}`,
      )!
    : eq(tenderBuilderInvites.builderUserId, builderUserId);

  const [[totalRow], pendingRows] = await Promise.all([
    db
      .select({ n: count() })
      .from(tenderBuilderInvites)
      .where(addressedToMe),
    listInvitesForBuilder(builderUserId, { email }),
  ]);
  return { total: totalRow?.n ?? 0, pending: pendingRows.length };
}

/**
 * The builder's unfinished drafts with project context — the desk
 * queue's "pick this back up" rows.
 */
export async function listDraftTendersForBuilder(builderId: string): Promise<
  Array<{
    tenderId: string;
    projectSlug: string;
    projectTitle: string;
    updatedAt: Date;
    totalPriceAud: number | null;
  }>
> {
  const rows = await db
    .select({
      tenderId: tenders.id,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      updatedAt: tenders.updatedAt,
      totalPriceAud: tenders.totalPriceAud,
    })
    .from(tenders)
    .innerJoin(projects, eq(projects.id, tenders.projectId))
    .where(
      and(
        eq(tenders.builderId, builderId),
        eq(tenders.status, "draft"),
        isNull(tenders.deletedAt),
        isNull(projects.deletedAt),
        // Only rounds still open — a draft on an archived or decided
        // project is a dead row that would 404 from the dashboard.
        inArray(projects.status, ["published", "tendering"]),
      ),
    )
    .orderBy(desc(tenders.updatedAt));
  return rows;
}

// ── builder invites (every round) ────────────────────────────

export interface CreateBuilderInviteInput {
  /** On-platform pick from the directory. */
  builderUserId?: string;
  /** Off-platform invitee. */
  email?: string;
  contactName?: string;
  company?: string;
}

/**
 * Hand-pick a builder for a round. Invitations exist on EVERY round:
 * on a private round the invite list IS the round; on an open round
 * invited builders join free alongside the network spots (which is
 * all "hybrid" ever was — the mode is retired). The runner (the
 * project's ownerId — owner or architect) is the only one who can
 * invite. On-platform picks reference a user; off-platform invites
 * carry the details the runner typed. Every invite mints a single-use
 * token; the link is shareable from the wizard ("copy invite link").
 */
export async function createBuilderInvite(
  runnerId: string,
  projectId: string,
  input: CreateBuilderInviteInput,
): Promise<
  Result<
    TenderBuilderInviteRow & {
      /** The invitation email went out (allowlist-suppressed counts as sent). */
      emailed: boolean;
      /** Project still a draft — the email goes out at publish instead. */
      deferred: boolean;
    }
  >
> {
  const [project] = await db
    .select({
      id: projects.id,
      ownerId: projects.ownerId,
      tenderMode: projects.tenderMode,
      status: projects.status,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);
  if (!project) return fail("not_found", "Project not found.");
  if (project.ownerId !== runnerId) return fail("forbidden", "Not your project.");

  const onPlatform = !!input.builderUserId;
  if (onPlatform) {
    // The invite (and its email) must target an approved builder — the
    // same criteria the directory picker lists. Anything else is an
    // arbitrary userId handed to the action.
    const [target] = await db
      .select({ userId: builderProfiles.userId })
      .from(builderProfiles)
      .where(
        and(
          eq(builderProfiles.userId, input.builderUserId!),
          eq(builderProfiles.approvalStatus, "approved"),
        ),
      )
      .limit(1);
    if (!target) {
      return fail("validation", "Select an approved builder from the directory.");
    }
  } else {
    const email = (input.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail("validation", "Enter a valid email for the builder.");
    }
    input = { ...input, email };
  }

  // Hard per-project ceiling across ALL invite rows (any status), so a
  // revoke-and-recreate loop can't turn one project into an email
  // cannon. Generous: a 5-spot round never needs more than this.
  const [inviteTally] = await db
    .select({ n: count() })
    .from(tenderBuilderInvites)
    .where(eq(tenderBuilderInvites.projectId, projectId));
  if ((inviteTally?.n ?? 0) >= 25) {
    return fail(
      "validation",
      "This project has reached its invitation limit. Contact support if you need more.",
    );
  }

  // No duplicate live invites for the same builder / email.
  const existing = await db
    .select({ id: tenderBuilderInvites.id })
    .from(tenderBuilderInvites)
    .where(
      and(
        eq(tenderBuilderInvites.projectId, projectId),
        inArray(tenderBuilderInvites.status, ["invited", "joined"]),
        onPlatform
          ? eq(tenderBuilderInvites.builderUserId, input.builderUserId!)
          : eq(tenderBuilderInvites.email, input.email!),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    return fail("conflict", "That builder is already invited.");
  }

  const [row] = await db
    .insert(tenderBuilderInvites)
    .values({
      projectId,
      invitedBy: runnerId,
      builderUserId: input.builderUserId ?? null,
      email: input.email ?? null,
      contactName: input.contactName?.trim() || null,
      company: input.company?.trim() || null,
      inviteToken: randomBytes(32).toString("hex"),
    })
    .returning();
  if (!row) return fail("internal", "Could not create the invitation.");

  await recordProjectEvent({
    projectId,
    actorId: runnerId,
    kind: "invite.sent",
    subjectId: row.id,
    summary: `Invited ${row.company ?? row.contactName ?? row.email ?? "a builder"} to tender.`,
  });

  // Invitation email (+ bell notification for on-platform builders).
  // Internally try/catch'd: a flaky send never fails the invite. On a
  // DRAFT project the email is deferred until publish — an invitation
  // to a round that isn't open yet reads as a broken link.
  const deferred = project.status === "draft";
  const emailed = deferred ? false : (await dispatchBuilderInvite(row.id)).emailed;

  return ok({ ...row, emailed, deferred });
}

export async function listBuilderInvites(
  runnerId: string,
  projectId: string,
): Promise<
  Result<
    Array<
      TenderBuilderInviteRow & {
        builderName: string | null;
        /**
         * True when a JOINED builder's business verification is still
         * in progress (profile not yet approved). Invited builders get
         * provisional access on the runner's vouching — the runner
         * sees an amber mark, not a blocked builder.
         */
        verificationPending: boolean;
      }
    >
  >
> {
  const [project] = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return fail("not_found", "Project not found.");
  if (project.ownerId !== runnerId) return fail("forbidden", "Not your project.");

  const rows = await db
    .select({
      invite: tenderBuilderInvites,
      builderCompany: builderProfiles.companyName,
      builderTrading: builderProfiles.tradingName,
      builderApproval: builderProfiles.approvalStatus,
    })
    .from(tenderBuilderInvites)
    .leftJoin(
      builderProfiles,
      eq(builderProfiles.userId, tenderBuilderInvites.builderUserId),
    )
    .where(
      and(
        eq(tenderBuilderInvites.projectId, projectId),
        inArray(tenderBuilderInvites.status, ["invited", "joined"]),
      ),
    )
    .orderBy(desc(tenderBuilderInvites.invitedAt));

  return ok(
    rows.map((r) => ({
      ...r.invite,
      builderName: r.builderTrading ?? r.builderCompany ?? null,
      verificationPending:
        r.invite.status === "joined" && r.builderApproval !== "approved",
    })),
  );
}

export async function revokeBuilderInvite(
  runnerId: string,
  inviteId: string,
): Promise<Result<{ ok: true }>> {
  const [row] = await db
    .select({
      id: tenderBuilderInvites.id,
      projectId: tenderBuilderInvites.projectId,
      status: tenderBuilderInvites.status,
      email: tenderBuilderInvites.email,
      company: tenderBuilderInvites.company,
      contactName: tenderBuilderInvites.contactName,
    })
    .from(tenderBuilderInvites)
    .where(eq(tenderBuilderInvites.id, inviteId))
    .limit(1);
  if (!row) return fail("not_found", "Invitation not found.");

  const [project] = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, row.projectId))
    .limit(1);
  if (!project || project.ownerId !== runnerId) {
    return fail("forbidden", "Not your project.");
  }
  if (row.status === "joined") {
    return fail("conflict", "That builder has already joined the round.");
  }

  await db
    .update(tenderBuilderInvites)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(eq(tenderBuilderInvites.id, inviteId));
  await recordProjectEvent({
    projectId: row.projectId,
    actorId: runnerId,
    kind: "invite.revoked",
    subjectId: inviteId,
    summary: `Withdrew the invitation to ${row.company ?? row.contactName ?? row.email ?? "a builder"}.`,
  });
  return ok({ ok: true });
}

/**
 * Every PENDING builder invitation across a runner's projects in one
 * query — the practice dashboard's "not answered yet" queue rows.
 * Live rounds only; an invitation on a closed round asks for nothing.
 */
export async function listBuilderInvitesForRunner(runnerId: string): Promise<
  Array<{
    inviteId: string;
    projectId: string;
    projectSlug: string;
    projectTitle: string;
    label: string;
    invitedAt: Date;
    remindedAt: Date | null;
  }>
> {
  const rows = await db
    .select({
      inviteId: tenderBuilderInvites.id,
      projectId: projects.id,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      email: tenderBuilderInvites.email,
      company: tenderBuilderInvites.company,
      contactName: tenderBuilderInvites.contactName,
      builderCompany: builderProfiles.companyName,
      invitedAt: tenderBuilderInvites.invitedAt,
      remindedAt: tenderBuilderInvites.remindedAt,
    })
    .from(tenderBuilderInvites)
    .innerJoin(
      projects,
      and(
        eq(projects.id, tenderBuilderInvites.projectId),
        eq(projects.ownerId, runnerId),
        isNull(projects.deletedAt),
        inArray(projects.status, ["published", "tendering"]),
      ),
    )
    .leftJoin(
      builderProfiles,
      eq(builderProfiles.userId, tenderBuilderInvites.builderUserId),
    )
    .where(eq(tenderBuilderInvites.status, "invited"))
    .orderBy(desc(tenderBuilderInvites.invitedAt));
  return rows.map((r) => ({
    inviteId: r.inviteId,
    projectId: r.projectId,
    projectSlug: r.projectSlug,
    projectTitle: r.projectTitle,
    label:
      r.builderCompany ?? r.company ?? r.contactName ?? r.email ?? "A builder",
    invitedAt: r.invitedAt,
    remindedAt: r.remindedAt,
  }));
}

/**
 * Resolve an invite token to its invite + project (for the redemption
 * page). Pure read — the redemption route composes this with the
 * unlock grant, keeping the unlocks module out of this one.
 */
export async function getBuilderInviteByToken(token: string): Promise<
  Result<{
    invite: TenderBuilderInviteRow;
    project: {
      id: string;
      slug: string;
      title: string;
      status: string;
      /** Preview-tier facts for the landing card — the same fields an
       *  open marketplace card shows, so the invitation reads as a
       *  real project, not a mystery link. Never the address. */
      type: string;
      suburb: string | null;
      state: string | null;
      budgetBand: string | null;
    };
    /** Who extended it — practice name preferred. */
    inviterName: string | null;
  }>
> {
  const inviterUsers = alias(users, "inviter_users");
  const [row] = await db
    .select({
      invite: tenderBuilderInvites,
      projectId: projects.id,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      projectStatus: projects.status,
      projectType: projects.type,
      projectSuburb: projects.suburb,
      projectState: projects.state,
      projectBudgetBand: projects.budgetBand,
      inviterName: inviterUsers.name,
      inviterPractice: architectProfiles.practiceName,
    })
    .from(tenderBuilderInvites)
    .innerJoin(projects, eq(projects.id, tenderBuilderInvites.projectId))
    .innerJoin(
      inviterUsers,
      eq(inviterUsers.id, tenderBuilderInvites.invitedBy),
    )
    .leftJoin(
      architectProfiles,
      eq(architectProfiles.userId, tenderBuilderInvites.invitedBy),
    )
    .where(eq(tenderBuilderInvites.inviteToken, token))
    .limit(1);
  if (!row) return fail("not_found", "This invitation link is not valid.");
  return ok({
    invite: row.invite,
    project: {
      id: row.projectId,
      slug: row.projectSlug,
      title: row.projectTitle,
      status: row.projectStatus,
      type: row.projectType,
      suburb: row.projectSuburb,
      state: row.projectState,
      budgetBand: row.projectBudgetBand,
    },
    inviterName: row.inviterPractice ?? row.inviterName ?? null,
  });
}

/** Mark an invite joined by a builder (called after the unlock grant). */
export async function markBuilderInviteJoined(
  inviteId: string,
  builderUserId: string,
): Promise<void> {
  const [row] = await db
    .update(tenderBuilderInvites)
    .set({
      status: "joined",
      builderUserId,
      respondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tenderBuilderInvites.id, inviteId))
    .returning({
      projectId: tenderBuilderInvites.projectId,
      email: tenderBuilderInvites.email,
      company: tenderBuilderInvites.company,
      contactName: tenderBuilderInvites.contactName,
    });
  if (row) {
    const [profile] = await db
      .select({ companyName: builderProfiles.companyName })
      .from(builderProfiles)
      .where(eq(builderProfiles.userId, builderUserId))
      .limit(1);
    await recordProjectEvent({
      projectId: row.projectId,
      actorId: builderUserId,
      kind: "invite.joined",
      subjectId: inviteId,
      summary: `${profile?.companyName ?? row.company ?? row.contactName ?? row.email ?? "An invited builder"} accepted the invitation and took a spot.`,
    });
  }
}
