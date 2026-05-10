/**
 * verification · policies.
 *
 * Verification rows are private operational data — only the builder
 * themselves and admins should ever read raw responses. The public
 * profile only ever sees the derived "verified" boolean (via
 * getLockState).
 */

export type ActorContext = {
  id: string;
  role: "project_owner" | "builder" | "admin";
};

/** Builder reads their own; admin reads anyone's. */
export function canReadVerification(
  actor: ActorContext,
  builderId: string,
): boolean {
  if (actor.role === "admin") return true;
  return actor.id === builderId;
}

/** Only the builder themselves can trigger their own verification. */
export function canTriggerVerification(
  actor: ActorContext,
  builderId: string,
): boolean {
  if (actor.role === "admin") return true;
  if (actor.role !== "builder") return false;
  return actor.id === builderId;
}
