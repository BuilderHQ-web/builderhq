"use server";

/**
 * Server actions for the tenders module — both builder side
 * (create/update/submit/withdraw + tender doc list) and owner side
 * (shortlist/award/reject).
 *
 * Pattern: thin adapter — auth + policy check, then service call.
 * Tender doc uploads reuse the existing documents server actions
 * (init/complete/download/delete) — those already accept tenderId on
 * init via InitUploadInput.
 */

import { auth } from "@/modules/auth";
import {
  createDraft,
  updateDraft,
  setCostLines,
  submit,
  withdraw,
  shortlist,
  award,
  reject,
  moveBackToSubmitted,
  getActiveTenderForBuilder,
  getTenderForBuilder,
  getProjectOwnerForTender,
  computeReadiness,
  checklistProgress,
  listResponsesForTender,
  saveTenderResponses,
  canCreateTender,
  canEditTender,
  canWithdrawTender,
  canDecideOnTender,
  type ActorContext,
  type CostLineInput,
  type SubmissionReadiness,
  type ChecklistProgress,
  type Tender,
  type TenderWithLines,
  type UpdateTenderInput,
} from "@/modules/tenders";
import {
  listForTenderUnchecked,
  type Document,
} from "@/modules/documents";
import { fail, ok, type Result } from "@/lib/result";

async function requireActor(): Promise<Result<ActorContext>> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) {
    return fail("forbidden", "Sign in required.");
  }
  return ok({ id: user.id, role: user.role });
}

// ── builder actions ──────────────────────────────────────────────────────

export async function startTenderAction(
  projectId: string,
): Promise<Result<TenderWithLines>> {
  const a = await requireActor();
  if (!a.ok) return a;
  if (!canCreateTender(a.value)) {
    return fail("forbidden", "Only builders can submit tenders.");
  }
  return createDraft(a.value.id, projectId);
}

export async function updateTenderAction(
  tenderId: string,
  patch: UpdateTenderInput,
): Promise<Result<TenderWithLines>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const t = await getTenderForBuilder(a.value.id, tenderId);
  if (!t) return fail("not_found", "Tender not found.");
  if (!canEditTender(a.value, t)) {
    return fail("forbidden", "This tender can no longer be edited.");
  }
  return updateDraft(a.value.id, tenderId, patch);
}

export async function setTenderCostLinesAction(
  tenderId: string,
  lines: CostLineInput[],
): Promise<Result<{ ok: true; readiness: SubmissionReadiness }>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const t = await getTenderForBuilder(a.value.id, tenderId);
  if (!t) return fail("not_found", "Tender not found.");
  if (!canEditTender(a.value, t)) {
    return fail("forbidden", "This tender can no longer be edited.");
  }
  const r = await setCostLines(a.value.id, tenderId, lines);
  if (!r.ok) return r;
  // Re-fetch to compute readiness with the new lines.
  const refreshed = await getTenderForBuilder(a.value.id, tenderId);
  if (!refreshed) return fail("internal", "Tender vanished after save.");
  return ok({
    ok: true as const,
    readiness: computeReadiness(refreshed, refreshed.costLines),
  });
}

export async function submitTenderAction(
  tenderId: string,
): Promise<Result<TenderWithLines>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const t = await getTenderForBuilder(a.value.id, tenderId);
  if (!t) return fail("not_found", "Tender not found.");
  if (!canEditTender(a.value, t)) {
    return fail("conflict", "This tender has already been submitted.");
  }
  return submit(a.value.id, tenderId);
}

export async function withdrawTenderAction(
  tenderId: string,
): Promise<Result<Tender>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const t = await getTenderForBuilder(a.value.id, tenderId);
  if (!t) return fail("not_found", "Tender not found.");
  if (!canWithdrawTender(a.value, t)) {
    return fail("conflict", "This tender can't be withdrawn from its current state.");
  }
  return withdraw(a.value.id, tenderId);
}

/**
 * Builder fetches their existing tender for a project (to resume the
 * draft form). Returns null if none exists.
 */
export async function getMyTenderAction(
  projectId: string,
): Promise<Result<TenderWithLines | null>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const t = await getActiveTenderForBuilder(a.value.id, projectId);
  return ok(t);
}

// ── owner actions ────────────────────────────────────────────────────────

export async function shortlistTenderAction(
  tenderId: string,
): Promise<Result<Tender>> {
  return ownerDecision(tenderId, shortlist);
}

export async function awardTenderAction(
  tenderId: string,
  options: { rejectOthers?: boolean } = {},
): Promise<
  Result<{ awarded: Tender; rejectedIds: string[]; rejectedFailedIds: string[] }>
