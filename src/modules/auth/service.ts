/**
 * auth · service.
 *
 * Public functions:
 *   signUp(input)        Create user, hash password, send verification email.
 *   verifyEmail(token)   Mark email_verified, activate user, single-use token.
 *
 * Each returns Result<T, AppError> instead of throwing — callsites surface
 * `error.message` to the user without leaking internals.
 *
 * Sign-IN is not in this file — Auth.js's Credentials provider handles it
 * (see ./auth.ts). Server actions call signIn() from "@/modules/auth".
 */

import { randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { and, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/modules/email";
import { users, userRoleEnum } from "@/modules/users";

import { verificationTokens } from "./schema";

// ── Zod input schemas ────────────────────────────────────────────────────

export const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50).trim(),
  lastName: z.string().min(1, "Last name is required").max(50).trim(),
  email: z
    .email("Enter a valid email")
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(200),
  role: z.enum(userRoleEnum.enumValues).refine((r) => r !== "admin", {
    message: "Invalid role",
  }),
  signupSource: z.string().max(120).optional(),
  signupCampaign: z.string().max(120).optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

const VERIFY_TOKEN_TTL_HOURS = 24;
const RESET_TOKEN_TTL_MINUTES = 60;
const VERIFY_RESEND_THROTTLE_SECONDS = 60;
/**
 * Identifier prefix used to namespace password-reset rows inside the shared
 * verification_tokens table — keeps a single table while preventing a
 * password-reset token from being accepted as an email-verify token (or
 * vice versa). The identifier we store is `pwreset:<email>`.
 */
const PWRESET_PREFIX = "pwreset:";

const PASSWORD_HASH_OPTS = {
  // OWASP 2024 minimum for argon2id: 19 MiB memory, 2 iterations, 1 thread.
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

// ── service functions ────────────────────────────────────────────────────

export async function signUp(
  raw: unknown,
): Promise<Result<{ userId: string; email: string }>> {
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", "Some fields need fixing.", {
      issues: parsed.error.issues,
    });
  }

  const { firstName, lastName, email, password, role, signupSource, signupCampaign } =
    parsed.data;

  // Pre-check before hashing (which is expensive). Race-with-INSERT is
  // re-handled below via the unique index.
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return fail("conflict", "An account with this email already exists. Try logging in.");
  }

  const passwordHash = await hash(password, PASSWORD_HASH_OPTS);

  let userId: string;
  try {
    const [row] = await db
      .insert(users)
      .values({
        email,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        passwordHash,
        role,
        status: "pending_verification",
        signupSource: signupSource ?? null,
        signupCampaign: signupCampaign ?? null,
      })
      .returning({ id: users.id });
    if (!row) return fail("internal", "Could not create your account.");
    userId = row.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("users_email_unique")) {
      return fail("conflict", "An account with this email already exists. Try logging in.");
    }
    logger.error({ event: "auth.signup.insert_failed", message }, "user insert failed");
    return fail("internal", "Could not create your account. Try again.");
  }

  // Mint a verification token. Crypto-strength random; 24h expiry.
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await db.insert(verificationTokens).values({
    identifier: email,
    token,
    purpose: "verification",
    expires,
  });

  const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email/${token}`;
  const emailRes = await sendVerificationEmail({ to: email, verifyUrl, firstName });
  if (!emailRes.ok) {
    // Don't fail signup — the user account exists. They can request a resend.
    logger.warn(
      { event: "auth.signup.email_failed", userId, error: emailRes.error.message },
      "verification email failed at signup; user can resend",
    );
  }

  logger.info({ event: "auth.signup", userId, role }, "user signed up");
  return ok({ userId, email });
}

export async function verifyEmail(
  token: string,
): Promise<Result<{ userId: string; email: string }>> {
  if (!token || typeof token !== "string" || token.length < 32) {
    return fail("validation", "Invalid verification link.");
  }

  const [vt] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, token),
        // Scope to email-verification rows only — magic-link tokens live
        // in the same table but redeem via /auth/magic, not here.
        eq(verificationTokens.purpose, "verification"),
      ),
    )
    .limit(1);

  if (!vt) {
    return fail("not_found", "This verification link is invalid or has already been used.");
  }
  if (vt.expires < new Date()) {
    await db.delete(verificationTokens).where(eq(verificationTokens.token, token));
    return fail("validation", "This verification link has expired. Sign up again or request a new one.");
  }

  const [user] = await db
    .select({ id: users.id, email: users.email, status: users.status })
    .from(users)
    .where(eq(users.email, vt.identifier))
    .limit(1);

  if (!user) {
    return fail("not_found", "We couldn't find your account.");
  }

  // Idempotent: already verified is a success.
  if (user.status === "active") {
    await db.delete(verificationTokens).where(eq(verificationTokens.token, token));
    return ok({ userId: user.id, email: user.email });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        emailVerified: new Date(),
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    await tx
      .delete(verificationTokens)
      .where(eq(verificationTokens.token, token));
  });

  logger.info({ event: "auth.email_verified", userId: user.id }, "email verified");
  return ok({ userId: user.id, email: user.email });
}

// ── verification email resend ────────────────────────────────────────────

const emailOnlySchema = z.object({
  email: z.email("Enter a valid email").transform((v) => v.toLowerCase().trim()),
});

/**
 * Resend the verification email for a pending account. Throttled to one
 * email every VERIFY_RESEND_THROTTLE_SECONDS to prevent abuse.
 *
 * Always responds with success (even when no such user exists) so this
 * endpoint can't be used to enumerate registered emails.
 */
export async function resendVerificationEmail(
  raw: unknown,
): Promise<Result<{ throttled: boolean }>> {
  const parsed = emailOnlySchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", "Enter a valid email.");
  }
  const { email } = parsed.data;

  const [user] = await db
    .select({ id: users.id, email: users.email, status: users.status, firstName: users.firstName })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Don't leak whether the user exists.
  if (!user || user.status !== "pending_verification") {
    return ok({ throttled: false });
  }

  // Throttle: most-recent token's expires gives us a proxy for "when was the
  // last email sent" (sent_at = expires - 24h).
  const [latest] = await db
    .select({ expires: verificationTokens.expires })
    .from(verificationTokens)
    .where(eq(verificationTokens.identifier, email))
    .orderBy(desc(verificationTokens.expires))
    .limit(1);

  if (latest) {
    const lastSent = new Date(
      latest.expires.getTime() - VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000,
    );
    const sinceMs = Date.now() - lastSent.getTime();
    if (sinceMs < VERIFY_RESEND_THROTTLE_SECONDS * 1000) {
      return ok({ throttled: true });
    }
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    // Invalidate prior verification tokens for this identifier. Scoped
    // by purpose so a pending magic-link sign-in (different identifier
    // shape but same email) survives a verification resend.
    await tx
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.purpose, "verification"),
        ),
      );
    await tx
      .insert(verificationTokens)
      .values({ identifier: email, token, purpose: "verification", expires });
  });

  const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email/${token}`;
  await sendVerificationEmail({ to: email, verifyUrl, firstName: user.firstName });

  logger.info({ event: "auth.verify.resent", userId: user.id }, "verification email resent");
  return ok({ throttled: false });
}

