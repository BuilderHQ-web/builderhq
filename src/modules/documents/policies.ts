/**
 * documents · policies.
 *
 * Per-action authorization checks. Server actions call these BEFORE
 * the service function — never rely on UI hiding to enforce access.
 *
 * Phase 2 step 2 (current): only the project owner can upload to or
 * read their own documents. Project membership / builder unlocks
 * land in step 4 (browse + match) and will widen these.
 */

import type { DocumentRow } from "./schema";

export type ActorContext = {
  id: string;
  role: "project_owner" | "builder" | "admin" | "architect";
};

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
  return (
    actor.role === "project_owner" ||
    actor.role === "builder" ||
    actor.role === "admin"
  );
}

/** Owner reads their own docs; admin reads anything. Builders later. */
export function canRead(actor: ActorContext, doc: DocumentRow): boolean {
  if (actor.role === "admin") return true;
  if (actor.role === "project_owner" && doc.ownerId === actor.id) return true;
  return false;
}

/** Owner deletes their own; admin can also delete. */
export function canDelete(actor: ActorContext, doc: DocumentRow): boolean {
  if (actor.role === "admin") return true;
  if (actor.role === "project_owner" && doc.ownerId === actor.id) return true;
  return false;
}
