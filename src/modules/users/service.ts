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
import { hash, verify } from "@node-rs/argon2";
import { and, eq, gt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";

import { users } from "./schema";

/**
 * Same Argon2id params used everywhere passwords are hashed in the
 * codebase (sign-up, password-change, claim). OWASP 2024 minimum
 * for argon2id: 19 MiB memory, 2 iterations, 1 thread. Bumping any
 * of these requires a migration plan (existing hashes don't auto-
 * upgrade; verify-then-rehash on next login is the typical path).
 */
const PASSWORD_HASH_OPTS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

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

// ── claim flow (Bubble migration → first password set) ───────────────

/**
 * Public-safe summary of a claim token's owner. Returned by
 * `lookupClaimToken` so the /claim/[token] page can render the
 * user's email + name as a confirmation step before they choose a
 * password (so they know which account they're claiming).
 *
 * Never includes the password hash or any sensitive field.
 */
export type ClaimPreview = {
  userId: string;
  email: string;
  firstName: string | null;
  name: string | null;
  role: "project_owner" | "builder" | "admin" | "architect" | null;
  expiresAt: Date;
};

/**
 * Look up the user behind a claim token. Returns a public-safe
 * preview, or a tagged fail for the four ways this can go wrong:
 *
 *   - `not_found`  — token doesn't exist (typo, copy-paste fail)
 *   - `expired`    — token age > 90 days
 *   - `conflict`   — token exists but the user already has a
 *                    password set (they claimed once already and
 *                    something is asking them to claim again —
 *                    probably a stale email link)
 *   - `internal`   — DB error
 *
 * Used by:
 *   - The /claim/[token] page (server-render: validate before render)
 *   - claimAccount() itself (re-checks under transaction)
 */
export async function lookupClaimToken(
  token: string,
): Promise<Result<ClaimPreview>> {
  if (!token || token.length === 0) {
    return fail("not_found", "Invalid claim link.");
  }
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        name: users.name,
        role: users.role,
        passwordHash: users.passwordHash,
        claimTokenExpiresAt: users.claimTokenExpiresAt,
      })
      .from(users)
      .where(eq(users.claimToken, token))
      .limit(1);

    if (!user) return fail("not_found", "This claim link isn't valid.");
    if (user.passwordHash) {
      return fail(
        "conflict",
        "This account has already been claimed. Sign in normally — use 'forgot password' if you can't remember.",
      );
    }
    if (!user.claimTokenExpiresAt || user.claimTokenExpiresAt < new Date()) {
      return fail(
        "rate_limited",
        "This claim link has expired. Email info@builderhq.com.au and we'll send a fresh one.",
      );
    }

    return ok({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      name: user.name,
      role: user.role,
      expiresAt: user.claimTokenExpiresAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "users.claim_lookup_failed", msg },
      "claim token lookup failed",
    );
    return fail("internal", "Couldn't verify this link. Try again in a minute.");
  }
}

/**
 * Spend a claim token: set the user's first password + clear the
 * token + activate the account. Returns the user id on success
 * so the caller can call Auth.js signIn() to drop them straight
 * into the app.
 *
 * Transaction-wrapped because we're touching three columns in a
 * deliberate sequence (token check → hash → write). The token clear
 * is what makes this single-use: a second attempt finds the token
 * already null and bails.
 *
 * Validation:
 *   - password length ≥ 10 (matches sign-up rule)
 *   - token must still exist and be in date
 *   - account must not already have a password
 */
export async function claimAccount(
  token: string,
  newPassword: string,
): Promise<Result<{ userId: string; email: string }>> {
  if (!token) return fail("not_found", "Invalid claim link.");
  if (!newPassword || newPassword.length < 10) {
    return fail("validation", "Password must be at least 10 characters.", {
      issues: [
        {
          path: ["password"],
          message: "Password must be at least 10 characters.",
        },
      ],
    });
  }
  if (newPassword.length > 200) {
    return fail("validation", "Password is too long.", {
      issues: [{ path: ["password"], message: "Password is too long." }],
    });
  }

  // Hash outside the transaction — argon2 is CPU-bound and we don't
  // want to hold a DB row lock for ~120ms while we hash.
  const passwordHash = await hash(newPassword, PASSWORD_HASH_OPTS);

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .select({
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
          claimTokenExpiresAt: users.claimTokenExpiresAt,
        })
        .from(users)
        .where(
          and(
            eq(users.claimToken, token),
            // Implicit: token still exists. Belt-and-braces: also
            // check the expiry inside the txn so a 91-day-old token
            // can't sneak through a race with the cleanup job.
            gt(users.claimTokenExpiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!user) {
        return { kind: "not_found" as const };
      }
      if (user.passwordHash) {
        return { kind: "already_claimed" as const };
      }

      await tx
        .update(users)
        .set({
          passwordHash,
          claimToken: null,
          claimTokenExpiresAt: null,
          status: "active",
          emailVerified: sql`COALESCE(${users.emailVerified}, now())`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return { kind: "ok" as const, userId: user.id, email: user.email };
    });

    if (result.kind === "not_found") {
      return fail(
        "not_found",
        "This claim link isn't valid or has expired. Email info@builderhq.com.au.",
      );
    }
    if (result.kind === "already_claimed") {
      return fail(
        "conflict",
        "This account has already been claimed. Sign in normally instead.",
      );
    }

    logger.info(
      { event: "users.claimed", userId: result.userId },
      "user claimed migrated account",
    );
    return ok({ userId: result.userId, email: result.email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "users.claim_failed", msg },
      "claim transaction threw",
    );
    return fail(
      "internal",
      "Something went wrong on our side. Try again, or contact support.",
    );
  }
}
