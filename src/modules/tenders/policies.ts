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
  role: "project_owner" | "builder" | "admin";
};

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

/** Owner can move tenders on their projects through the decision
 *  states. Cross-project changes are forbidden. */
export function canDecideOnTender(
  actor: ActorContext,
  tender: TenderRow,
  projectOwnerId: string,
): boolean {
  if (actor.role === "admin") return true;
  if (actor.role !== "project_owner") return false;
  if (projectOwnerId !== actor.id) return false;
  // Withdrawn / rejected are terminal — no further owner actions.
  return tender.status !== "withdrawn" && tender.status !== "rejected";
}

/** Read access — builder reads their own; owner reads tenders on
 *  their projects (regardless of status, even withdrawn for audit). */
export function canReadTender(
  actor: ActorContext,
  tender: TenderRow,
  projectOwnerId: string,
): boolean {
  if (actor.role === "admin") return true;
  if (actor.role === "builder") return tender.builderId === actor.id;
  if (actor.role === "project_owner") return projectOwnerId === actor.id;
  return false;
}
