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
  type ItemVerdictInput,
  type ScopeRunRow,
  type ScopeRunItemRow,
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
