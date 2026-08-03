/**
 * admin · policies.
 *
 * Per-action authorization checks. Every server action calls a policy
 * BEFORE invoking a service function — never rely on UI hiding to
 * enforce access.
 *
 * Currently the admin surface is uniformly gated by role === "admin":
 * if you can reach `/admin`, you can do anything the admin surface
 * exposes. That's intentional for Phase 4 — finer-grained sub-roles
 * (read-only auditor, payments-only) come later if/when we onboard
 * non-engineering staff.
 *
 * The proxy gates the route, the layout double-checks the session,
 * and every server action calls `canAccessAdmin` on the session role
 * before delegating. Three layers, one policy.
 */

export type AdminActor = {
  id: string;
  role: "project_owner" | "builder" | "admin" | "architect" | null | undefined;
};

export function canAccessAdmin(actor: AdminActor): boolean {
  return actor.role === "admin";
}
