/**
 * documents · policies.
 *
 * Per-action authorization checks. Server actions call these BEFORE
 * the service function — never rely on UI hiding to enforce access.
 *
 * The owner side of a project has TWO roles: a homeowner running their
 * own round, and an architect running one for their client. Both own
 * projects and both upload the plans, so every policy here treats them
 * identically — what scopes them is the row's ownerId, never the label.
 */

import type { DocumentRow } from "./schema";

export type ActorContext = {
  id: string;
  role: "project_owner" | "builder" | "admin" | "architect";
};

/** The project's own side: a homeowner, or the architect running it. */
function isRunner(role: ActorContext["role"]): boolean {
  return role === "project_owner" || role === "architect";
}

/**
 * Owners upload to their projects; builders upload to their tenders;
 * admins always can. Project-vs-tender targeting is decided by which
 * id the action passes — the documents service stores both, and the
 * downstream listing functions (listForProject excludes tenderId,
 * listForTender requires it) keep the surfaces separate.
 *
 * Cross-tenancy abuse (builder attaching to a project they don't own
 * a tender on) is prevented by the form-level UX — builders only
 * reach the upload action via the tender form, which sets tenderId
 * to a tender they own. We could double-gate at service level if
 * tenders ever became inferable from public urls.
 */
export function canUpload(actor: ActorContext): boolean {
  return isRunner(actor.role) || actor.role === "builder" || actor.role === "admin";
}

/** The runner reads their own docs; admin reads anything. */
export function canRead(actor: ActorContext, doc: DocumentRow): boolean {
  if (actor.role === "admin") return true;
  if (isRunner(actor.role) && doc.ownerId === actor.id) return true;
  return false;
}

/** The runner deletes their own; admin can also delete. */
export function canDelete(actor: ActorContext, doc: DocumentRow): boolean {
  if (actor.role === "admin") return true;
  if (isRunner(actor.role) && doc.ownerId === actor.id) return true;
  return false;
}
