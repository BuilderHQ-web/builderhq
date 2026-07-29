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
  reviewItem,
  addItem,
  reviewConflict,
  approveRun,
  resolveGap,
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
 *  budget stays under the serverless action ceiling. */
export async function tickScopeRunAction(
  runId: string,
): Promise<Result<{ status: string; moreWork: boolean }>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return processRunTick(runId, 50_000);
}

export async function reviewScopeItemAction(
  itemRowId: string,
  verdict: ItemVerdictInput,
): Promise<Result<ScopeRunItemRow>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return reviewItem(a.value, itemRowId, verdict);
}

export async function addScopeItemAction(
  runId: string,
  input: { itemId: string; status: "evidenced" | "gap"; note: string | null },
): Promise<Result<ScopeRunItemRow>> {
  const a = await requireAdmin();
  if (!a.ok) return a;
  return addItem(a.value, runId, input);
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
  Result<{ published: true } | { addendum: number; summary: string }>
> {
  const a = await requireRunner();
  if (!a.ok) return a;
  return completeOwnerReview(projectId, a.value);
}
