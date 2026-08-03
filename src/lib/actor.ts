/**
 * Actor resolution — Auth.js session OR ads-funnel soft-auth cookie.
 *
 * Most server actions only ever care about the Auth.js session
 * (signed-in users in the main app). The /start ads funnel introduces
 * a second, lower-privilege identity: a soft-auth cookie that pins
 * an unverified user to a single draft project until they click the
 * magic link.
 *
 * Two entry points:
 *
 *   · `requireActor()`             — Auth.js session only. Existing
 *                                    callers continue to work
 *                                    unchanged.
 *   · `requireActorForProject(id)` — Session first, then soft-auth
 *                                    cookie iff it pins to THIS
 *                                    project. Use for project edits +
 *                                    publishability checks that the
 *                                    funnel wizard performs.
 *
 * Critical rule: project mutations that should ALWAYS require a
 * verified email (publish, delete, owner-only marketplace actions)
 * MUST stay on `requireActor()`. Soft-auth never gets those.
 */

import "server-only";

import { auth } from "@/modules/auth";
import { fail, ok, type Result } from "@/lib/result";
import { readAdsFunnelCookie } from "@/lib/ads-funnel-cookie";

export interface ActorContext {
  id: string;
  role: "project_owner" | "builder" | "admin" | "architect";
  /** Session email — null on soft-auth (draft) actors. Used by flows
   *  that bind an artifact to a mailbox (participant claims). */
  email: string | null;
  /** "session" = Auth.js JWT (verified user).
   *  "draft"   = ads-funnel soft-auth cookie (unverified, single
   *              project scope). */
  mode: "session" | "draft";
}

/** Auth.js session only. Returns 'forbidden' for anonymous callers. */
export async function requireActor(): Promise<Result<ActorContext>> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.role) {
    return fail("forbidden", "Sign in required.");
  }
  return ok({ id: u.id, role: u.role, email: u.email ?? null, mode: "session" });
}

/**
 * Resolve an actor authorised for the given project id. Falls back
 * to the ads-funnel soft-auth cookie iff it pins to this exact
 * project id; otherwise behaves like `requireActor()`.
 *
 * This is project-scoped on purpose: a soft-auth cookie issued for
 * project A cannot edit project B even if both belong to the same
 * (unverified) user.
 */
export async function requireActorForProject(
  projectId: string,
): Promise<Result<ActorContext>> {
  const session = await auth();
  const u = session?.user;
  if (u?.id && u.role) {
    return ok({ id: u.id, role: u.role, email: u.email ?? null, mode: "session" });
  }
  const cookie = await readAdsFunnelCookie();
  if (cookie.ok && cookie.value.projectId === projectId) {
    return ok({
      id: cookie.value.userId,
      role: "project_owner",
      email: null,
      mode: "draft",
    });
  }
  return fail("forbidden", "Sign in required.");
}
