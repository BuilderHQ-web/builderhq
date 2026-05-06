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
import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { fail, ok, type Result } from "@/lib/result";
import { sendVerificationEmail } from "@/modules/email";
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
    .where(eq(verificationTokens.token, token))
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