> {
  // Award the chosen tender first.
  const awardResult = await ownerDecision(tenderId, award);
  if (!awardResult.ok) return awardResult;

  // No cascade requested — return early with empty bookkeeping.
  if (!options.rejectOthers) {
    return ok({
      awarded: awardResult.value,
      rejectedIds: [],
      rejectedFailedIds: [],
    });
  }

  // Cascade: reject every other still-live tender on this project. We
  // re-resolve project ownership + walk siblings via the same policy
  // that ownerDecision uses, so a stale tender id can't poke into
  // someone else's project.
  const a = await requireActor();
  if (!a.ok) return a;

  const { db } = await import("@/lib/db");
  const { tenders } = await import("@/modules/tenders/schema");
  const { projects } = await import("@/modules/projects/schema");
  const { and, eq, ne, inArray, isNull } = await import("drizzle-orm");

  const projectId = awardResult.value.projectId;
  // Belt + braces — confirm caller owns this project before touching siblings.
  const [proj] = await db
    .select({ ownerId: projects.ownerId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!proj || proj.ownerId !== a.value.id) {
    // Award already landed; report success on award + empty cascade.
    return ok({
      awarded: awardResult.value,
      rejectedIds: [],
      rejectedFailedIds: [],
    });
  }

  const siblings = await db
    .select({ id: tenders.id })
    .from(tenders)
    .where(
      and(
        eq(tenders.projectId, projectId),
        ne(tenders.id, tenderId),
        inArray(tenders.status, ["submitted", "shortlisted"]),
        isNull(tenders.deletedAt),
      ),
    );

  const rejectedIds: string[] = [];
  const rejectedFailedIds: string[] = [];
  for (const s of siblings) {
    const r = await reject(a.value.id, s.id);
    if (r.ok) rejectedIds.push(s.id);
    else rejectedFailedIds.push(s.id);
  }
  return ok({ awarded: awardResult.value, rejectedIds, rejectedFailedIds });
}

export async function rejectTenderAction(
  tenderId: string,
): Promise<Result<Tender>> {
  return ownerDecision(tenderId, reject);
}

export async function moveTenderToSubmittedAction(
  tenderId: string,
): Promise<Result<Tender>> {
  return ownerDecision(tenderId, moveBackToSubmitted);
}

async function ownerDecision(
  tenderId: string,
  fn: (ownerId: string, tenderId: string) => Promise<Result<Tender>>,
): Promise<Result<Tender>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const projectOwner = await getProjectOwnerForTender(tenderId);
  if (!projectOwner) return fail("not_found", "Tender not found.");
  // We need the tender row for the policy. Cheap re-fetch here is
  // fine — service does the same lookup again.
  // The service handles the actual permission via the (ownerId,
  // tenderId, projectOwnerId match) check, but we still gate at
  // policy for clarity + to fail fast.
  const t = await getTenderRowForActor(a.value, tenderId, projectOwner);
  if (!t.ok) return t;
  if (!canDecideOnTender(a.value, t.value, projectOwner)) {
    return fail("forbidden", "Not allowed.");
  }
  return fn(a.value.id, tenderId);
}

async function getTenderRowForActor(
  _actor: ActorContext,
  tenderId: string,
  _projectOwner: string,
): Promise<Result<Tender>> {
  // Fetch via builder accessor to keep the policy honest. The actual
  // canDecideOnTender uses status, which is read-safe.
  const { db } = await import("@/lib/db");
  const { tenders } = await import("@/modules/tenders");
  const { eq } = await import("drizzle-orm");
  const [row] = await db.select().from(tenders).where(eq(tenders.id, tenderId));
  if (!row) return fail("not_found", "Tender not found.");
  return ok(row);
}

// ── tender docs (thin wrappers around documents.listForTender) ───────────

/**
 * Builder reads the docs they've attached to their own tender (any
 * status — pending/active/failed). Used by the form to render the
 * docs list inline. Owner reads via the comparison view; for that
 * path we use listActiveForTenderForOwnerAction below.
 */
export async function listMyTenderDocsAction(
  tenderId: string,
): Promise<Result<Document[]>> {
  const a = await requireActor();
  if (!a.ok) return a;
  // Builder must own this tender (or be admin).
  const t = await getTenderForBuilder(a.value.id, tenderId);
  if (a.value.role !== "admin" && !t) {
    return fail("forbidden", "Not your tender.");
  }
  const docs = await listForTenderUnchecked(tenderId);
  return ok(docs);
}

/**
 * Owner reads active docs on a submitted/shortlisted/awarded tender.
 * Caller must own the project the tender belongs to.
 */
export async function listActiveTenderDocsForOwnerAction(
  tenderId: string,
): Promise<Result<Document[]>> {
  const a = await requireActor();
  if (!a.ok) return a;
  if (a.value.role !== "project_owner" && a.value.role !== "admin") {
    return fail("forbidden", "Not allowed.");
  }
  const projectOwner = await getProjectOwnerForTender(tenderId);
  if (!projectOwner) return fail("not_found", "Tender not found.");
  if (a.value.role !== "admin" && projectOwner !== a.value.id) {
    return fail("forbidden", "Not your project.");
  }
  const docs = await listForTenderUnchecked(tenderId, { activeOnly: true });
  return ok(docs);
}


// ── submission checklist ─────────────────────────────────────────────────

/**
 * Autosave a batch of checklist answers. Returns fresh checklist
 * progress so the wizard's rail and the submit gate stay live.
 */
export async function saveTenderResponsesAction(
  tenderId: string,
  entries: Array<{ qid: string; value: unknown }>,
): Promise<Result<{ saved: number; checklist: ChecklistProgress | null }>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const t = await getTenderForBuilder(a.value.id, tenderId);
  if (!t) return fail("not_found", "Tender not found.");
  if (!canEditTender(a.value, t)) {
    return fail("forbidden", "This tender can no longer be edited.");
  }
  return saveTenderResponses(a.value.id, tenderId, entries);
}

/** Current checklist progress for a tender (for the form's gate card). */
export async function getTenderChecklistAction(
  tenderId: string,
): Promise<Result<ChecklistProgress | null>> {
  const a = await requireActor();
  if (!a.ok) return a;
  const t = await getTenderForBuilder(a.value.id, tenderId);
  if (!t) return fail("not_found", "Tender not found.");
  const responses = await listResponsesForTender(a.value.id, tenderId);
  if (!responses.ok) return responses;
  return ok(checklistProgress(t, responses.value));
}
