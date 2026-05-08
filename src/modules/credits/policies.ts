/**
 * credits · policies.
 *
 * Authorisation gates for FBA actions. Server actions call these
 * before service functions — UI hiding alone is not enforcement.
 */

export type ActorContext = {
  id: string;
  role: "project_owner" | "builder" | "admin";
};

/** Builders can read their own FBA status; admins can read any. */
export function canReadStatus(actor: ActorContext, builderId: string): boolean {
  if (actor.role === "admin") return true;
  return actor.role === "builder" && actor.id === builderId;
}

/** Only admins grant or revoke FBA. (Auto-grants on onboarding bypass
 *  this — they go through a service-internal helper, not an action.) */
export function canGrant(actor: ActorContext): boolean {
  return actor.role === "admin";
}

export function canRevoke(actor: ActorContext): boolean {
  return actor.role === "admin";
}
