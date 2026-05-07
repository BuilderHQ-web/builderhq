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
  role: "project_owner" | "builder" | "admin";
};

/** Owner can upload to their own project; admin always can. */
export function canUpload(actor: ActorContext): boolean {
  return actor.role === "project_owner" || actor.role === "admin";
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
