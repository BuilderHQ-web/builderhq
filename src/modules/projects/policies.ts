/**
 * projects · policies.
 *
 * Per-action authorization checks. Server actions call these BEFORE
 * the service function — never rely on UI hiding to enforce access.
 */

import type { ProjectRow } from "./schema";

export type ActorContext = {
  id: string;
  role: "project_owner" | "builder" | "admin";
};

/** Owners can create projects; admins always can. */
export function canCreate(actor: ActorContext): boolean {
  return actor.role === "project_owner" || actor.role === "admin";
}

/** Owner can edit their own; admin always can. */
export function canEdit(actor: ActorContext, project: ProjectRow): boolean {
  if (actor.role === "admin") return true;
  if (actor.role === "project_owner" && project.ownerId === actor.id) return true;
  return false;
}

/** Owner can publish their own; admin always can. */
export function canPublish(actor: ActorContext, project: ProjectRow): boolean {
  return canEdit(actor, project);
}

/** Owner can soft-delete their own; admin always can. */
export function canDelete(actor: ActorContext, project: ProjectRow): boolean {
  return canEdit(actor, project);
}

/**
 * Read access: owner reads their own at any status; admin reads
 * everything; any signed-in user reads published / tendering projects.
 * Preview-vs-full gating per builder unlock lands in Phase 2 step 4.
 */
export function canRead(actor: ActorContext, project: ProjectRow): boolean {
  if (actor.role === "admin") return true;
  if (project.ownerId === actor.id) return true;
  if (project.status === "published" || project.status === "tendering") return true;
  return false;
}
