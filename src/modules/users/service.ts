/**
 * users · service layer.
 *
 * Business logic that belongs to the canonical user row. Currently this
 * module owns account deletion — the auth module owns sign-up, sign-in,
 * password, and email-verify flows, but deletion is intentionally here
 * because:
 *
 *   - It mutates only the users table (and its dependent profile rows)
 *     not the auth-specific tables (accounts, sessions, verification
 *     tokens — those cascade automatically).
 *   - It's invoked from BOTH user-side (settings danger zone) AND
 *     admin-side (admin user detail). Both server actions sit on top
 *     of the same primitive.
 *
 * Soft-delete model:
 *
 *   We do NOT hard-delete users. Hard-deleting cascades into projects,
 *   tenders, conversations etc. — the OTHER party of every historical
 *   interaction loses their data, which is the wrong default for a
 *   marketplace where contracts and decisions hinge on records.
 *
 *   Instead we call the SQL function `redact_user(id)` (defined in
 *   migration 0014) which:
 *     1. Scrubs PII on the user row (email → stub, name/phone → null)
 *     2. Marks deleted_at = now()
 *     3. Sets status = 'suspended' so the credentials provider rejects
 *        any future login attempt
 *     4. Scrubs PII on builder_profiles / project_owner_profiles
 *     5. Leaves relational rows alone — projects, tenders, unlocks,
 *        conversations all survive with a "Deleted user" label.
 *
 *   Truly erasing all traces (GDPR/Privacy Act erasure) is a separate
 *   manual path: an engineer runs DELETE FROM users WHERE id = ?, and
 *   the FK cascades remove everything. We never expose that to admins.
 */

import "server-only";
import { verify } from "@node-rs/argon2";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";

import { users } from "./schema";

/**
 * Internal primitive. Invokes the `redact_user(uuid)` SQL function which
 * does the heavy lifting (PII scrub, deleted_at, status flip, profile
 * redaction). Idempotent — calling on an already-deleted user is a no-op
 * on the SQL side, we just return ok.
 *
 * Not exported through the module index — callers must use one of the
 * gated wrappers below (`deleteOwnAccount` / `forceDeleteAccount`).
 */
async function softDeleteUser(userId: string): Promise<Result<{ userId: string }>> {
  try {
    await db.execute(sql`SELECT redact_user(${userId}::uuid)`);
    logger.info(
      { event: "users.soft_deleted", userId },
      "user soft-deleted (PII scrubbed, status=suspended)",
    );
    return ok({ userId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "users.soft_delete_failed", userId, msg },
      "redact_user() invocation failed",
    );
    return fail(
      "internal",
      "Account deletion failed. We've logged it — please contact support.",
    );
  }
}

/**
 * User-initiated deletion. Password re-entry required: this is a
 * destructive irreversible (from the user's POV) action, so we want
 * a fresh credential proof in the same way password change does.
 *
 * Returns ok on successful redaction. The calling server action is
 * responsible for signing the user out and clearing their cookie —
 * we don't touch the session here so the function stays portable
 * (the same primitive is used from the admin path which doesn't
 * sign anyone out).
 */
export async function deleteOwnAccount(
  userId: string,
  currentPassword: string,
): Promise<Result<{ userId: string }>> {
  if (!currentPassword || currentPassword.length === 0) {
    return fail("validation", "Enter your current password to confirm.", {
      issues: [
        { path: ["currentPassword"], message: "Password is required" },
      ],
    });
  }

  const [user] = await db
    .select({
      passwordHash: users.passwordHash,
      role: users.role,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return fail("not_found", "Account not found.");
  if (user.deletedAt) {
    // Already deleted — bail quietly with success so the UI flow
    // (sign out → redirect home) still works as expected.
    return ok({ userId });
  }
  if (!user.passwordHash) {
    return fail(
      "validation",
      "Password not set on this account. Contact support to delete.",
    );
  }

  // Admins can't delete themselves through this path — protects against
  // an admin accidentally locking the platform out by self-deleting the
  // sole admin. Admin deletion has to happen via another admin or via
  // engineering ops.
  if (user.role === "admin") {
    return fail(
      "forbidden",
      "Admin accounts can't be self-deleted. Ask another admin or engineering.",
    );
  }

  const okHash = await verify(user.passwordHash, currentPassword);
  if (!okHash) {
    return fail("validation", "Current password is incorrect.", {
      issues: [
        { path: ["currentPassword"], message: "Current password is incorrect." },
      ],
    });
  }

  return softDeleteUser(userId);
}

/**
 * Admin-initiated deletion. No password gate — the admin module's
 * server action enforces role === 'admin' upstream. Same primitive
 * underneath, so the audit trail (logged by the admin module) and the
 * SQL effects are identical.
 *
 * Refuses to delete other admin accounts. The same rule applies as
 * suspend/ban: admins can't change other admins from the UI. Removing
 * an admin's privileges is an engineering operation (manual SQL).
 */
export async function forceDeleteAccount(
  userId: string,
): Promise<Result<{ userId: string; previousRole: string | null }>> {
  const [user] = await db
    .select({ role: users.role, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return fail("not_found", "User not found.");
  if (user.role === "admin") {
    return fail(
      "forbidden",
      "Admin accounts can't be deleted from the admin surface.",
    );
  }
  if (user.deletedAt) {
    return fail("conflict", "Account is already deleted.");
  }

  const r = await softDeleteUser(userId);
  if (!r.ok) return r;
  return ok({ userId, previousRole: user.role });
}