// ── password reset request ───────────────────────────────────────────────

/**
 * Always returns success — never reveal whether an email is registered.
 * If the user exists with a usable password (not OAuth-only), a reset
 * email is sent; otherwise the call silently no-ops.
 */
export async function requestPasswordReset(raw: unknown): Promise<Result<{ ok: true }>> {
  const parsed = emailOnlySchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", "Enter a valid email.");
  }
  const { email } = parsed.data;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      passwordHash: users.passwordHash,
      status: users.status,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    logger.info({ event: "auth.pwreset.no_user" }, "password reset requested for unknown email");
    return ok({ ok: true });
  }

  // Banned/suspended/OAuth-only accounts skip the email but return success.
  if (
    !user.passwordHash ||
    user.status === "banned" ||
    user.status === "suspended"
  ) {
    logger.info({ event: "auth.pwreset.skipped", userId: user.id }, "password reset skipped");
    return ok({ ok: true });
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  const identifier = `${PWRESET_PREFIX}${email}`;

  await db.transaction(async (tx) => {
    await tx
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, identifier));
    await tx
      .insert(verificationTokens)
      .values({ identifier, token, purpose: "password_reset", expires });
  });

  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`;
  await sendPasswordResetEmail({ to: email, resetUrl, firstName: user.firstName });

  logger.info({ event: "auth.pwreset.requested", userId: user.id }, "password reset requested");
  return ok({ ok: true });
}

// ── password reset apply ────────────────────────────────────────────────

const resetPasswordSchema = z.object({
  token: z.string().min(32, "Invalid reset link."),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(200),
});

export async function resetPassword(raw: unknown): Promise<Result<{ userId: string }>> {
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", "Some fields need fixing.", {
      issues: parsed.error.issues,
    });
  }
  const { token, password } = parsed.data;

  const [vt] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, token),
        eq(verificationTokens.purpose, "password_reset"),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .limit(1);

  if (!vt || !vt.identifier.startsWith(PWRESET_PREFIX)) {
    return fail("not_found", "This reset link is invalid or has expired.");
  }

  const email = vt.identifier.slice(PWRESET_PREFIX.length);
  const [user] = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) {
    return fail("not_found", "We couldn't find your account.");
  }
  if (user.status === "banned" || user.status === "suspended") {
    return fail("forbidden", "This account can't be reset right now. Contact support.");
  }

  const passwordHash = await hash(password, PASSWORD_HASH_OPTS);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    await tx
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, vt.identifier));
  });

  // SECURITY TODO (Phase 4): JWT sessions issued before now remain valid up
  // to their TTL. Add `password_changed_at` to users and check it in the
  // jwt callback to invalidate. For now, the user's current device session
  // is force-signed-out by the calling action; other devices ride 7d.
  logger.info({ event: "auth.pwreset.applied", userId: user.id }, "password reset applied");
  return ok({ userId: user.id });
}

// ── change password (logged-in path) ─────────────────────────────────────

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z
    .string()
    .min(10, "New password must be at least 10 characters")
    .max(200),
});

export async function changePassword(
  userId: string,
  raw: unknown,
): Promise<Result<{ ok: true }>> {
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", "Some fields need fixing.", {
      issues: parsed.error.issues,
    });
  }
  const { currentPassword, newPassword } = parsed.data;

  if (currentPassword === newPassword) {
    return fail("validation", "New password must differ from current.");
  }

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || !user.passwordHash) {
    return fail("not_found", "We couldn't verify your account.");
  }

  const okHash = await verify(user.passwordHash, currentPassword);
  if (!okHash) {
    return fail("validation", "Current password is incorrect.", {
      issues: [{ path: ["currentPassword"], message: "Current password is incorrect." }],
    });
  }

  const passwordHash = await hash(newPassword, PASSWORD_HASH_OPTS);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  logger.info({ event: "auth.password_changed", userId }, "password changed");
  return ok({ ok: true });
}

// ── set initial password (for users with passwordHash IS NULL) ──────────

const setInitialPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(200),
});

/**
 * Adds a password to an account that doesn't have one yet — the
 * ads-funnel signup path leaves `users.passwordHash` NULL because
 * authentication was via magic link only. This action lets a
 * signed-in user voluntarily set one for faster sign-in on future
 * devices.
 *
 * Authorisation: caller must already be authenticated (we trust
 * `userId` from the session). No "current password" is required —
 * there isn't one. If the account ALREADY has a password set, this
 * refuses with `conflict` to avoid bypassing the regular change-
 * password flow's current-password check.
 */
export async function setInitialPassword(
  userId: string,
  raw: unknown,
): Promise<Result<{ ok: true }>> {
  const parsed = setInitialPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", "Some fields need fixing.", {
      issues: parsed.error.issues,
    });
  }
  const { newPassword } = parsed.data;

  const [user] = await db
    .select({ passwordHash: users.passwordHash, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) {
    return fail("not_found", "We couldn't verify your account.");
  }
  if (user.passwordHash) {
    // A password already exists — refuse. Caller should use
    // changePassword (which requires the current one).
    return fail(
      "conflict",
      "This account already has a password. Use 'Change password' instead.",
    );
  }
  if (user.status === "banned" || user.status === "suspended") {
    return fail("forbidden", "This account can't update its credentials.");
  }

  const passwordHash = await hash(newPassword, PASSWORD_HASH_OPTS);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  logger.info(
    { event: "auth.password.initial_set", userId },
    "initial password set",
  );
  return ok({ ok: true });
}

// ── update profile (name) ────────────────────────────────────────────────

const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50).trim(),
  lastName: z.string().min(1, "Last name is required").max(50).trim(),
  /** AU mobile / landline. Loose validator on purpose — we only want
   *  to reject obvious junk (no digits at all, way-too-long input)
   *  rather than fight format wars across landlines / mobiles /
   *  international numbers. Empty string clears the field. */
  phone: z
    .union([z.string().max(40), z.literal("")])
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .refine(
      (v) => v === null || /\d{4,}/.test(v),
      "Phone needs at least 4 digits",
    ),
});

export async function updateProfile(
  userId: string,
  raw: unknown,
): Promise<Result<{ ok: true }>> {
  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("validation", "Some fields need fixing.", {
      issues: parsed.error.issues,
    });
  }
  const { firstName, lastName, phone } = parsed.data;

  await db
    .update(users)
    .set({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      phone: phone ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  logger.info({ event: "auth.profile_updated", userId }, "profile updated");
  return ok({ ok: true });
}
