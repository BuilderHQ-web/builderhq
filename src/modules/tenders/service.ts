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
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { fail, ok, type Result } from "@/lib/result";

import {
  tenders,
  tenderCostLines,
  type TenderRow,
  type TenderCostLineRow,
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

import { unlocks } from "@/modules/unlocks/schema";
import { projects } from "@/modules/projects/schema";
import { users } from "@/modules/users";
import { builderProfiles } from "@/modules/profiles/schema";
import { documents } from "@/modules/documents/schema";

import { dispatchTenderEvent } from "./dispatch";
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

// ── readiness / aggregation ──────────────────────────────────────────────

export function computeReadiness(
  t: TenderRow,
  lines: TenderCostLineRow[],
): SubmissionReadiness {
  const missing: SubmissionReadiness["missing"] = [];
  if (!t.totalPriceAud || t.totalPriceAud <= 0) missing.push("total_price");
  if (!t.durationWeeks || t.durationWeeks <= 0) missing.push("duration");
  if (!t.validityDays || t.validityDays <= 0) missing.push("validity");

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
    .values({ builderId, projectId, status: "draft" })
    .returning();
  if (!row) return fail("internal", "Failed to create tender draft.");

  return ok({ ...row, costLines: [] });
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

    const readiness = computeReadiness(row, lines);
    if (!readiness.canSubmit) {
      return fail(
        "validation",
        "Tender is missing required fields.",
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
    return fail("forbidden", "Not your project.");
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
  // and a second one would just be confusing.
  if (to === "shortlisted" || to === "awarded" || to === "rejected") {
    await dispatchTenderEvent(to, tenderId);
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
