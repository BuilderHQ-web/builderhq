"use server";

/**
 * Scope engine — admin server actions. The ops crew starts runs,
 * advances them (the client loops `tick` while moreWork), and
 * delivers verdicts on the review surface. Admin only: the scope
 * engine is an internal instrument until S2 hands the result to
 * owners.
 */

import { auth } from "@/modules/auth";
import { fail, ok, type Result } from "@/lib/result";
import {
  startRun,
  processRunTick,
  retryFailedDocuments,
  TICK_BUDGET_MS,
  reviewItem,
  reopenItem,
  reopenConflict,
  reopenCapture,
  addItem,
  promoteCapture,
  dismissCapture,
  reviewConflict,
  approveRun,
  bulkConfirmPending,
  resolveGap,
  bulkResolveOpen,
  requestReread,
  completeOwnerReview,
  type GapResolutionKind,
  type ItemVerdictInput,
  type ScopeRunRow,
  type ScopeRunItemRow,
  type ScopeGapResolutionRow,
} from "@/modules/scope-engine";

async function requireAdmin(): Promise<Result<string>> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || u.role !== "admin") {
    return fail("forbidden", "Admin only.");
  }
  return ok(u.id);
}

export async function startScopeRunAction(
  projectId: string,
): Promise<Result<ScopeRunRow>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return startRun(projectId, a.value);
}

/** One bounded slice of work — the client loops while moreWork. The
 *  budget stays under the serverless action ceiling (the desk page
 *  declares maxDuration = 300). It was 50_000, below the synthesis
 *  floor, so the desk's re-tick button could never finish a run
 *  either — the same defect the cron carried. */
export async function retryFailedDocumentsAction(
  runId: string,
): Promise<Result<{ requeued: number }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return retryFailedDocuments(runId);
}

export async function tickScopeRunAction(
  runId: string,
): Promise<
  Result<{
    status: string;
    moreWork: boolean;
    locked?: true;
    retryInSec?: number;
  }>
> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return processRunTick(runId, TICK_BUDGET_MS);
}

export async function reviewScopeItemAction(
  itemRowId: string,
  verdict: ItemVerdictInput,
): Promise<Result<ScopeRunItemRow>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return reviewItem(a.value, itemRowId, verdict);
}

/**
 * Undo a desk verdict, returning the line to pending.
 *
 * The original judgement is kept in the review log and a reversal is
 * appended beside it — the accuracy metrics read final state per
 * subject, so a taken-back verdict stops counting rather than
 * disappearing.
 */
export async function reopenScopeItemAction(
  itemRowId: string,
): Promise<Result<{ reopened: true; removed: boolean }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return reopenItem(a.value, itemRowId);
}

export async function reopenScopeConflictAction(
  conflictId: string,
): Promise<Result<{ reopened: true }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return reopenConflict(a.value, conflictId);
}

export async function reopenCaptureAction(
  captureId: string,
): Promise<Result<{ reopened: true; extensionRetired: boolean; stillUsedBy: number }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return reopenCapture(a.value, captureId);
}

export async function addScopeItemAction(
  runId: string,
  input: { itemId: string; status: "evidenced" | "gap"; note: string | null },
): Promise<Result<ScopeRunItemRow>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return addItem(a.value, runId, input);
}

export async function promoteCaptureAction(
  captureId: string,
  tier: "extension" | "core" = "extension",
): Promise<Result<{ itemId: string }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  const r = await promoteCapture(a.value, captureId, tier);
  if (!r.ok) return r;
  return { ok: true, value: { itemId: r.value.itemId } };
}

export async function dismissCaptureAction(
  captureId: string,
): Promise<Result<{ ok: true }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return dismissCapture(a.value, captureId);
}

export async function reviewScopeConflictAction(
  conflictId: string,
  opsStatus: "resolved" | "dismissed",
  opsNote: string | null,
): Promise<Result<{ ok: true }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return reviewConflict(a.value, conflictId, opsStatus, opsNote);
}

export async function approveScopeRunAction(
  runId: string,
): Promise<Result<{ ok: true }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return approveRun(a.value, runId);
}

/** Sweep every line still awaiting a verdict to confirmed. */
export async function bulkConfirmScopeAction(
  runId: string,
  /** Also confirm evidenced lines the model scored below the
   *  confidence floor. The desk asks for this deliberately, from its
   *  own button, and the sweep is recorded as having included them. */
  includeLowConfidence = false,
): Promise<Result<{ confirmed: number }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return bulkConfirmPending(a.value, runId, { includeLowConfidence });
}

// ── owner-side (runner) actions — the review desk's writes ──────────────

const RUNNER_ROLES = new Set(["project_owner", "architect", "admin"]);

async function requireRunner(): Promise<Result<string>> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.role || !RUNNER_ROLES.has(u.role)) {
    return fail("forbidden", "Only the project runner can do this.");
  }
  return ok(u.id);
}

export async function resolveScopeGapAction(
  projectId: string,
  itemId: string,
  input: { resolution: GapResolutionKind; amountAud?: number | null; note?: string | null },
): Promise<Result<ScopeGapResolutionRow>> {
  const a = await requireRunner();
  if (!a.ok) return a;
  return resolveGap(a.value, projectId, itemId, input);
}

export async function bulkResolveOpenGapsAction(
  projectId: string,
): Promise<Result<{ resolved: number }>> {
  const a = await requireRunner();
  if (!a.ok) return a;
  return bulkResolveOpen(a.value, projectId);
}

export async function requestScopeRereadAction(
  projectId: string,
): Promise<Result<{ runId: string }>> {
  const a = await requireRunner();
  if (!a.ok) return a;
  return requestReread(projectId, a.value);
}

export async function completeScopeReviewAction(
  projectId: string,
): Promise<
  Result<
    | { published: true; slug: string }
    | { addendum: number; summary: string }
  >
> {
  const a = await requireRunner();
  if (!a.ok) return a;
  return completeOwnerReview(projectId, a.value);
}
