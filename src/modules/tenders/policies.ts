/**
 * tenders · policies.
 *
 * Authorisation gates for tender actions. Every server action calls
 * one of these BEFORE the service function — UI hiding alone is not
 * enforcement.
 *
 * Two actor sides: builder (creates + submits + withdraws their own
 * tender), owner (shortlists / awards / rejects on their projects).
 */

import type { TenderRow } from "./schema";

export type ActorContext = {
  id: string;
  role: "project_owner" | "builder" | "admin" | "architect";
};

/** Roles that run tender rounds. Architects own their clients'
 *  project rows outright, so every owner-side gate treats the two
 *  identically; the ownership match does the real work. */
function isRunner(role: ActorContext["role"]): boolean {
  return role === "project_owner" || role === "architect";
}

/** Builders can create tenders on projects they've unlocked.
 *  The unlock check is enforced inside the service (the policy
 *  layer just confirms the role). */
export function canCreateTender(actor: ActorContext): boolean {
  return actor.role === "builder" || actor.role === "admin";
}

/** Builder can edit/withdraw their own tender (while in draft / submitted /
 *  shortlisted). Admins can always. */
export function canEditTender(
  actor: ActorContext,
  tender: TenderRow,
): boolean {
  if (actor.role === "admin") return true;
  if (actor.role !== "builder") return false;
  if (tender.builderId !== actor.id) return false;
  // Withdrawn / awarded / rejected are terminal for the builder.
  return tender.status === "draft";
}

export function canWithdrawTender(
  actor: ActorContext,
  tender: TenderRow,
): boolean {
  if (actor.role === "admin") return true;
  if (actor.role !== "builder") return false;
  if (tender.builderId !== actor.id) return false;
  return tender.status === "submitted" || tender.status === "shortlisted";
}

/** The project runner can move tenders on their projects through the
 *  decision states. Cross-project changes are forbidden. Withdrawn is
 *  terminal (the builder's own act); which transitions are legal from
 *  any other status is the service's decisionTransition table — e.g.
 *  rejected can only move back to submitted, never straight to
 *  awarded. */
export function canDecideOnTender(
  actor: ActorContext,
  tender: TenderRow,
  projectOwnerId: string,
): boolean {
  if (actor.role === "admin") return true;
  if (!isRunner(actor.role)) return false;
  if (projectOwnerId !== actor.id) return false;
  return tender.status !== "withdrawn";
}

/** Read access — builder reads their own; the project runner reads
 *  tenders on their projects (regardless of status, even withdrawn
 *  for audit). */
export function canReadTender(
  actor: ActorContext,
  tender: TenderRow,
  projectOwnerId: string,
): boolean {
  if (actor.role === "admin") return true;
  if (actor.role === "builder") return tender.builderId === actor.id;
  if (isRunner(actor.role)) return projectOwnerId === actor.id;
  return false;
}
