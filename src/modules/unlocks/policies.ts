/**
 * unlocks · policies.
 *
 * Builder-only actions. Owners and admins are excluded from the unlock
 * mechanic entirely (owners see their own projects; admins use the
 * admin console).
 */

export type ActorContext = {
  id: string;
  role: "project_owner" | "builder" | "admin";
};

/** Only builders can unlock projects. */
export function canUnlock(actor: ActorContext): boolean {
  return actor.role === "builder";
}

/** Only builders can save / unsave. */
export function canSave(actor: ActorContext): boolean {
  return actor.role === "builder";
}
